const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const emailService = require("../utils/emailService");
const pdfTicketGenerator = require("../utils/pdfTicketGenerator");

// @desc    Purchase tickets
// @route   POST /api/tickets/purchase
// @access  Private
const purchaseTickets = asyncHandler(async (req, res, next) => {
  const { eventId, quantity, paymentMethod } = req.body;

  // Validate required fields
  if (!eventId || !quantity || !paymentMethod) {
    return next(
      new ErrorResponse(
        "Please provide eventId, quantity, and paymentMethod",
        400
      )
    );
  }

  // Check if event exists and is available
  const event = await Event.findById(eventId);

  if (!event) {
    return next(new ErrorResponse("Event not found", 404));
  }

  if (event.status !== "published") {
    return next(
      new ErrorResponse("Event is not available for ticket purchase", 400)
    );
  }

  if (event.availableTickets < quantity) {
    return next(new ErrorResponse("Not enough tickets available", 400));
  }

  // Calculate prices
  const ticketPrice = event.price * quantity;
  const processingFee = 1.5;
  const totalPrice = ticketPrice + processingFee;

  // Create ticket
  const ticket = await Ticket.create({
    event: eventId,
    user: req.user.id,
    quantity,
    ticketPrice,
    processingFee,
    totalPrice,
    paymentMethod,
    status: "confirmed",
    paymentStatus: "completed",
    ticketNumber: `TKT-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`,
  });

  // Update event available tickets
  await event.updateAvailableTickets(quantity);

  // Populate ticket with event and user details
  await ticket.populate("event", "title date location");
  await ticket.populate("user", "username email fullName");

  // Send ticket confirmation email (don't block response)
  const user = await User.findById(req.user.id);
  emailService
    .sendTicketConfirmationEmail(ticket, user, event)
    .catch((err) =>
      console.error("Failed to send ticket confirmation email:", err)
    );

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

  if (
    event.createdBy.toString() !== req.user.id &&
    req.user.role !== "super-admin"
  ) {
    return next(
      new ErrorResponse("Not authorized to view tickets for this event", 401)
    );
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
  if (
    ticket.user.toString() !== req.user.id &&
    req.user.role !== "super-admin"
  ) {
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

// @desc    Download ticket as PDF
// @route   GET /api/tickets/:id/download
// @access  Private
const downloadTicketPDF = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate("event")
    .populate("user");

  if (!ticket) {
    return next(new ErrorResponse("Ticket not found", 404));
  }

  // Check if user owns this ticket or is admin
  if (
    ticket.user._id.toString() !== req.user.id &&
    req.user.role !== "super-admin"
  ) {
    return next(
      new ErrorResponse("Not authorized to download this ticket", 403)
    );
  }

  if (ticket.status !== "confirmed" || ticket.paymentStatus !== "completed") {
    return next(
      new ErrorResponse("Ticket is not confirmed or payment not completed", 400)
    );
  }

  try {
    const pdfBuffer = await pdfTicketGenerator.generateTicket(
      ticket,
      ticket.event,
      ticket.user
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ticket-${ticket.ticketNumber}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    return next(new ErrorResponse("Failed to generate PDF ticket", 500));
  }
});

// @desc    Download all user tickets as PDF
// @route   GET /api/tickets/download-all
// @access  Private
const downloadAllTicketsPDF = asyncHandler(async (req, res, next) => {
  const tickets = await Ticket.find({
    user: req.user.id,
    status: "confirmed",
    paymentStatus: "completed",
  })
    .populate("event")
    .populate("user");

  if (!tickets.length) {
    return next(new ErrorResponse("No confirmed tickets found", 404));
  }

  try {
    const events = tickets.map((t) => t.event);
    const users = tickets.map((t) => t.user);

    const pdfBuffer = await pdfTicketGenerator.generateBulkTickets(
      tickets,
      events,
      users
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="my-tickets-${Date.now()}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Bulk PDF generation error:", error);
    return next(new ErrorResponse("Failed to generate PDF tickets", 500));
  }
});

module.exports = {
  purchaseTickets,
  getMyTickets,
  getTicketsByEvent,
  cancelTicket,
  downloadTicketPDF,
  downloadAllTicketsPDF,
};
