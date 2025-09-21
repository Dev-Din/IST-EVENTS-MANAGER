const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const mpesaService = require("../utils/mpesaService");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");

// @desc    Initiate M-Pesa payment for ticket purchase
// @route   POST /api/payments/mpesa/initiate
// @access  Private
const initiateMpesaPayment = asyncHandler(async (req, res, next) => {
  const { eventId, quantity, phoneNumber } = req.body;
  const userId = req.user.id;

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
  if (!mpesaService.validatePhoneNumber(phoneNumber)) {
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
    const accountReference = `TKT-${ticket.ticketNumber}`;
    const transactionDesc = `Ticket for ${event.title}`;

    // Initiate STK Push
    const stkResult = await mpesaService.initiateSTKPush(
      phoneNumber,
      testAmount,
      accountReference,
      transactionDesc
    );

    if (!stkResult.success) {
      // Delete the pending ticket if STK Push fails
      await Ticket.findByIdAndDelete(ticket._id);
      return next(
        new ErrorResponse(
          `M-Pesa payment initiation failed: ${stkResult.error}`,
          400
        )
      );
    }

    // Update ticket with M-Pesa details
    ticket.paymentReference = stkResult.checkoutRequestID;
    await ticket.save();

    res.json({
      success: true,
      message: "M-Pesa payment initiated successfully",
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        amount: testAmount,
        currency: "KES",
        checkoutRequestID: stkResult.checkoutRequestID,
        customerMessage: stkResult.customerMessage,
        phoneNumber: phoneNumber,
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
    console.log("M-Pesa Callback received:", JSON.stringify(req.body, null, 2));

    const callbackResult = await mpesaService.processCallback(req.body);

    if (callbackResult.success) {
      // Find the ticket by checkout request ID
      const ticket = await Ticket.findOne({
        paymentReference: callbackResult.checkoutRequestID,
      }).populate("event user");

      if (ticket) {
        // Update ticket status
        ticket.status = "confirmed";
        ticket.paymentStatus = "completed";
        ticket.paymentReference = callbackResult.mpesaReceiptNumber;
        await ticket.save();

        // Update event available tickets
        await Event.findByIdAndUpdate(ticket.event._id, {
          $inc: { availableTickets: -ticket.quantity },
        });

        console.log(`Ticket ${ticket.ticketNumber} confirmed via M-Pesa`);
      } else {
        console.error(
          "Ticket not found for checkout request ID:",
          callbackResult.checkoutRequestID
        );
      }
    } else {
      // Payment failed - update ticket status
      const ticket = await Ticket.findOne({
        paymentReference: callbackResult.checkoutRequestID,
      });

      if (ticket) {
        ticket.status = "cancelled";
        ticket.paymentStatus = "failed";
        await ticket.save();

        console.log(
          `Ticket ${ticket.ticketNumber} payment failed: ${callbackResult.resultDesc}`
        );
      }
    }

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

    // Find the ticket
    const ticket = await Ticket.findOne({
      paymentReference: checkoutRequestID,
    }).populate("event user");

    res.json({
      success: true,
      data: {
        checkoutRequestID: statusResult.checkoutRequestID,
        resultCode: statusResult.resultCode,
        resultDesc: statusResult.resultDesc,
        ticket: ticket
          ? {
              id: ticket._id,
              ticketNumber: ticket.ticketNumber,
              status: ticket.status,
              paymentStatus: ticket.paymentStatus,
              event: ticket.event.title,
              amount: ticket.totalPrice,
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

module.exports = {
  initiateMpesaPayment,
  handleMpesaCallback,
  queryMpesaStatus,
  getPaymentHistory,
};
