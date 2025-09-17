const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all sub-admins
// @route   GET /api/admin/sub-admins
// @access  Private/Admin
const getSubAdmins = asyncHandler(async (req, res, next) => {
  const subAdmins = await User.getUsersByRole("sub-admin");

  res.json({
    success: true,
    count: subAdmins.length,
    data: subAdmins,
  });
});

// @desc    Create sub-admin
// @route   POST /api/admin/sub-admins
// @access  Private/Admin
const createSubAdmin = asyncHandler(async (req, res, next) => {
  const { username, email, password, fullName, phone, country } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return next(new ErrorResponse("User already exists", 400));
  }

  // Create sub-admin
  const subAdmin = await User.create({
    username,
    email,
    password,
    fullName,
    phone,
    country,
    role: "sub-admin",
  });

  res.status(201).json({
    success: true,
    message: "Sub-admin created successfully",
    data: subAdmin,
  });
});

// @desc    Update sub-admin
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateSubAdmin = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  if (user.role !== "sub-admin") {
    return next(new ErrorResponse("User is not a sub-admin", 400));
  }

  const fieldsToUpdate = {
    username: req.body.username,
    email: req.body.email,
    fullName: req.body.fullName,
    phone: req.body.phone,
    country: req.body.country,
  };

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    success: true,
    message: "Sub-admin updated successfully",
    data: updatedUser,
  });
});

// @desc    Delete sub-admin
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteSubAdmin = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  if (user.role !== "sub-admin") {
    return next(new ErrorResponse("User is not a sub-admin", 400));
  }

  await user.deleteOne();

  res.json({
    success: true,
    message: "Sub-admin deleted successfully",
    data: {},
  });
});

// @desc    Toggle sub-admin status
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private/Admin
const toggleSubAdminStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({
    success: true,
    message: `Sub-admin ${
      user.isActive ? "activated" : "deactivated"
    } successfully`,
    data: user,
  });
});

// @desc    Get all clients
// @route   GET /api/admin/clients
// @access  Private/Admin
const getClients = asyncHandler(async (req, res, next) => {
  const clients = await User.getUsersByRole("client");

  res.json({
    success: true,
    count: clients.length,
    data: clients,
  });
});

// @desc    Toggle client status
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private/Admin
const toggleClientStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({
    success: true,
    message: `Client ${
      user.isActive ? "activated" : "deactivated"
    } successfully`,
    data: user,
  });
});

// @desc    Delete client
// @route   DELETE /api/admin/clients/:id
// @access  Private/Admin
const deleteClient = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  if (user.role !== "client") {
    return next(new ErrorResponse("User is not a client", 400));
  }

  await user.deleteOne();

  res.json({
    success: true,
    message: "Client deleted successfully",
    data: {},
  });
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalEvents = await Event.countDocuments({ isActive: true });
  const totalTickets = await Ticket.countDocuments({ status: "confirmed" });
  const totalRevenue = await Ticket.aggregate([
    { $match: { status: "confirmed", paymentStatus: "completed" } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } },
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalEvents,
      totalTickets,
      totalRevenue: totalRevenue[0]?.total || 0,
    },
  });
});

// @desc    Get reports
// @route   GET /api/admin/reports
// @access  Private/Admin
const getReports = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, type } = req.query;

  let reports = {};

  if (type === "overview" || !type) {
    // Calculate overview statistics
    const totalEvents = await Event.countDocuments({ isActive: true });
    const activeEvents = await Event.countDocuments({
      status: "published",
      isActive: true,
      date: { $gte: new Date() },
    });
    const totalTickets = await Ticket.countDocuments({
      status: "confirmed",
      paymentStatus: "completed",
    });

    // Calculate total revenue
    const revenueData = await Ticket.aggregate([
      { $match: { status: "confirmed", paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Get events by category
    const eventsByCategory = await Event.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get top events by ticket sales
    const topEvents = await Event.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "tickets",
          localField: "_id",
          foreignField: "event",
          as: "tickets",
        },
      },
      {
        $addFields: {
          ticketsSold: {
            $sum: {
              $map: {
                input: "$tickets",
                as: "ticket",
                in: {
                  $cond: [
                    { $eq: ["$$ticket.status", "confirmed"] },
                    "$$ticket.quantity",
                    0,
                  ],
                },
              },
            },
          },
          revenue: {
            $sum: {
              $map: {
                input: "$tickets",
                as: "ticket",
                in: {
                  $cond: [
                    { $eq: ["$$ticket.status", "confirmed"] },
                    "$$ticket.totalPrice",
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $sort: { ticketsSold: -1 } },
      { $limit: 5 },
      {
        $project: {
          title: 1,
          category: 1,
          price: 1,
          currency: 1,
          ticketsSold: 1,
          revenue: 1,
        },
      },
    ]);

    reports.summary = {
      totalEvents,
      activeEvents,
      totalTickets,
      totalRevenue,
    };
    reports.eventsByCategory = eventsByCategory;
    reports.topEvents = topEvents;
  }

  if (type === "sales" || !type) {
    const salesQuery = { status: "confirmed", paymentStatus: "completed" };

    if (startDate && endDate) {
      salesQuery.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const salesData = await Ticket.aggregate([
      { $match: salesQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
          totalSales: { $sum: "$totalPrice" },
          ticketCount: { $sum: "$quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    reports.sales = salesData;
  }

  if (type === "events" || !type) {
    const eventsQuery = { isActive: true };

    if (startDate && endDate) {
      eventsQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const eventsData = await Event.find(eventsQuery)
      .populate("createdBy", "username fullName")
      .sort({ createdAt: -1 });

    reports.events = eventsData;
  }

  res.json({
    success: true,
    data: reports,
  });
});

module.exports = {
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  toggleSubAdminStatus,
  getClients,
  toggleClientStatus,
  deleteClient,
  getDashboardStats,
  getReports,
};
