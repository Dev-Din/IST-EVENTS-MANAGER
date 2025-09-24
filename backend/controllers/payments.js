const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const mpesaService = require("../utils/mpesaService");
const TransactionLogger = require("../utils/transactionLogger");
const emailService = require("../utils/emailService");
const Ticket = require("../models/Ticket");
const Transaction = require("../models/Transaction");
const Event = require("../models/Event");
const User = require("../models/User");

// Use real M-Pesa service with provided credentials
const currentMpesaService = mpesaService;

// Initialize transaction logger
const transactionLogger = new TransactionLogger();

// Helper function to process transaction callbacks
const processTransactionCallback = async (transaction, callbackResult, res) => {
  try {
    console.log("🔄 Processing transaction callback for:", transaction._id);

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
        if (transaction.event) {
          await Event.findByIdAndUpdate(transaction.event._id, {
            $inc: { availableTickets: -transaction.ticket.quantity },
          });
        }

        console.log(
          `Ticket ${transaction.ticket.ticketNumber} confirmed via M-Pesa`
        );

        // BULLETPROOF EMAIL SENDING
        try {
          console.log("🛡️ BULLETPROOF: Sending ticket confirmation email");

          // Mark ticket as needing email (will be picked up by bulletproof system)
          transaction.ticket.emailSent = false;
          await transaction.ticket.save();

          // Mark transaction as needing email
          transaction.emailSent = false;
          await transaction.save();

          console.log("✅ Transaction and ticket marked for email sending");

          // Try immediate email sending
          if (transaction.user && transaction.event) {
            const user = await User.findById(
              transaction.user._id || transaction.user
            );
            const event = await Event.findById(
              transaction.event._id || transaction.event
            );

            if (user && event) {
              console.log(`📧 Sending immediate email to ${user.email}`);

              emailService
                .sendTicketConfirmationEmail(transaction.ticket, user, event)
                .then(() => {
                  console.log(`✅ Immediate email sent to ${user.email}`);
                  // Mark as sent
                  transaction.ticket.emailSent = true;
                  transaction.emailSent = true;
                  transaction.ticket.save();
                  transaction.save();
                })
                .catch((emailError) => {
                  console.error(`❌ Immediate email failed:`, emailError);
                  console.log(
                    "🛡️ BULLETPROOF: Email will be retried by background system"
                  );
                });
            }
          }
        } catch (emailError) {
          console.error("❌ Error in bulletproof email system:", emailError);
          console.log(
            "🛡️ BULLETPROOF: Email will be handled by background system"
          );
        }
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

    // Log to JSON file (only if not already logged for this transaction)
    const logType = callbackResult.success
      ? "PAYMENT_COMPLETED"
      : "PAYMENT_FAILED";

    // Check if this transaction has already been logged to prevent duplicates
    const existingLogs = transactionLogger.getTransactionLogs();
    const alreadyLogged = existingLogs?.transactions?.some(
      (log) =>
        log.data.transactionId === transaction._id.toString() &&
        log.type === logType
    );

    if (!alreadyLogged) {
      transactionLogger.logTransaction(logType, {
        checkoutRequestID: callbackResult.checkoutRequestID,
        merchantRequestID: callbackResult.merchantRequestID,
        resultCode: callbackResult.resultCode,
        resultDesc: callbackResult.resultDesc,
        mpesaReceiptNumber: callbackResult.mpesaReceiptNumber,
        amount: callbackResult.amount,
        phoneNumber: callbackResult.phoneNumber,
        transactionId: transaction._id,
        ticketId: transaction.ticket?._id,
        status: callbackResult.success ? "completed" : "failed",
        rawCallbackData: res.req.body,
      });
    } else {
      console.log(
        `📝 Transaction ${transaction._id} already logged, skipping duplicate log entry`
      );
    }

    // Always respond with success to M-Pesa
    res.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("Error processing transaction callback:", error);
    res.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  }
};

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
  const userId = req.user?.id;

  console.log("🚀 Frontend Payment Request Received:");
  console.log("📱 Phone Number:", phoneNumber);
  console.log("🎫 Event ID:", eventId);
  console.log("🔢 Quantity:", quantity);
  console.log("👤 User ID:", userId);

  // Validate required fields
  if (!eventId || !quantity || !phoneNumber) {
    return next(
      new ErrorResponse(
        "Event ID, quantity, and phone number are required",
        400
      )
    );
  }

  // Validate user authentication
  if (!userId) {
    return next(
      new ErrorResponse("User authentication required for ticket purchase", 401)
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
    console.log("🔍 Looking for event with ID:", eventId);
    const event = await Event.findById(eventId);
    console.log("🔍 Event lookup result:", event ? "Found" : "Not found");
    if (event) {
      console.log("🔍 Event details:", event.title, "Active:", event.isActive);
    }
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

    // Calculate real ticket amounts for storage
    const ticketPrice = event.price * quantity;
    const processingFee = 1.5;
    const realTotalPrice = ticketPrice + processingFee;

    // M-Pesa testing amount (always KES 1 for testing)
    const testAmount = 1;

    // Validate amount
    mpesaService.validateAmount(testAmount);

    // Create pending ticket with real amounts but test payment
    const ticket = await Ticket.create({
      event: eventId,
      user: userId,
      quantity: quantity,
      ticketPrice: ticketPrice,
      processingFee: processingFee,
      totalPrice: realTotalPrice, // Real total for record keeping
      testAmount: testAmount, // Amount actually charged for testing
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

    // Check if M-Pesa service is ready
    if (!mpesaService.isReady()) {
      console.log("⏳ M-Pesa service not ready, waiting...");
      const isReady = await mpesaService.waitForReady(10000); // 10 second timeout
      if (!isReady) {
        console.log(
          "⚠️ M-Pesa service not ready, but keeping transaction for callback processing"
        );
        // Don't delete the transaction - keep it for callback processing
        return next(
          new ErrorResponse(
            "M-Pesa service is currently unavailable. Please try again in a moment.",
            503
          )
        );
      }
    }

    // Initiate STK Push with improved error handling
    console.log(`🚀 Initiating M-Pesa payment for ${phoneNumber}`);
    const stkResult = await mpesaService.initiateSTKPush(
      phoneNumber,
      testAmount,
      accountReference,
      transactionDesc
    );

    if (!stkResult.success) {
      console.error(`❌ STK Push failed: ${stkResult.error}`);
      // Keep the transaction for potential callback processing
      console.log(
        "⚠️ STK Push failed, but keeping transaction for callback processing"
      );
      return next(
        new ErrorResponse(
          `M-Pesa payment initiation failed: ${stkResult.error}`,
          500
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

    // Log to JSON file
    transactionLogger.logTransaction("STK_PUSH_INITIATED", {
      checkoutRequestID: stkResult.checkoutRequestID,
      merchantRequestID: stkResult.merchantRequestID,
      amount: testAmount,
      phoneNumber: phoneNumber,
      ticketId: ticket._id,
      transactionId: transaction._id,
      eventId: eventId,
      accountReference: accountReference,
      responseCode: stkResult.responseCode,
      responseDescription: stkResult.responseDescription,
      customerMessage: stkResult.customerMessage,
      status: "initiated",
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

    // If transaction not found, try to find by phone number and amount
    if (!transaction) {
      console.log(
        "🔍 Transaction not found by checkout ID, trying phone number lookup..."
      );
      const fallbackTransaction = await Transaction.findOne({
        phoneNumber: callbackResult.phoneNumber,
        amount: callbackResult.amount,
        status: "pending",
      }).populate("ticket event user");

      if (fallbackTransaction) {
        console.log(
          "✅ Found transaction by phone number:",
          fallbackTransaction._id
        );
        // Update with callback data
        fallbackTransaction.checkoutRequestID =
          callbackResult.checkoutRequestID;
        fallbackTransaction.merchantRequestID =
          callbackResult.merchantRequestID;
        await fallbackTransaction.save();

        // Process this transaction instead
        return await processTransactionCallback(
          fallbackTransaction,
          callbackResult,
          res
        );
      }
    }

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

        // BULLETPROOF EMAIL SENDING - Multiple fallback mechanisms
        try {
          console.log("🛡️ BULLETPROOF: Sending ticket confirmation email");
          console.log("🔍 Transaction details for email:");
          console.log("  - User ID:", transaction.user);
          console.log("  - Event ID:", transaction.event);
          console.log("  - Ticket ID:", transaction.ticket);

          // Mark ticket as needing email (will be picked up by bulletproof system)
          transaction.ticket.emailSent = false;
          await transaction.ticket.save();

          // Mark transaction as needing email
          transaction.emailSent = false;
          await transaction.save();

          console.log("✅ Transaction and ticket marked for email sending");

          // Try immediate email sending
          if (transaction.user && transaction.event) {
            const user = await User.findById(
              transaction.user._id || transaction.user
            );
            const event = await Event.findById(
              transaction.event._id || transaction.event
            );

            if (user && event) {
              console.log(`📧 Sending immediate email to ${user.email}`);

              emailService
                .sendTicketConfirmationEmail(transaction.ticket, user, event)
                .then(() => {
                  console.log(`✅ Immediate email sent to ${user.email}`);
                  // Mark as sent
                  transaction.ticket.emailSent = true;
                  transaction.emailSent = true;
                  transaction.ticket.save();
                  transaction.save();
                })
                .catch((emailError) => {
                  console.error(`❌ Immediate email failed:`, emailError);
                  console.log(
                    "🛡️ BULLETPROOF: Email will be retried by background system"
                  );
                });
            }
          }
        } catch (emailError) {
          console.error("❌ Error in bulletproof email system:", emailError);
          console.log(
            "🛡️ BULLETPROOF: Email will be handled by background system"
          );
        }
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

    // Log to JSON file
    const logType = callbackResult.success
      ? "PAYMENT_COMPLETED"
      : "PAYMENT_FAILED";
    transactionLogger.logTransaction(logType, {
      checkoutRequestID: callbackResult.checkoutRequestID,
      merchantRequestID: callbackResult.merchantRequestID,
      resultCode: callbackResult.resultCode,
      resultDesc: callbackResult.resultDesc,
      mpesaReceiptNumber: callbackResult.mpesaReceiptNumber,
      amount: callbackResult.amount,
      phoneNumber: callbackResult.phoneNumber,
      transactionId: transaction._id,
      ticketId: transaction.ticket?._id,
      status: callbackResult.success ? "completed" : "failed",
      rawCallbackData: req.body,
    });

    // Always respond with success to M-Pesa
    res.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });

    // Final fallback: If no transaction was found but payment was successful,
    // try to send a basic confirmation email
    if (callbackResult.success && !transaction) {
      console.log("🔄 Attempting final fallback email sending...");

      // Try to find any recent transaction for this phone number
      const recentTransaction = await Transaction.findOne({
        phoneNumber: callbackResult.phoneNumber,
        status: "pending",
      })
        .populate("ticket event user")
        .sort({ createdAt: -1 });

      if (recentTransaction) {
        console.log(
          "🔍 Found recent transaction for fallback email:",
          recentTransaction._id
        );

        // Update the transaction with callback data
        recentTransaction.checkoutRequestID = callbackResult.checkoutRequestID;
        recentTransaction.merchantRequestID = callbackResult.merchantRequestID;
        await recentTransaction.markSuccessful(callbackResult);

        // Update ticket
        if (recentTransaction.ticket) {
          recentTransaction.ticket.status = "confirmed";
          recentTransaction.ticket.paymentStatus = "completed";
          recentTransaction.ticket.paymentReference =
            callbackResult.mpesaReceiptNumber;
          await recentTransaction.ticket.save();
        }

        // BULLETPROOF FINAL FALLBACK EMAIL SENDING
        try {
          console.log("🛡️ BULLETPROOF: Final fallback email sending");

          // Mark for bulletproof system
          recentTransaction.ticket.emailSent = false;
          recentTransaction.emailSent = false;
          await recentTransaction.ticket.save();
          await recentTransaction.save();

          console.log(
            "✅ Final fallback transaction marked for bulletproof email system"
          );
        } catch (emailError) {
          console.error(
            "❌ Error in bulletproof final fallback system:",
            emailError
          );
        }
      }
    }
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
    // Find the transaction first
    const transaction = await Transaction.findOne({
      checkoutRequestID: checkoutRequestID,
    }).populate("ticket event user");

    if (!transaction) {
      return next(new ErrorResponse("Transaction not found", 404));
    }

    // If transaction is already completed, return its status
    if (transaction.status === "success") {
      return res.json({
        success: true,
        data: {
          checkoutRequestID: checkoutRequestID,
          resultCode: "0", // Success
          resultDesc: "The service request is processed successfully.",
          transaction: {
            id: transaction._id,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currency,
            phoneNumber: transaction.phoneNumber,
            initiatedAt: transaction.initiatedAt,
            completedAt: transaction.completedAt,
          },
          ticket: transaction.ticket
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
    }

    // If transaction is still pending, query M-Pesa for latest status
    const statusResult = await mpesaService.querySTKPushStatus(
      checkoutRequestID
    );

    // If M-Pesa query fails due to rate limiting, return transaction status
    if (!statusResult.success) {
      console.log(
        "M-Pesa query failed, returning transaction status:",
        statusResult.error
      );
      return res.json({
        success: true,
        data: {
          checkoutRequestID: checkoutRequestID,
          resultCode: transaction.status === "success" ? "0" : "1",
          resultDesc:
            transaction.status === "success"
              ? "The service request is processed successfully."
              : "Transaction is still pending",
          transaction: {
            id: transaction._id,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currency,
            phoneNumber: transaction.phoneNumber,
            initiatedAt: transaction.initiatedAt,
            completedAt: transaction.completedAt,
          },
          ticket: transaction.ticket
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
    }

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

// Get all transaction logs in JSON format
const getTransactionLogs = asyncHandler(async (req, res, next) => {
  const logs = transactionLogger.getTransactionLogs();

  if (!logs) {
    return next(new ErrorResponse("Failed to retrieve transaction logs", 500));
  }

  res.json({
    success: true,
    data: logs,
  });
});

// Get transaction logs summary
const getTransactionSummary = asyncHandler(async (req, res, next) => {
  const summary = transactionLogger.generateSummary();

  if (!summary) {
    return next(
      new ErrorResponse("Failed to generate transaction summary", 500)
    );
  }

  res.json({
    success: true,
    data: summary,
  });
});

// Get transactions by phone number
const getTransactionsByPhone = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.params;

  if (!phoneNumber) {
    return next(new ErrorResponse("Phone number is required", 400));
  }

  const transactions =
    transactionLogger.getTransactionsByPhoneNumber(phoneNumber);

  res.json({
    success: true,
    count: transactions.length,
    phoneNumber: phoneNumber,
    data: transactions,
  });
});

// Get transactions by status
const getTransactionsByStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.params;

  if (!status) {
    return next(new ErrorResponse("Status is required", 400));
  }

  const transactions = transactionLogger.getTransactionsByStatus(status);

  res.json({
    success: true,
    count: transactions.length,
    status: status,
    data: transactions,
  });
});

// @desc    Test STK Push with user-provided phone number
// @route   POST /api/payments/mpesa/test-stk
// @access  Public (for testing)
const testSTKPush = asyncHandler(async (req, res, next) => {
  const { eventId, quantity, phoneNumber } = req.body;
  const userId = req.user?.id;

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

  // Validate user authentication
  if (!userId) {
    return next(
      new ErrorResponse("User authentication required for ticket purchase", 401)
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

    // Check if M-Pesa service is ready
    if (!currentMpesaService.isReady()) {
      console.log("⏳ M-Pesa service not ready, waiting...");
      const isReady = await currentMpesaService.waitForReady(10000);
      if (!isReady) {
        await Ticket.findByIdAndDelete(ticket._id);
        await Transaction.findByIdAndDelete(transaction._id);
        return next(
          new ErrorResponse(
            "M-Pesa service is currently unavailable. Please try again in a moment.",
            503
          )
        );
      }
    }

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

    // Initiate STK Push with improved error handling
    console.log(`📱 Initiating STK Push to ${phoneNumber}...`);
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

    // Log to JSON file
    transactionLogger.logTransaction("STK_PUSH_INITIATED", {
      checkoutRequestID: stkResult.checkoutRequestID,
      merchantRequestID: stkResult.merchantRequestID,
      amount: testAmount,
      phoneNumber: phoneNumber,
      ticketId: ticket._id,
      transactionId: transaction._id,
      eventId: eventId,
      accountReference: accountReference,
      responseCode: stkResult.responseCode,
      responseDescription: stkResult.responseDescription,
      customerMessage: stkResult.customerMessage,
      status: "initiated",
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

// Export transaction logs as PDF
const exportTransactionLogsPDF = asyncHandler(async (req, res, next) => {
  try {
    const logs = transactionLogger.getTransactionLogs();

    if (!logs) {
      return next(
        new ErrorResponse("Failed to retrieve transaction logs", 500)
      );
    }

    // Generate PDF using the existing PDF generator
    const pdfBuffer = await generateTransactionLogsPDF(logs);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="legitevents-transactions-${
        new Date().toISOString().split("T")[0]
      }.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    next(new ErrorResponse("Failed to generate PDF", 500));
  }
});

// Export transaction logs as CSV
const exportTransactionLogsCSV = asyncHandler(async (req, res, next) => {
  try {
    const logs = transactionLogger.getTransactionLogs();

    if (!logs) {
      return next(
        new ErrorResponse("Failed to retrieve transaction logs", 500)
      );
    }

    // Generate CSV
    const csvContent = generateTransactionLogsCSV(logs);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="legitevents-transactions-${
        new Date().toISOString().split("T")[0]
      }.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Error generating CSV:", error);
    next(new ErrorResponse("Failed to generate CSV", 500));
  }
});

// Helper function to generate PDF
const generateTransactionLogsPDF = async (logs) => {
  const PDFDocument = require("pdfkit");
  const fs = require("fs");
  const path = require("path");

  // Use landscape format with proper margins
  const doc = new PDFDocument({
    margin: 20,
    size: "A4",
    layout: "landscape",
  });
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.on("error", reject);

    // Add LegitEvents logo
    const logoPath = path.join(__dirname, "../../public/legit-events.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 20, 15, { width: 60 });
    }

    // Professional header with better spacing
    doc
      .fontSize(20)
      .fillColor("#2c3e50")
      .text("LegitEvents™ Transaction Logs", 100, 20)
      .fontSize(10)
      .fillColor("#7f8c8d")
      .text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 100, 45)
      .text(`Total: ${logs.metadata.totalTransactions} transactions`, 100, 60);

    // Table setup with proper landscape dimensions
    const tableTop = 80;
    const itemHeight = 20;
    let currentY = tableTop;

    // Calculate column positions for landscape A4 (842x595 points)
    const colPositions = {
      no: 30,
      date: 60,
      time: 100,
      transactionId: 140,
      receipt: 280,
      status: 420,
      phone: 500,
      amount: 650,
    };

    // Header background
    doc
      .rect(20, currentY - 3, 800, 22)
      .fill("#34495e")
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("No.", colPositions.no, currentY)
      .text("Date", colPositions.date, currentY)
      .text("Time", colPositions.time, currentY)
      .text("Transaction ID", colPositions.transactionId, currentY)
      .text("M-Pesa Receipt", colPositions.receipt, currentY)
      .text("Status", colPositions.status, currentY)
      .text("Phone", colPositions.phone, currentY)
      .text("Amount", colPositions.amount, currentY);

    currentY += 25;

    // Add transaction data with proper landscape fitting
    logs.transactions.forEach((txn, index) => {
      if (currentY > 550) {
        // New page if needed
        doc.addPage({
          margin: 20,
          size: "A4",
          layout: "landscape",
        });
        currentY = 30;

        // Repeat header on new page
        doc
          .rect(20, currentY - 3, 800, 22)
          .fill("#34495e")
          .fillColor("white")
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("No.", colPositions.no, currentY)
          .text("Date", colPositions.date, currentY)
          .text("Time", colPositions.time, currentY)
          .text("Transaction ID", colPositions.transactionId, currentY)
          .text("M-Pesa Receipt", colPositions.receipt, currentY)
          .text("Status", colPositions.status, currentY)
          .text("Phone", colPositions.phone, currentY)
          .text("Amount", colPositions.amount, currentY);

        currentY += 25;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.rect(20, currentY - 2, 800, itemHeight).fill("#f8f9fa");
      }

      const date = new Date(txn.timestamp).toLocaleDateString("en-GB");
      const time = new Date(txn.timestamp).toLocaleTimeString("en-GB");
      const receipt =
        txn.data.mpesaReceiptNumber || txn.data.checkoutRequestID || "N/A";

      // Set text color based on status
      let statusColor = "#2c3e50";
      if (txn.data.status === "completed") statusColor = "#27ae60";
      if (txn.data.status === "failed") statusColor = "#e74c3c";
      if (txn.data.status === "initiated") statusColor = "#f39c12";

      doc
        .fillColor("#2c3e50")
        .fontSize(8)
        .font("Helvetica")
        .text(`${index + 1}`, colPositions.no, currentY)
        .text(date, colPositions.date, currentY)
        .text(time, colPositions.time, currentY)
        .text(txn.id, colPositions.transactionId, currentY, {
          width: 130,
          ellipsis: true,
        })
        .text(receipt, colPositions.receipt, currentY, {
          width: 130,
          ellipsis: true,
        })
        .fillColor(statusColor)
        .text(txn.data.status.toUpperCase(), colPositions.status, currentY)
        .fillColor("#2c3e50")
        .text(txn.data.phoneNumber, colPositions.phone, currentY, {
          width: 140,
          ellipsis: true,
        })
        .text(`KES ${txn.data.amount}`, colPositions.amount, currentY);

      currentY += itemHeight;
    });

    // Professional footer
    const pageHeight = doc.page.height;
    doc
      .fontSize(7)
      .fillColor("#7f8c8d")
      .text(
        `LegitEvents™ Transaction Report - ${new Date().toLocaleString(
          "en-GB"
        )}`,
        20,
        pageHeight - 20
      )
      .text(`Page ${doc.page.number}`, 750, pageHeight - 20);

    doc.end();
  });
};

// Helper function to generate CSV
const generateTransactionLogsCSV = (logs) => {
  const headers = [
    "No.",
    "Date",
    "Time",
    "Transaction ID",
    "M-Pesa Receipt",
    "Status",
    "Phone Number",
    "Amount",
  ];
  const rows = [headers.join(",")];

  logs.transactions.forEach((txn, index) => {
    const date = new Date(txn.timestamp).toLocaleDateString("en-GB");
    const time = new Date(txn.timestamp).toLocaleTimeString("en-GB");
    const receipt =
      txn.data.mpesaReceiptNumber || txn.data.checkoutRequestID || "N/A";

    const row = [
      index + 1,
      `"${date}"`,
      `"${time}"`,
      `"${txn.id}"`,
      `"${receipt}"`,
      `"${txn.data.status}"`,
      `"${txn.data.phoneNumber}"`,
      `"KES ${txn.data.amount}"`,
    ];

    rows.push(row.join(","));
  });

  return rows.join("\n");
};

module.exports = {
  initiateMpesaPayment,
  handleMpesaCallback,
  queryMpesaStatus,
  getPaymentHistory,
  testMpesaConnection,
  getTransactionDetails,
  getTransactionHistory,
  getTransactionLogs,
  getTransactionSummary,
  getTransactionsByPhone,
  getTransactionsByStatus,
  testSTKPush,
  exportTransactionLogsPDF,
  exportTransactionLogsCSV,
};
