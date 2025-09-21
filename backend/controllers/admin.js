const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const CSVGenerator = require("../utils/csvGenerator");
const PDFReportsGenerator = require("../utils/pdfReportsGenerator");

// @desc    Get all sub-admins
// @route   GET /api/admin/sub-admins
// @access  Private/Admin
const getSubAdmins = asyncHandler(async (req, res, next) => {
  const subAdmins = await User.getUsersByRole("sub-admin");

  res.json({
    success: true,
    count: subAdmins.length,
    subAdmins: subAdmins,
    data: subAdmins, // Keep both for backward compatibility
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

// @desc    Get all clients with real-time activity data
// @route   GET /api/admin/clients
// @access  Private/Admin
const getClients = asyncHandler(async (req, res, next) => {
  // Get all clients
  const clients = await User.find({ role: "client", isActive: true }).select(
    "-password"
  );

  // Get activity data for each client
  const clientsWithActivity = await Promise.all(
    clients.map(async (client) => {
      // Get ticket statistics for this client
      const ticketStats = await Ticket.aggregate([
        {
          $match: {
            user: client._id,
            status: "confirmed",
            paymentStatus: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: "$quantity" },
            totalSpent: { $sum: "$totalPrice" },
            lastPurchase: { $max: "$purchaseDate" },
          },
        },
      ]);

      // Get the most recent ticket for additional details
      const lastTicket = await Ticket.findOne({
        user: client._id,
        status: "confirmed",
        paymentStatus: "completed",
      })
        .populate("event", "title currency")
        .sort({ purchaseDate: -1 });

      const stats = ticketStats[0] || {
        totalTickets: 0,
        totalSpent: 0,
        lastPurchase: null,
      };

      return {
        ...client.toObject(),
        stats: {
          totalTickets: stats.totalTickets,
          totalSpent: stats.totalSpent,
          lastPurchase: stats.lastPurchase,
          lastTicketEvent: lastTicket ? lastTicket.event.title : null,
          lastTicketCurrency: lastTicket ? lastTicket.event.currency : null,
        },
      };
    })
  );

  res.json({
    success: true,
    count: clientsWithActivity.length,
    clients: clientsWithActivity,
    data: clientsWithActivity, // Keep both for backward compatibility
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

  // Get user counts by role
  const totalClients = await User.countDocuments({
    role: "client",
    isActive: true,
  });
  const totalSubAdmins = await User.countDocuments({
    role: "sub-admin",
    isActive: true,
  });

  res.json({
    success: true,
    data: {
      totalUsers,
      totalEvents,
      totalTickets,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalClients,
      totalSubAdmins,
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

// @desc    Export data as CSV
// @route   POST /api/admin/export/:type
// @access  Private/Admin
const exportCSV = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { startDate, endDate } = req.body;

  let data, csvContent, filename;

  // Build date filter
  let dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  switch (type) {
    case "users":
      data = await User.find({ isActive: true, ...dateFilter }).select(
        "-password"
      );
      csvContent = CSVGenerator.generateUsersCSV(data);
      filename = `users-export-${Date.now()}.csv`;
      break;

    case "events":
      data = await Event.find({ isActive: true, ...dateFilter }).populate(
        "createdBy",
        "username fullName"
      );
      csvContent = CSVGenerator.generateEventsCSV(data);
      filename = `events-export-${Date.now()}.csv`;
      break;

    case "tickets":
      data = await Ticket.find(dateFilter)
        .populate("event", "title currency")
        .populate("user", "username email fullName");
      csvContent = CSVGenerator.generateTicketsCSV(data);
      filename = `tickets-export-${Date.now()}.csv`;
      break;

    case "revenue":
      data = await Ticket.aggregate([
        { $match: { status: "confirmed", paymentStatus: "completed" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenue: { $sum: "$totalPrice" },
            totalTickets: { $sum: "$quantity" },
            averageTicketPrice: { $avg: "$totalPrice" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
      ]);
      csvContent = CSVGenerator.generateRevenueCSV(data);
      filename = `revenue-export-${Date.now()}.csv`;
      break;

    case "comprehensive":
      const users = await User.find({ isActive: true }).select("-password");
      const events = await Event.find({ isActive: true }).populate(
        "createdBy",
        "username fullName"
      );
      const tickets = await Ticket.find({})
        .populate("event", "title currency")
        .populate("user", "username email fullName");

      // Combine all data
      csvContent = "COMPREHENSIVE DATA EXPORT\n\n";
      csvContent += "USERS:\n" + CSVGenerator.generateUsersCSV(users) + "\n\n";
      csvContent +=
        "EVENTS:\n" + CSVGenerator.generateEventsCSV(events) + "\n\n";
      csvContent += "TICKETS:\n" + CSVGenerator.generateTicketsCSV(tickets);
      filename = `comprehensive-export-${Date.now()}.csv`;
      break;

    default:
      return next(new ErrorResponse("Invalid export type", 400));
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csvContent);
});

// @desc    Export data as PDF
// @route   POST /api/admin/export-pdf/:type
// @access  Private/Admin
const exportPDF = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { startDate, endDate } = req.body;

  let data, filename;

  // Build date filter
  let dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  switch (type) {
    case "users":
      data = await User.find({ isActive: true, ...dateFilter }).select(
        "-password"
      );
      filename = `users-report-${Date.now()}.pdf`;
      break;

    case "events":
      data = await Event.find({ isActive: true, ...dateFilter }).populate(
        "createdBy",
        "username fullName"
      );
      filename = `events-report-${Date.now()}.pdf`;
      break;

    case "tickets":
      data = await Ticket.find(dateFilter)
        .populate("event", "title currency")
        .populate("user", "username email fullName");
      filename = `tickets-report-${Date.now()}.pdf`;
      break;

    case "revenue":
      data = await Ticket.aggregate([
        { $match: { status: "confirmed", paymentStatus: "completed" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenue: { $sum: "$totalPrice" },
            totalTickets: { $sum: "$quantity" },
            averageTicketPrice: { $avg: "$totalPrice" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
      ]);
      filename = `revenue-report-${Date.now()}.pdf`;
      break;

    case "comprehensive":
      data = {
        summary: {
          totalUsers: await User.countDocuments({ isActive: true }),
          totalEvents: await Event.countDocuments({ isActive: true }),
          totalTickets: await Ticket.countDocuments({ status: "confirmed" }),
          totalRevenue:
            (
              await Ticket.aggregate([
                { $match: { status: "confirmed", paymentStatus: "completed" } },
                { $group: { _id: null, total: { $sum: "$totalPrice" } } },
              ])
            )[0]?.total || 0,
        },
        users: await User.find({ isActive: true })
          .select("-password")
          .limit(50),
        events: await Event.find({ isActive: true })
          .populate("createdBy", "username fullName")
          .limit(30),
        tickets: await Ticket.find({})
          .populate("event", "title currency")
          .populate("user", "username email fullName")
          .limit(50),
      };
      filename = `comprehensive-report-${Date.now()}.pdf`;
      break;

    default:
      return next(new ErrorResponse("Invalid export type", 400));
  }

  try {
    const pdfBuffer = await PDFReportsGenerator.generateReport(type, data, {
      startDate,
      endDate,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    return next(new ErrorResponse("Failed to generate PDF report", 500));
  }
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
  exportCSV,
  exportPDF,
};
