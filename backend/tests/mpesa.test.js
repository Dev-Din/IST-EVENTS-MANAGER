const request = require("supertest");
const app = require("../server");
const Transaction = require("../models/Transaction");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");
const mpesaService = require("../utils/mpesaService");

describe("M-Pesa Integration Tests", () => {
  let authToken;
  let testUser;
  let testEvent;
  let testTicket;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
      phoneNumber: "254712345678",
    });

    // Create test event
    testEvent = await Event.create({
      title: "Test Event",
      description: "Test event for M-Pesa testing",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      location: "Test Location",
      price: 100,
      capacity: 100,
      availableTickets: 100,
      category: "conference",
      status: "published",
      createdBy: testUser._id,
    });

    // Login to get auth token
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: "test@example.com" });
    await Event.deleteMany({ title: "Test Event" });
    await Ticket.deleteMany({ user: testUser._id });
    await Transaction.deleteMany({ user: testUser._id });
  });

  describe("M-Pesa Service Tests", () => {
    test("should validate phone number format", () => {
      expect(mpesaService.validatePhoneNumber("254712345678")).toBe(true);
      expect(mpesaService.validatePhoneNumber("254708374149")).toBe(true);
      expect(mpesaService.validatePhoneNumber("0712345678")).toBe(false);
      expect(mpesaService.validatePhoneNumber("123456789")).toBe(false);
    });

    test("should format phone number correctly", () => {
      expect(mpesaService.formatPhoneNumber("254712345678")).toBe(
        "254712345678"
      );
      expect(mpesaService.formatPhoneNumber("0712345678")).toBe("254712345678");
      expect(() => mpesaService.formatPhoneNumber("123456789")).toThrow();
    });

    test("should validate transaction amount", () => {
      expect(() => mpesaService.validateAmount(1)).not.toThrow();
      expect(() => mpesaService.validateAmount(100)).not.toThrow();
      expect(() => mpesaService.validateAmount(0)).toThrow();
      expect(() => mpesaService.validateAmount(-1)).toThrow();
      expect(() => mpesaService.validateAmount(70001)).toThrow();
    });

    test("should generate unique account reference", () => {
      const ref1 = mpesaService.generateAccountReference();
      const ref2 = mpesaService.generateAccountReference();

      expect(ref1).toMatch(/^TKT-\d+-[A-Z0-9]+$/);
      expect(ref2).toMatch(/^TKT-\d+-[A-Z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });

    test("should test M-Pesa connection", async () => {
      const result = await mpesaService.testConnection();

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");

      if (result.success) {
        expect(result.message).toContain("successful");
      } else {
        expect(result.error).toBeDefined();
      }
    }, 10000);
  });

  describe("M-Pesa Payment Initiation", () => {
    test("should initiate M-Pesa payment successfully", async () => {
      const response = await request(app)
        .post("/api/payments/mpesa/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          eventId: testEvent._id,
          phoneNumber: "254708374149",
          quantity: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("checkoutRequestID");
      expect(response.body.data).toHaveProperty("customerMessage");
      expect(response.body.data.amount).toBe(1);
      expect(response.body.data.currency).toBe("KES");

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        checkoutRequestID: response.body.data.checkoutRequestID,
      });
      expect(transaction).toBeTruthy();
      expect(transaction.status).toBe("pending");
      expect(transaction.amount).toBe(1);

      // Verify ticket was created
      const ticket = await Ticket.findById(response.body.data.ticketId);
      expect(ticket).toBeTruthy();
      expect(ticket.status).toBe("pending");
      expect(ticket.paymentMethod).toBe("mobile_money");
    }, 15000);

    test("should reject invalid phone number", async () => {
      const response = await request(app)
        .post("/api/payments/mpesa/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          eventId: testEvent._id,
          phoneNumber: "0712345678", // Invalid format
          quantity: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("valid M-Pesa number");
    });

    test("should reject invalid quantity", async () => {
      const response = await request(app)
        .post("/api/payments/mpesa/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          eventId: testEvent._id,
          phoneNumber: "254708374149",
          quantity: 0, // Invalid quantity
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should reject non-existent event", async () => {
      const response = await request(app)
        .post("/api/payments/mpesa/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          eventId: "507f1f77bcf86cd799439011", // Non-existent ObjectId
          phoneNumber: "254708374149",
          quantity: 1,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Event not found");
    });
  });

  describe("M-Pesa Callback Handling", () => {
    let testTransaction;

    beforeEach(async () => {
      // Create a test transaction
      testTransaction = await Transaction.create({
        checkoutRequestID: "ws_CO_123456789",
        merchantRequestID: "ws_MR_123456789",
        amount: 1,
        currency: "KES",
        phoneNumber: "254708374149",
        status: "pending",
        user: testUser._id,
        event: testEvent._id,
        accountReference: "TEST-REF",
        transactionDesc: "Test Transaction",
      });
    });

    test("should handle successful payment callback", async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: "ws_MR_123456789",
            CheckoutRequestID: "ws_CO_123456789",
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 1 },
                { Name: "MpesaReceiptNumber", Value: "QBF1234567" },
                { Name: "TransactionDate", Value: 20231201120000 },
                { Name: "PhoneNumber", Value: 254708374149 },
              ],
            },
          },
        },
      };

      const response = await request(app)
        .post("/api/payments/mpesa/callback")
        .send(callbackData);

      expect(response.status).toBe(200);
      expect(response.body.ResultCode).toBe(0);
      expect(response.body.ResultDesc).toBe("Success");

      // Verify transaction was updated
      const updatedTransaction = await Transaction.findById(
        testTransaction._id
      );
      expect(updatedTransaction.status).toBe("success");
      expect(updatedTransaction.resultCode).toBe(0);
      expect(updatedTransaction.mpesaReceiptNumber).toBe("QBF1234567");
    });

    test("should handle failed payment callback", async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: "ws_MR_123456789",
            CheckoutRequestID: "ws_CO_123456789",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      };

      const response = await request(app)
        .post("/api/payments/mpesa/callback")
        .send(callbackData);

      expect(response.status).toBe(200);
      expect(response.body.ResultCode).toBe(0);

      // Verify transaction was updated
      const updatedTransaction = await Transaction.findById(
        testTransaction._id
      );
      expect(updatedTransaction.status).toBe("failed");
      expect(updatedTransaction.resultCode).toBe(1032);
    });

    test("should handle callback for non-existent transaction", async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: "ws_MR_NONEXISTENT",
            CheckoutRequestID: "ws_CO_NONEXISTENT",
            ResultCode: 0,
            ResultDesc: "Success",
          },
        },
      };

      const response = await request(app)
        .post("/api/payments/mpesa/callback")
        .send(callbackData);

      expect(response.status).toBe(200);
      expect(response.body.ResultCode).toBe(0);
    });
  });

  describe("Payment Status Query", () => {
    test("should query payment status successfully", async () => {
      // First initiate a payment
      const initiateResponse = await request(app)
        .post("/api/payments/mpesa/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          eventId: testEvent._id,
          phoneNumber: "254708374149",
          quantity: 1,
        });

      const checkoutRequestID = initiateResponse.body.data.checkoutRequestID;

      // Query the status
      const response = await request(app)
        .get(`/api/payments/mpesa/status/${checkoutRequestID}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("checkoutRequestID");
      expect(response.body.data).toHaveProperty("resultCode");
      expect(response.body.data).toHaveProperty("resultDesc");
    }, 15000);

    test("should handle invalid checkout request ID", async () => {
      const response = await request(app)
        .get("/api/payments/mpesa/status/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Transaction Management", () => {
    test("should get user transaction history", async () => {
      const response = await request(app)
        .get("/api/payments/transactions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("transactions");
      expect(response.body.data).toHaveProperty("pagination");
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    test("should get transaction details", async () => {
      // Create a test transaction
      const transaction = await Transaction.create({
        checkoutRequestID: "ws_CO_TEST123",
        merchantRequestID: "ws_MR_TEST123",
        amount: 1,
        currency: "KES",
        phoneNumber: "254708374149",
        status: "success",
        user: testUser._id,
        event: testEvent._id,
        accountReference: "TEST-REF",
        transactionDesc: "Test Transaction",
        resultCode: 0,
        resultDesc: "Success",
        completedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/payments/transaction/${transaction._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transaction._id.toString());
      expect(response.body.data.status).toBe("success");
    });

    test("should filter transactions by status", async () => {
      const response = await request(app)
        .get("/api/payments/transactions?status=pending")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned transactions should have pending status
      response.body.data.transactions.forEach((transaction) => {
        expect(transaction.status).toBe("pending");
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle M-Pesa service errors gracefully", async () => {
      // Mock a failed M-Pesa service call
      const originalInitiateSTKPush = mpesaService.initiateSTKPush;
      mpesaService.initiateSTKPush = jest.fn().mockResolvedValue({
        success: false,
        error: "Service temporarily unavailable",
      });

      const response = await request(app)
        .post("/api/payments/mpesa/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          eventId: testEvent._id,
          phoneNumber: "254708374149",
          quantity: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        "M-Pesa payment initiation failed"
      );

      // Restore original function
      mpesaService.initiateSTKPush = originalInitiateSTKPush;
    });

    test("should require authentication for protected routes", async () => {
      const response = await request(app)
        .post("/api/payments/mpesa/initiate")
        .send({
          eventId: testEvent._id,
          phoneNumber: "254708374149",
          quantity: 1,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
