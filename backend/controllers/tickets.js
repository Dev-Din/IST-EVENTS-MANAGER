const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Purchase tickets
// @route   POST /api/tickets/purchase
// @access  Private
const purchaseTickets = asyncHandler(async (req, res, next) => {
  const { eventId, quantity, paymentMethod } = req.body;

  // Validate required fields
  if (!eventId || !quantity || !paymentMethod) {
    return next(new ErrorResponse("Please provide eventId, quantity, and paymentMethod", 400));
  }

  // Check if event exists and is available
  const event = await Event.findById(eventId);

  if (!event) {
    return next(new ErrorResponse("Event not found", 404));
  }

  if (event.status !== "published") {
    return next(new ErrorResponse("Event is not available for ticket purchase", 400));
  }

  if (event.availableTickets < quantity) {
    return next(new ErrorResponse("Not enough tickets available", 400));
  }

  // Calculate total price
  const totalPrice = event.price * quantity;

  // Create ticket
  const ticket = await Ticket.create({
    event: eventId,
    user: req.user.id,
    quantity,
    totalPrice,
    paymentMethod,
    status: "confirmed",
    paymentStatus: "completed",
  });

  // Update event available tickets
  await event.updateAvailableTickets(quantity);

  // Populate ticket with event and user details
  await ticket.populate("event", "title date location");
  await ticket.populate("user", "username email fullName");

  res.status(201).json({
    success: true,
    message: "Tickets purchased successfully",
    data: ticket,
  });
});

// @desc    Get user's tickets
// @route   GET /api/tickets/my-tickets
// @access  Private
const getMyTickets = asyncHandler(async (req, res, next) => {
  const tickets = await Ticket.getTicketsByUser(req.user.id);

  res.json({
    success: true,
    count: tickets.length,
    data: tickets,
  });
});

// @desc    Get tickets by event
// @route   GET /api/tickets/event/:eventId
// @access  Private
const getTicketsByEvent = asyncHandler(async (req, res, next) => {
  // Check if user is event creator or admin
  const event = await Event.findById(req.params.eventId);

  if (!event) {
    return next(new ErrorResponse("Event not found", 404));
  }

  if (event.createdBy.toString() !== req.user.id && req.user.role !== "super-admin") {
    return next(new ErrorResponse("Not authorized to view tickets for this event", 401));
  }

  const tickets = await Ticket.getTicketsByEvent(req.params.eventId);

  res.json({
    success: true,
    count: tickets.length,
    data: tickets,
  });
});

// @desc    Cancel ticket
// @route   PUT /api/tickets/:id/cancel
// @access  Private
const cancelTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return next(new ErrorResponse("Ticket not found", 404));
  }

  // Check if user owns the ticket or is admin
  if (ticket.user.toString() !== req.user.id && req.user.role !== "super-admin") {
    return next(new ErrorResponse("Not authorized to cancel this ticket", 401));
  }

  if (ticket.status === "cancelled") {
    return next(new ErrorResponse("Ticket is already cancelled", 400));
  }

  await ticket.cancelTicket();

  // Update event available tickets
  const event = await Event.findById(ticket.event);
  if (event) {
    event.availableTickets += ticket.quantity;
    await event.save();
  }

  res.json({
    success: true,
    message: "Ticket cancelled successfully",
    data: ticket,
  });
});

module.exports = {
  purchaseTickets,
  getMyTickets,
  getTicketsByEvent,
  cancelTicket,
};
