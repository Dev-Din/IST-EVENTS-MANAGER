const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const mpesaService = require("../utils/mpesaService");
const Ticket = require("../models/Ticket");
const Transaction = require("../models/Transaction");
const Event = require("../models/Event");
const User = require("../models/User");

// Use real M-Pesa service with provided credentials
const currentMpesaService = mpesaService;

// Mock callback simulation for sandbox testing
const simulateSuccessfulCallback = async (checkoutRequestID, transactionId) => {
  console.log(`🔄 Simulating successful callback for ${checkoutRequestID}`);

  // Wait 5 seconds to simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const mockCallbackData = {
    Body: {
      stkCallback: {
        MerchantRequestID: `mock-${Date.now()}`,
        CheckoutRequestID: checkoutRequestID,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 1 },
            { Name: "MpesaReceiptNumber", Value: `MOCK${Date.now()}` },
            { Name: "TransactionDate", Value: new Date().toISOString() },
            { Name: "PhoneNumber", Value: phoneNumber },
            { Name: "AccountReference", Value: `TKT-${Date.now()}` },
          ],
        },
      },
    },
  };

  // Process the mock callback
  try {
    const transaction = await Transaction.findById(transactionId);
    if (transaction) {
      await transaction.markSuccessful({
        resultCode: 0,
        resultDesc: "The service request is processed successfully.",
        mpesaReceiptNumber: `MOCK${Date.now()}`,
        amount: 1,
        phoneNumber: phoneNumber,
      });

      // Update ticket status
      const ticket = await Ticket.findById(transaction.ticket);
      if (ticket) {
        ticket.status = "confirmed";
        await ticket.save();
      }

      console.log(
        `✅ Mock callback processed successfully for transaction ${transactionId}`
      );
    }
  } catch (error) {
    console.error("❌ Error processing mock callback:", error);
  }
};

// @desc    Initiate M-Pesa payment for ticket purchase
// @route   POST /api/payments/mpesa/initiate
// @access  Private
const initiateMpesaPayment = asyncHandler(async (req, res, next) => {
  const { eventId, quantity, phoneNumber } = req.body;
  const userId = req.user?.id || "507f1f77bcf86cd799439011"; // Use test user ID if no auth

  // Validate required fields
  if (!eventId || !quantity || !phoneNumber) {
    return next(
      new ErrorResponse(
        "Event ID, quantity, and phone number are required",
        400
      )
    );
  }

  // Validate phone number
  if (!currentMpesaService.validatePhoneNumber(phoneNumber)) {
    return next(
      new ErrorResponse(
        "Please provide a valid M-Pesa number in format: 2547XXXXXXXX (e.g., 254712345678)",
        400
      )
    );
  }

  try {
    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new ErrorResponse("Event not found", 404));
    }

    // Check if event is active and has available tickets
    if (!event.isActive) {
      return next(new ErrorResponse("Event is not active", 400));
    }

    if (event.availableTickets < quantity) {
      return next(new ErrorResponse("Not enough tickets available", 400));
    }

    // Calculate total price (always KES 1 for testing)
    const testAmount = 1;
    const totalPrice = testAmount;

    // Validate amount
    mpesaService.validateAmount(testAmount);

    // Create pending ticket
    const ticket = await Ticket.create({
      event: eventId,
      user: userId,
      quantity: quantity,
      totalPrice: totalPrice,
      status: "pending",
      paymentMethod: "mobile_money",
      paymentStatus: "pending",
      purchaseDate: new Date(),
    });

    // Generate account reference
    const accountReference = mpesaService.generateAccountReference();
    const transactionDesc = `Ticket for ${event.title}`;

    // Create transaction record (without M-Pesa IDs initially)
    const transaction = await Transaction.create({
      amount: testAmount,
      currency: "KES",
      phoneNumber: phoneNumber,
      status: "pending",
      ticket: ticket._id,
      user: userId,
      event: eventId,
      accountReference: accountReference,
      transactionDesc: transactionDesc,
    });

    // Initiate STK Push
    const stkResult = await mpesaService.initiateSTKPush(
      phoneNumber,
      testAmount,
      accountReference,
      transactionDesc
    );

    if (!stkResult.success) {
      // Delete the pending ticket and transaction if STK Push fails
      await Ticket.findByIdAndDelete(ticket._id);
      await Transaction.findByIdAndDelete(transaction._id);
      return next(
        new ErrorResponse(
          `M-Pesa payment initiation failed: ${stkResult.error}`,
          400
        )
      );
    }

    // Update ticket and transaction with M-Pesa details
    ticket.paymentReference = stkResult.checkoutRequestID;
    await ticket.save();

    transaction.checkoutRequestID = stkResult.checkoutRequestID;
    transaction.merchantRequestID = stkResult.merchantRequestID;
    await transaction.save();

    // Log transaction
    mpesaService.logTransaction("INITIATE", {
      checkoutRequestID: stkResult.checkoutRequestID,
      amount: testAmount,
      phoneNumber: phoneNumber,
      ticketId: ticket._id,
    });

    // Mock callback disabled for real STK Push testing
    console.log("📱 STK Push sent - waiting for real callback from M-Pesa");

    res.json({
      success: true,
      message: "M-Pesa payment initiated successfully",
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        transactionId: transaction._id,
        amount: testAmount,
        currency: "KES",
        checkoutRequestID: stkResult.checkoutRequestID,
        customerMessage: stkResult.customerMessage,
        phoneNumber: phoneNumber,
        accountReference: accountReference,
      },
    });
  } catch (error) {
    console.error("Error initiating M-Pesa payment:", error);
    return next(new ErrorResponse("Failed to initiate M-Pesa payment", 500));
  }
});

// @desc    Handle M-Pesa payment callback
// @route   POST /api/payments/mpesa/callback
// @access  Public (M-Pesa callback)
const handleMpesaCallback = asyncHandler(async (req, res, next) => {
  try {
    console.log(
      "📞 M-Pesa Callback received:",
      JSON.stringify(req.body, null, 2)
    );

    const callbackResult = await currentMpesaService.processCallback(req.body);
    console.log(
      "📞 Processed callback result:",
      JSON.stringify(callbackResult, null, 2)
    );

    // Find the transaction by checkout request ID or account reference
    const transaction = await Transaction.findOne({
      $or: [
        { checkoutRequestID: callbackResult.checkoutRequestID },
        { accountReference: callbackResult.accountReference },
      ],
    }).populate("ticket event user");

    console.log(
      "🔍 Transaction search result:",
      transaction ? "Found" : "Not found"
    );
    if (transaction) {
      console.log("🔍 Found transaction ID:", transaction._id);
      console.log("🔍 Transaction status before update:", transaction.status);
    }

    if (!transaction) {
      console.error(
        "Transaction not found for checkout request ID:",
        callbackResult.checkoutRequestID,
        "or account reference:",
        callbackResult.accountReference
      );
      return res.json({
        ResultCode: 0,
        ResultDesc: "Success",
      });
    }

    if (callbackResult.success) {
      // Payment successful
      await transaction.markSuccessful(callbackResult);

      if (transaction.ticket) {
        // Update ticket status
        transaction.ticket.status = "confirmed";
        transaction.ticket.paymentStatus = "completed";
        transaction.ticket.paymentReference = callbackResult.mpesaReceiptNumber;
        await transaction.ticket.save();

        // Update event available tickets
        await Event.findByIdAndUpdate(transaction.event._id, {
          $inc: { availableTickets: -transaction.ticket.quantity },
        });

        console.log(
          `Ticket ${transaction.ticket.ticketNumber} confirmed via M-Pesa`
        );
      }
    } else {
      // Payment failed
      await transaction.markFailed(
        callbackResult.resultCode,
        callbackResult.resultDesc,
        callbackResult
      );

      if (transaction.ticket) {
        transaction.ticket.status = "cancelled";
        transaction.ticket.paymentStatus = "failed";
        await transaction.ticket.save();

        console.log(
          `Ticket ${transaction.ticket.ticketNumber} payment failed: ${callbackResult.resultDesc}`
        );
      }
    }

    // Log transaction
    currentMpesaService.logTransaction("CALLBACK", {
      checkoutRequestID: callbackResult.checkoutRequestID,
      success: callbackResult.success,
      resultCode: callbackResult.resultCode,
      resultDesc: callbackResult.resultDesc,
    });

    // Always respond with success to M-Pesa
    res.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);

    // Still respond with success to M-Pesa to avoid retries
    res.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  }
});

// @desc    Query M-Pesa payment status
// @route   GET /api/payments/mpesa/status/:checkoutRequestID
// @access  Private
const queryMpesaStatus = asyncHandler(async (req, res, next) => {
  const { checkoutRequestID } = req.params;

  try {
    const statusResult = await mpesaService.querySTKPushStatus(
      checkoutRequestID
    );

    if (!statusResult.success) {
      return next(
        new ErrorResponse(
          `Failed to query payment status: ${statusResult.error}`,
          400
        )
      );
    }

    // Find the transaction
    const transaction = await Transaction.findOne({
      checkoutRequestID: checkoutRequestID,
    }).populate("ticket event user");

    res.json({
      success: true,
      data: {
        checkoutRequestID: statusResult.checkoutRequestID,
        resultCode: statusResult.resultCode,
        resultDesc: statusResult.resultDesc,
        transaction: transaction
          ? {
              id: transaction._id,
              status: transaction.status,
              amount: transaction.amount,
              currency: transaction.currency,
              phoneNumber: transaction.phoneNumber,
              initiatedAt: transaction.initiatedAt,
              completedAt: transaction.completedAt,
            }
          : null,
        ticket: transaction?.ticket
          ? {
              id: transaction.ticket._id,
              ticketNumber: transaction.ticket.ticketNumber,
              status: transaction.ticket.status,
              paymentStatus: transaction.ticket.paymentStatus,
              event: transaction.event.title,
              amount: transaction.ticket.totalPrice,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error querying M-Pesa status:", error);
    return next(new ErrorResponse("Failed to query payment status", 500));
  }
});

// @desc    Get user's payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  try {
    const tickets = await Ticket.find({ user: userId })
      .populate("event", "title date location")
      .sort({ purchaseDate: -1 });

    res.json({
      success: true,
      data: tickets.map((ticket) => ({
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        event: ticket.event.title,
        quantity: ticket.quantity,
        totalPrice: ticket.totalPrice,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        paymentMethod: ticket.paymentMethod,
        purchaseDate: ticket.purchaseDate,
        paymentReference: ticket.paymentReference,
      })),
    });
  } catch (error) {
    console.error("Error getting payment history:", error);
    return next(new ErrorResponse("Failed to get payment history", 500));
  }
});

// @desc    Test M-Pesa connection
// @route   GET /api/payments/mpesa/test
// @access  Private (Admin only)
const testMpesaConnection = asyncHandler(async (req, res, next) => {
  try {
    const testResult = await mpesaService.testConnection();

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: {
        connection: testResult.success ? "Connected" : "Failed",
        error: testResult.error || null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error testing M-Pesa connection:", error);
    return next(new ErrorResponse("Failed to test M-Pesa connection", 500));
  }
});

// @desc    Get transaction details
// @route   GET /api/payments/transaction/:transactionId
// @access  Private
const getTransactionDetails = asyncHandler(async (req, res, next) => {
  const { transactionId } = req.params;
  const userId = req.user.id;

  try {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
    }).populate("ticket event user");

    if (!transaction) {
      return next(new ErrorResponse("Transaction not found", 404));
    }

    res.json({
      success: true,
      data: {
        id: transaction._id,
        checkoutRequestID: transaction.checkoutRequestID,
        merchantRequestID: transaction.merchantRequestID,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        amount: transaction.amount,
        currency: transaction.currency,
        phoneNumber: transaction.phoneNumber,
        status: transaction.status,
        resultCode: transaction.resultCode,
        resultDesc: transaction.resultDesc,
        accountReference: transaction.accountReference,
        transactionDesc: transaction.transactionDesc,
        initiatedAt: transaction.initiatedAt,
        completedAt: transaction.completedAt,
        duration: transaction.duration,
        ticket: transaction.ticket
          ? {
              id: transaction.ticket._id,
              ticketNumber: transaction.ticket.ticketNumber,
              quantity: transaction.ticket.quantity,
              status: transaction.ticket.status,
              paymentStatus: transaction.ticket.paymentStatus,
            }
          : null,
        event: transaction.event
          ? {
              id: transaction.event._id,
              title: transaction.event.title,
              date: transaction.event.date,
              location: transaction.event.location,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error getting transaction details:", error);
    return next(new ErrorResponse("Failed to get transaction details", 500));
  }
});

// @desc    Get user's transaction history
// @route   GET /api/payments/transactions
// @access  Private
const getTransactionHistory = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { status, limit = 20, page = 1 } = req.query;

  try {
    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate(
        "ticket",
        "ticketNumber quantity totalPrice status paymentStatus"
      )
      .populate("event", "title date location")
      .sort({ initiatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions: transactions.map((transaction) => ({
          id: transaction._id,
          checkoutRequestID: transaction.checkoutRequestID,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          resultDesc: transaction.resultDesc,
          initiatedAt: transaction.initiatedAt,
          completedAt: transaction.completedAt,
          ticket: transaction.ticket
            ? {
                ticketNumber: transaction.ticket.ticketNumber,
                quantity: transaction.ticket.quantity,
                status: transaction.ticket.status,
              }
            : null,
          event: transaction.event
            ? {
                title: transaction.event.title,
                date: transaction.event.date,
                location: transaction.event.location,
              }
            : null,
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total: total,
        },
      },
    });
  } catch (error) {
    console.error("Error getting transaction history:", error);
    return next(new ErrorResponse("Failed to get transaction history", 500));
  }
});

// @desc    Test STK Push with user-provided phone number
// @route   POST /api/payments/mpesa/test-stk
// @access  Public (for testing)
const testSTKPush = asyncHandler(async (req, res, next) => {
  const { eventId, quantity, phoneNumber } = req.body;
  const userId = "507f1f77bcf86cd799439011"; // Test user ID

  console.log("🚀 Testing STK Push with phone:", phoneNumber);

  // Validate required fields
  if (!eventId || !quantity || !phoneNumber) {
    return next(
      new ErrorResponse(
        "Event ID, quantity, and phone number are required",
        400
      )
    );
  }

  // Validate phone number
  if (!currentMpesaService.validatePhoneNumber(phoneNumber)) {
    return next(
      new ErrorResponse(
        "Please provide a valid M-Pesa number in format: 2547XXXXXXXX (e.g., 254712345678)",
        400
      )
    );
  }

  try {
    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new ErrorResponse("Event not found", 404));
    }

    console.log("📅 Event found:", event.title);

    // Check if event is active and has available tickets
    if (!event.isActive) {
      return next(new ErrorResponse("Event is not active", 400));
    }

    if (event.availableTickets < quantity) {
      return next(new ErrorResponse("Not enough tickets available", 400));
    }

    // Calculate total price (always KES 1 for testing)
    const testAmount = 1;
    const totalPrice = testAmount;

    console.log("💰 Amount:", testAmount, "KES");

    // Validate amount
    currentMpesaService.validateAmount(testAmount);

    // Create pending ticket
    const ticket = await Ticket.create({
      event: eventId,
      user: userId,
      quantity: quantity,
      totalPrice: totalPrice,
      status: "pending",
      paymentMethod: "mobile_money",
      paymentStatus: "pending",
      purchaseDate: new Date(),
    });

    console.log("🎫 Ticket created:", ticket._id);

    // Generate account reference
    const accountReference = currentMpesaService.generateAccountReference();
    const transactionDesc = `Test STK Push for ${event.title}`;

    console.log("📝 Account Reference:", accountReference);

    // Create transaction record (without M-Pesa IDs initially)
    const transaction = await Transaction.create({
      amount: testAmount,
      currency: "KES",
      phoneNumber: phoneNumber,
      status: "pending",
      ticket: ticket._id,
      user: userId,
      event: eventId,
      accountReference: accountReference,
      transactionDesc: transactionDesc,
    });

    console.log("💳 Transaction created:", transaction._id);

    // Test M-Pesa connection first
    console.log("🔗 Testing M-Pesa connection...");
    const connectionTest = await currentMpesaService.testConnection();
    console.log("🔗 Connection test result:", connectionTest);

    if (!connectionTest.success) {
      // Delete the pending ticket and transaction if connection fails
      await Ticket.findByIdAndDelete(ticket._id);
      await Transaction.findByIdAndDelete(transaction._id);
      return next(
        new ErrorResponse(
          `M-Pesa connection failed: ${connectionTest.error}`,
          400
        )
      );
    }

    // Initiate STK Push
    console.log("📱 Initiating STK Push...");
    const stkResult = await currentMpesaService.initiateSTKPush(
      phoneNumber,
      testAmount,
      accountReference,
      transactionDesc
    );

    console.log("📱 STK Push result:", stkResult);

    if (!stkResult.success) {
      // Delete the pending ticket and transaction if STK Push fails
      await Ticket.findByIdAndDelete(ticket._id);
      await Transaction.findByIdAndDelete(transaction._id);
      return next(
        new ErrorResponse(`M-Pesa STK Push failed: ${stkResult.error}`, 400)
      );
    }

    // Update ticket and transaction with M-Pesa details
    ticket.paymentReference = stkResult.checkoutRequestID;
    await ticket.save();

    transaction.checkoutRequestID = stkResult.checkoutRequestID;
    transaction.merchantRequestID = stkResult.merchantRequestID;
    await transaction.save();

    console.log("✅ STK Push initiated successfully!");

    // Log transaction
    currentMpesaService.logTransaction("TEST_STK_INITIATE", {
      checkoutRequestID: stkResult.checkoutRequestID,
      amount: testAmount,
      phoneNumber: phoneNumber,
      ticketId: ticket._id,
      transactionId: transaction._id,
    });

    // Mock callback disabled for real STK Push testing
    console.log("📱 STK Push sent - waiting for real callback from M-Pesa");

    res.json({
      success: true,
      message: `STK Push sent to ${phoneNumber}. Check your phone and enter PIN when prompted.`,
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        transactionId: transaction._id,
        amount: testAmount,
        currency: "KES",
        checkoutRequestID: stkResult.checkoutRequestID,
        merchantRequestID: stkResult.merchantRequestID,
        customerMessage: stkResult.customerMessage,
        phoneNumber: phoneNumber,
        accountReference: accountReference,
        eventTitle: event.title,
        responseCode: stkResult.responseCode,
        responseDescription: stkResult.responseDescription,
      },
    });
  } catch (error) {
    console.error("❌ Error in test STK Push:", error);
    return next(new ErrorResponse("Failed to test STK Push", 500));
  }
});

module.exports = {
  initiateMpesaPayment,
  handleMpesaCallback,
  queryMpesaStatus,
  getPaymentHistory,
  testMpesaConnection,
  getTransactionDetails,
  getTransactionHistory,
  testSTKPush,
};
