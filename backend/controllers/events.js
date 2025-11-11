const Event = require("../models/Event");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all published events
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req, res, next) => {
  const events = await Event.getPublishedEvents();

  res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate(
    "createdBy",
    "username fullName"
  );

  if (!event) {
    return next(
      new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
    );
  }

  res.json({
    success: true,
    data: event,
  });
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private
const createEvent = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  req.body.lastModifiedBy = req.user.id;
  // Auto-publish events created by admin
  req.body.status = "published";
  req.body.publishedAt = new Date();

  const event = await Event.create(req.body);

  res.status(201).json({
    success: true,
    data: event,
  });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = asyncHandler(async (req, res, next) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return next(
      new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is event owner or admin (super-admin or sub-admin)
  const isAdmin =
    req.user.role === "super-admin" || req.user.role === "sub-admin";
  if (event.createdBy.toString() !== req.user.id && !isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this event`,
        401
      )
    );
  }

  req.body.lastModifiedBy = req.user.id;
  // Auto-publish events when updated by admin
  req.body.status = "published";
  req.body.publishedAt = new Date();

  // Convert date string to Date object if provided
  if (req.body.date && typeof req.body.date === "string") {
    req.body.date = new Date(req.body.date);
  }

  // Ensure description is not empty (required field)
  if (
    req.body.description !== undefined &&
    req.body.description.trim() === ""
  ) {
    req.body.description = "No description provided";
  }

  // Update event fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined) {
      event[key] = req.body[key];
    }
  });

  // Save the event (this will run validators, but date validation is now conditional)
  event = await event.save();
  event = await Event.findById(event._id).populate(
    "createdBy",
    "username fullName"
  );

  res.json({
    success: true,
    data: event,
  });
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(
      new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is event owner or admin (super-admin or sub-admin)
  const isAdmin =
    req.user.role === "super-admin" || req.user.role === "sub-admin";
  if (event.createdBy.toString() !== req.user.id && !isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this event`,
        401
      )
    );
  }

  await event.deleteOne();

  res.json({
    success: true,
    data: {},
  });
});

// @desc    Get events by creator
// @route   GET /api/events/creator/:creatorId
// @access  Private
const getEventsByCreator = asyncHandler(async (req, res, next) => {
  const events = await Event.getEventsByCreator(req.params.creatorId);

  res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByCreator,
};
