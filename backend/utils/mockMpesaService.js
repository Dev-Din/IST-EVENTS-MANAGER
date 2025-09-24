const crypto = require("crypto");

class MockMpesaService {
  constructor() {
    this.baseURL = "https://mock.safaricom.co.ke";
    this.consumerKey = "mock_consumer_key";
    this.consumerSecret = "mock_consumer_secret";
    this.passkey = "mock_passkey";
    this.shortcode = "174379";
    this.callbackURL =
      process.env.MPESA_CALLBACK_URL ||
      "http://localhost:5000/api/payments/mpesa/callback";
    this.accessToken = "mock_access_token_12345";
    this.tokenExpiry = Date.now() + 3600000; // 1 hour from now

    console.log("🔧 Mock M-Pesa Service initialized for testing");
  }

  validateConfig() {
    // Mock service doesn't need real validation
    return true;
  }

  // Mock access token generation
  async getAccessToken() {
    console.log("🔑 Mock: Generating access token");
    return this.accessToken;
  }

  // Mock password generation
  generatePassword() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`
    ).toString("base64");
    return { password, timestamp };
  }

  // Mock STK Push initiation
  async initiateSTKPush(
    phoneNumber,
    amount,
    accountReference,
    transactionDesc
  ) {
    try {
      console.log("📱 Mock: Initiating STK Push");
      console.log("📱 Mock: Phone:", phoneNumber);
      console.log("📱 Mock: Amount:", amount);
      console.log("📱 Mock: Account Reference:", accountReference);

      // Validate phone number format
      if (!this.validatePhoneNumber(phoneNumber)) {
        throw new Error("Invalid phone number format");
      }

      // Validate amount
      this.validateAmount(amount);

      // Generate mock IDs
      const checkoutRequestID = `ws_CO_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const merchantRequestID = `mock_merchant_${Date.now()}`;

      console.log("📱 Mock: Generated CheckoutRequestID:", checkoutRequestID);
      console.log("📱 Mock: Generated MerchantRequestID:", merchantRequestID);

      // Simulate successful STK Push
      return {
        success: true,
        checkoutRequestID: checkoutRequestID,
        merchantRequestID: merchantRequestID,
        responseCode: 0,
        responseDescription: "Success. Request accepted for processing",
        customerMessage: `STK Push sent to ${phoneNumber}. Please check your phone and enter your M-Pesa PIN to complete the payment of KES ${amount}.`,
      };
    } catch (error) {
      console.error("❌ Mock: Error initiating STK Push:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Mock STK Push status query
  async querySTKPushStatus(checkoutRequestID) {
    try {
      console.log("🔍 Mock: Querying STK Push status for:", checkoutRequestID);

      // Simulate different statuses based on checkoutRequestID
      const statuses = ["pending", "success", "failed"];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];

      if (randomStatus === "success") {
        return {
          success: true,
          responseCode: 0,
          responseDescription: "The service request is processed successfully.",
          merchantRequestID: `mock_merchant_${Date.now()}`,
          checkoutRequestID: checkoutRequestID,
          resultCode: 0,
          resultDesc: "The service request is processed successfully.",
        };
      } else if (randomStatus === "failed") {
        return {
          success: true,
          responseCode: 0,
          responseDescription: "The service request is processed successfully.",
          merchantRequestID: `mock_merchant_${Date.now()}`,
          checkoutRequestID: checkoutRequestID,
          resultCode: 1032,
          resultDesc: "Request cancelled by user",
        };
      } else {
        return {
          success: true,
          responseCode: 0,
          responseDescription: "The service request is processed successfully.",
          merchantRequestID: `mock_merchant_${Date.now()}`,
          checkoutRequestID: checkoutRequestID,
          resultCode: 1037,
          resultDesc: "Timeout in completing transaction",
        };
      }
    } catch (error) {
      console.error("❌ Mock: Error querying STK Push status:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Mock callback processing
  async processCallback(callbackData) {
    try {
      console.log("📞 Mock: Processing callback");
      console.log(
        "📞 Mock: Callback data:",
        JSON.stringify(callbackData, null, 2)
      );

      // Use the actual callback data instead of generating new mock data
      const { Body } = callbackData;
      const { stkCallback } = Body;

      if (stkCallback.ResultCode === 0) {
        // Payment successful
        const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
        const metadata = {};

        callbackMetadata.forEach((item) => {
          metadata[item.Name] = item.Value;
        });

        return {
          success: true,
          merchantRequestID: stkCallback.MerchantRequestID,
          checkoutRequestID: stkCallback.CheckoutRequestID,
          resultCode: stkCallback.ResultCode,
          resultDesc: stkCallback.ResultDesc,
          amount: metadata.Amount,
          mpesaReceiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: metadata.TransactionDate,
          phoneNumber: metadata.PhoneNumber,
          accountReference: metadata.AccountReference,
        };
      } else {
        // Payment failed
        return {
          success: false,
          merchantRequestID: stkCallback.MerchantRequestID,
          checkoutRequestID: stkCallback.CheckoutRequestID,
          resultCode: stkCallback.ResultCode,
          resultDesc: stkCallback.ResultDesc,
          accountReference: stkCallback.CheckoutRequestID,
        };
      }
    } catch (error) {
      console.error("❌ Mock: Error processing callback:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");
    const mpesaPattern = /^2547\d{8}$/;
    return mpesaPattern.test(cleaned);
  }

  // Format phone number for M-Pesa
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");
    const mpesaPattern = /^2547\d{8}$/;

    if (mpesaPattern.test(cleaned)) {
      return cleaned;
    }

    throw new Error(
      "Invalid M-Pesa phone number format. Must be 2547XXXXXXXX (e.g., 254712345678)"
    );
  }

  // Mock connection test
  async testConnection() {
    console.log("🔗 Mock: Testing connection");
    return {
      success: true,
      message: "Mock M-Pesa connection successful",
      token: "Mock Valid Token",
    };
  }

  // Mock transaction status with retry logic
  async getTransactionStatus(checkoutRequestID, maxRetries = 3) {
    console.log("🔄 Mock: Getting transaction status with retries");
    return await this.querySTKPushStatus(checkoutRequestID);
  }

  // Validate transaction amount
  validateAmount(amount) {
    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    if (amount < 1) {
      throw new Error("Minimum transaction amount is 1 KES");
    }

    if (amount > 70000) {
      throw new Error("Maximum transaction amount is 70,000 KES");
    }

    return true;
  }

  // Generate unique account reference
  generateAccountReference(prefix = "TKT") {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Log transaction for debugging
  logTransaction(action, data) {
    console.log(`[Mock M-Pesa ${action}]`, JSON.stringify(data, null, 2));
  }

  // Simulate callback after a delay
  async simulateCallback(
    checkoutRequestID,
    success = true,
    accountReference = null
  ) {
    console.log("⏰ Mock: Simulating callback after 5 seconds...");

    setTimeout(async () => {
      try {
        const mockCallbackData = {
          Body: {
            stkCallback: {
              MerchantRequestID: `mock_merchant_${Date.now()}`,
              CheckoutRequestID: checkoutRequestID,
              ResultCode: success ? 0 : 1032,
              ResultDesc: success
                ? "The service request is processed successfully."
                : "Request cancelled by user",
              CallbackMetadata: success
                ? {
                    Item: [
                      { Name: "Amount", Value: 1 },
                      {
                        Name: "MpesaReceiptNumber",
                        Value: `MOCK${Date.now()}`,
                      },
                      { Name: "TransactionDate", Value: Date.now() },
                      { Name: "PhoneNumber", Value: phoneNumber },
                      {
                        Name: "AccountReference",
                        Value:
                          accountReference ||
                          `TKT-${Date.now()}-${Math.random()
                            .toString(36)
                            .substr(2, 9)
                            .toUpperCase()}`,
                      },
                    ],
                  }
                : undefined,
            },
          },
        };

        // Send callback to the actual callback endpoint
        const axios = require("axios");
        await axios.post(
          "http://localhost:5000/api/payments/mpesa/callback",
          mockCallbackData
        );

        console.log("✅ Mock: Callback sent successfully");
      } catch (error) {
        console.error("❌ Mock: Error sending callback:", error.message);
      }
    }, 5000); // 5 second delay
  }
}

module.exports = new MockMpesaService();
