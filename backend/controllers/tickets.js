const { validationResult } = require("express-validator");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Purchase ticket
// @route   POST /api/tickets/purchase
// @access  Private
const purchaseTicket = asyncHandler(async (req, res, next) => {
  // Debug log the request
  console.log("=== PURCHASE TICKET REQUEST ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { eventId, quantity, attendee, paymentDetails, discounts } = req.body;

  // Find the event
  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if event is published and public
  if (event.status !== "published" || !event.isPublic) {
    return res.status(400).json({
      success: false,
      message: "Event is not available for booking",
    });
  }

  // Check if event is in the future
  if (new Date(event.date) <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Cannot purchase tickets for past events",
    });
  }

  // Check ticket availability
  if (event.availableTickets < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${event.availableTickets} tickets available`,
    });
  }

  // Calculate total amount (including any processing fees)
  const processingFee = 1.5; // Fixed processing fee [[memory:2513993]]
  const totalAmount = event.charges * quantity + processingFee;

  // Create ticket
  const ticketData = {
    event: eventId,
    purchaser: req.user._id,
    attendee,
    quantity,
    unitPrice: event.charges,
    totalAmount,
    paymentDetails: {
      ...paymentDetails,
      currency: event.currency || "USD",
      fees: {
        processingFee,
        serviceFee: 0,
        taxes: 0,
      },
    },
    discounts: discounts || [],
    validUntil: new Date(new Date(event.date).getTime() + 6 * 60 * 60 * 1000), // 6 hours after event
  };

  console.log(
    "Creating ticket with data:",
    JSON.stringify(ticketData, null, 2)
  );

  let ticket;
  try {
    ticket = await Ticket.create(ticketData);
    console.log("Ticket created successfully:", ticket._id);

    // Since this is a demo payment system, automatically confirm the ticket
    await ticket.confirm();
    console.log("Ticket confirmed successfully");
  } catch (ticketError) {
    console.error("Error creating ticket:", ticketError);
    return res.status(400).json({
      success: false,
      message: "Failed to create ticket",
      error: ticketError.message,
    });
  }

  // Update event available tickets
  await event.sellTickets(quantity);

  // Populate the ticket with event details
  await ticket.populate("event", "name date location");

  res.status(201).json({
    success: true,
    message: "Ticket purchased successfully",
    ticket,
  });
});

// @desc    Get user's tickets
// @route   GET /api/tickets/my-tickets
// @access  Private
const getUserTickets = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Filter by status if provided
  let query = { purchaser: req.user._id };
  if (req.query.status) {
    query.status = req.query.status;
  }

  const tickets = await Ticket.find(query)
    .populate("event", "name date location status charges currency")
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Ticket.countDocuments(query);

  res.status(200).json({
    success: true,
    count: tickets.length,
    total,
    tickets,
  });
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate("event", "name date location organizer")
    .populate("purchaser", "username email fullName");

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Ticket not found",
    });
  }

  // Check if user owns this ticket or is admin
  if (
    ticket.purchaser._id.toString() !== req.user._id.toString() &&
    !["super-admin", "sub-admin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this ticket",
    });
  }

  res.status(200).json({
    success: true,
    ticket,
  });
});

// @desc    Cancel ticket
// @route   PUT /api/tickets/:id/cancel
// @access  Private
const cancelTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id).populate("event");

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Ticket not found",
    });
  }

  // Check if user owns this ticket
  if (ticket.purchaser.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to cancel this ticket",
    });
  }

  // Check if ticket can be cancelled
  if (ticket.status !== "confirmed" && ticket.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Ticket cannot be cancelled",
    });
  }

  // Check if event allows cancellation (24 hours before event)
  const eventDate = new Date(ticket.event.date);
  const now = new Date();
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

  if (hoursUntilEvent < 24) {
    return res.status(400).json({
      success: false,
      message: "Cannot cancel tickets less than 24 hours before the event",
    });
  }

  // Cancel the ticket
  await ticket.cancel(req.body.reason || "Cancelled by user");

  // Return tickets to event inventory
  const event = await Event.findById(ticket.event._id);
  await event.refundTickets(ticket.quantity);

  res.status(200).json({
    success: true,
    message: "Ticket cancelled successfully",
    ticket,
  });
});

// @desc    Transfer ticket
// @route   PUT /api/tickets/:id/transfer
// @access  Private
const transferTicket = asyncHandler(async (req, res, next) => {
  const { newOwnerEmail, reason } = req.body;

  if (!newOwnerEmail) {
    return res.status(400).json({
      success: false,
      message: "New owner email is required",
    });
  }

  const ticket = await Ticket.findById(req.params.id).populate("event");

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Ticket not found",
    });
  }

  // Check if user owns this ticket
  if (ticket.purchaser.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to transfer this ticket",
    });
  }

  // Find new owner
  const User = require("../models/User");
  const newOwner = await User.findOne({ email: newOwnerEmail });

  if (!newOwner) {
    return res.status(404).json({
      success: false,
      message: "New owner not found",
    });
  }

  // Transfer the ticket
  await ticket.transfer(newOwner._id, reason);

  res.status(200).json({
    success: true,
    message: "Ticket transferred successfully",
    ticket,
  });
});

// @desc    Get event tickets (Admin)
// @route   GET /api/tickets/event/:eventId
// @access  Private (Admin)
const getEventTickets = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if user can view this event's tickets
  if (
    req.user.role === "sub-admin" &&
    event.createdBy.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view these tickets",
    });
  }

  const startIndex = (page - 1) * limit;
  let query = { event: eventId };

  if (status) {
    query.status = status;
  }

  const tickets = await Ticket.find(query)
    .populate("purchaser", "username email fullName")
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(parseInt(limit));

  const total = await Ticket.countDocuments(query);

  // Get ticket statistics
  const stats = await Ticket.aggregate([
    { $match: { event: event._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: "$quantity" },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: tickets.length,
    total,
    stats,
    tickets,
  });
});

// @desc    Check in ticket (Admin)
// @route   PUT /api/tickets/:id/checkin
// @access  Private (Admin)
const checkInTicket = asyncHandler(async (req, res, next) => {
  const { location } = req.body;

  const ticket = await Ticket.findById(req.params.id).populate("event");

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Ticket not found",
    });
  }

  // Check in the ticket
  try {
    await ticket.checkIn(req.user._id, location);

    res.status(200).json({
      success: true,
      message: "Ticket checked in successfully",
      ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Refund ticket (Admin)
// @route   PUT /api/tickets/:id/refund
// @access  Private (Admin)
const refundTicket = asyncHandler(async (req, res, next) => {
  const { refundAmount, reason } = req.body;

  const ticket = await Ticket.findById(req.params.id).populate("event");

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Ticket not found",
    });
  }

  // Check if ticket can be refunded
  if (ticket.status !== "confirmed") {
    return res.status(400).json({
      success: false,
      message: "Only confirmed tickets can be refunded",
    });
  }

  const refundAmountToUse = refundAmount || ticket.totalAmount;

  // Process refund
  await ticket.refund(refundAmountToUse, reason, req.user._id);

  // Return tickets to event inventory
  const event = await Event.findById(ticket.event._id);
  await event.refundTickets(ticket.quantity);

  res.status(200).json({
    success: true,
    message: "Ticket refunded successfully",
    ticket,
  });
});

module.exports = {
  purchaseTicket,
  getUserTickets,
  getTicket,
  cancelTicket,
  transferTicket,
  getEventTickets,
  checkInTicket,
  refundTicket,
};
