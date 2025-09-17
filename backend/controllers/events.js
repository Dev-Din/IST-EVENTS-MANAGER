const { validationResult } = require("express-validator");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req, res, next) => {
  let query = {};

  // Filter by status for public access
  if (!req.user || req.user.role === "client") {
    query = {
      status: "published",
      isPublic: true,
      date: { $gte: new Date() },
    };
  }

  // Admin can see all events
  if (req.user && req.user.role === "super-admin") {
    // No additional filters for super admin
  }

  // Sub-admin can see their own events
  if (req.user && req.user.role === "sub-admin") {
    query.createdBy = req.user._id;
  }

  // Add category filter
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Add location filter
  if (req.query.location) {
    query.location = { $regex: req.query.location, $options: "i" };
  }

  // Add date range filter
  if (req.query.dateFrom || req.query.dateTo) {
    query.date = {};
    if (req.query.dateFrom) query.date.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) query.date.$lte = new Date(req.query.dateTo);
  }

  // Add price range filter
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    query.charges = {};
    if (req.query.minPrice !== undefined)
      query.charges.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice !== undefined)
      query.charges.$lte = Number(req.query.maxPrice);
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Sort
  const sortBy = req.query.sortBy || "date";
  const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  try {
    const events = await Event.find(query)
      .populate("createdBy", "username fullName")
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    const total = await Event.countDocuments(query);

    // Pagination result
    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pagination,
      events,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate(
    "createdBy",
    "username fullName email"
  );

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if user can view this event
  if (!req.user || req.user.role === "client") {
    if (event.status !== "published" || !event.isPublic) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
  }

  // Sub-admin can only view their own unpublished events
  if (req.user && req.user.role === "sub-admin") {
    if (
      event.status !== "published" &&
      event.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
  }

  // Increment view count
  if (!req.user || req.user.role === "client") {
    await event.incrementViews();
  }

  res.status(200).json({
    success: true,
    event,
  });
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Admin)
const createEvent = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Add user to req.body
  req.body.createdBy = req.user.id;
  req.body.lastModifiedBy = req.user.id;

  // Auto-publish events created by admin
  req.body.status = "published";
  req.body.publishedAt = new Date();

  const event = await Event.create(req.body);

  res.status(201).json({
    success: true,
    event,
  });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Admin)
const updateEvent = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  let event = req.event || (await Event.findById(req.params.id));

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if event can be modified
  if (!event.canBeModified()) {
    return res.status(400).json({
      success: false,
      message:
        "Cannot modify past events or events that are not in draft/published status",
    });
  }

  // Add last modified by
  req.body.lastModifiedBy = req.user.id;

  // Auto-publish events when updated by admin
  req.body.status = "published";
  req.body.publishedAt = new Date();

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "username fullName");

  res.status(200).json({
    success: true,
    event,
  });
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin)
const deleteEvent = asyncHandler(async (req, res, next) => {
  const event = req.event || (await Event.findById(req.params.id));

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if there are any confirmed tickets
  const confirmedTickets = await Ticket.countDocuments({
    event: event._id,
    status: { $in: ["confirmed", "used"] },
  });

  if (confirmedTickets > 0) {
    return res.status(400).json({
      success: false,
      message:
        "Cannot delete event with confirmed tickets. Cancel the event instead.",
    });
  }

  await event.deleteOne();

  res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
});

// @desc    Get user's events
// @route   GET /api/events/user/my-events
// @access  Private
const getMyEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = {};

  if (req.user.role === "client") {
    // For clients, show events they have tickets for
    const userTickets = await Ticket.find({
      purchaser: req.user._id,
      status: { $in: ["confirmed", "pending", "used"] },
    }).distinct("event");

    query._id = { $in: userTickets };
  } else {
    // For admins, show events they created
    query.createdBy = req.user._id;
  }

  const events = await Event.find(query)
    .populate("createdBy", "username fullName")
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Event.countDocuments(query);

  res.status(200).json({
    success: true,
    count: events.length,
    total,
    events,
  });
});

// @desc    Get featured events
// @route   GET /api/events/featured
// @access  Public
const getFeaturedEvents = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 6;

  const events = await Event.getFeaturedEvents(limit);

  res.status(200).json({
    success: true,
    count: events.length,
    events,
  });
});

// @desc    Search events
// @route   GET /api/events/search
// @access  Public
const searchEvents = asyncHandler(async (req, res, next) => {
  const {
    q: query,
    category,
    location,
    minPrice,
    maxPrice,
    dateFrom,
    dateTo,
  } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  const options = {
    category,
    location,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    dateFrom,
    dateTo,
  };

  const events = await Event.searchEvents(query, options);

  res.status(200).json({
    success: true,
    count: events.length,
    events,
  });
});

// @desc    Get event statistics
// @route   GET /api/events/:id/stats
// @access  Private (Admin with reports permission)
const getEventStats = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Get ticket statistics
  const ticketStats = await Ticket.aggregate([
    { $match: { event: event._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: "$quantity" },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const totalTickets = await Ticket.aggregate([
    { $match: { event: event._id } },
    {
      $group: {
        _id: null,
        total: { $sum: "$quantity" },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const stats = {
    event: {
      id: event._id,
      name: event.name,
      capacity: event.capacity,
      availableTickets: event.availableTickets,
      ticketsSold: event.capacity - event.availableTickets,
      views: event.analytics.views,
    },
    tickets: {
      byStatus: ticketStats,
      total: totalTickets[0] || { total: 0, revenue: 0 },
    },
    revenue: {
      total: totalTickets[0]?.revenue || 0,
      projected: event.capacity * event.charges,
    },
    occupancy: {
      percentage:
        ((event.capacity - event.availableTickets) / event.capacity) * 100,
      sold: event.capacity - event.availableTickets,
      available: event.availableTickets,
    },
  };

  res.status(200).json({
    success: true,
    stats,
  });
});

// @desc    Publish event
// @route   PUT /api/events/:id/publish
// @access  Private (Admin)
const publishEvent = asyncHandler(async (req, res, next) => {
  const event = req.event || (await Event.findById(req.params.id));

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (event.status === "published") {
    return res.status(400).json({
      success: false,
      message: "Event is already published",
    });
  }

  event.status = "published";
  event.publishedAt = new Date();
  event.lastModifiedBy = req.user._id;
  await event.save();

  res.status(200).json({
    success: true,
    message: "Event published successfully",
    event,
  });
});

// @desc    Unpublish event
// @route   PUT /api/events/:id/unpublish
// @access  Private (Admin)
const unpublishEvent = asyncHandler(async (req, res, next) => {
  const event = req.event || (await Event.findById(req.params.id));

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (event.status !== "published") {
    return res.status(400).json({
      success: false,
      message: "Event is not published",
    });
  }

  // Check if there are confirmed tickets
  const confirmedTickets = await Ticket.countDocuments({
    event: event._id,
    status: { $in: ["confirmed", "used"] },
  });

  if (confirmedTickets > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot unpublish event with confirmed tickets",
    });
  }

  event.status = "draft";
  event.lastModifiedBy = req.user._id;
  await event.save();

  res.status(200).json({
    success: true,
    message: "Event unpublished successfully",
    event,
  });
});

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getFeaturedEvents,
  searchEvents,
  getEventStats,
  publishEvent,
  unpublishEvent,
};
