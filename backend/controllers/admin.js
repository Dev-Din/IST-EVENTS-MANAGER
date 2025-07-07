const { validationResult } = require("express-validator");
const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const asyncHandler = require("../utils/asyncHandler");
const PDFGenerator = require("../utils/pdfGenerator");

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  let eventQuery = {};
  // Sub-admins can only see their own events
  if (req.user.role === "sub-admin") {
    eventQuery.createdBy = req.user._id;
  }

  const stats = await Promise.all([
    // Total events
    Event.countDocuments(eventQuery),

    // Events this month
    Event.countDocuments({
      ...eventQuery,
      createdAt: { $gte: startOfMonth },
    }),

    // Total users (super admin only)
    req.user.role === "super-admin"
      ? User.countDocuments({ role: "client" })
      : 0,

    // Total tickets sold
    Ticket.aggregate([
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      {
        $match: {
          status: { $in: ["confirmed", "used"] },
          ...(req.user.role === "sub-admin" && {
            "eventDetails.createdBy": req.user._id,
          }),
        },
      },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: "$quantity" },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]),

    // Recent events
    Event.find(eventQuery)
      .populate("createdBy", "username fullName")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name date location status capacity availableTickets"),

    // Upcoming events
    Event.find({
      ...eventQuery,
      date: { $gte: now },
      status: "published",
    }).countDocuments(),

    // Revenue this month
    Ticket.aggregate([
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      {
        $match: {
          status: { $in: ["confirmed", "used"] },
          createdAt: { $gte: startOfMonth },
          ...(req.user.role === "sub-admin" && {
            "eventDetails.createdBy": req.user._id,
          }),
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  const ticketStats = stats[3][0] || { totalTickets: 0, totalRevenue: 0 };
  const revenueThisMonth = stats[6][0]?.revenue || 0;

  res.status(200).json({
    success: true,
    stats: {
      totalEvents: stats[0],
      eventsThisMonth: stats[1],
      totalUsers: stats[2],
      totalTicketsSold: ticketStats.totalTickets,
      totalRevenue: ticketStats.totalRevenue,
      revenueThisMonth,
      upcomingEvents: stats[5],
      recentEvents: stats[4],
    },
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin with clients permission)
const getUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};

  if (req.query.role) {
    query.role = req.query.role;
  }

  if (req.query.search) {
    query.$or = [
      { username: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { fullName: { $regex: req.query.search, $options: "i" } },
    ];
  }

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  }

  const users = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    users,
  });
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin with clients permission)
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Get user's ticket statistics
  const ticketStats = await Ticket.aggregate([
    { $match: { purchaser: user._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: "$quantity" },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Get user's events (if admin)
  let userEvents = [];
  if (["super-admin", "sub-admin"].includes(user.role)) {
    userEvents = await Event.find({ createdBy: user._id })
      .select("name date status capacity availableTickets")
      .sort({ createdAt: -1 })
      .limit(10);
  }

  res.status(200).json({
    success: true,
    user: {
      ...user.toObject(),
      ticketStats,
      events: userEvents,
    },
  });
});

// @desc    Create sub-admin
// @route   POST /api/admin/sub-admins
// @access  Private (Super Admin)
const createSubAdmin = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { username, email, password, fullName, phone, permissions } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User with this email or username already exists",
    });
  }

  // Create sub-admin
  const user = await User.create({
    username,
    email,
    password,
    fullName,
    phone,
    role: "sub-admin",
    permissions: permissions || ["events", "tickets"],
  });

  res.status(201).json({
    success: true,
    message: "Sub-admin created successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    },
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin with clients permission)
const updateUser = asyncHandler(async (req, res, next) => {
  const { fullName, phone, permissions, isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Only super admin can update sub-admin permissions
  if (user.role === "sub-admin" && req.user.role !== "super-admin") {
    return res.status(403).json({
      success: false,
      message: "Only super admin can modify sub-admin accounts",
    });
  }

  // Update fields
  const updateFields = {};
  if (fullName !== undefined) updateFields.fullName = fullName;
  if (phone !== undefined) updateFields.phone = phone;
  if (isActive !== undefined) updateFields.isActive = isActive;

  if (
    permissions &&
    user.role === "sub-admin" &&
    req.user.role === "super-admin"
  ) {
    updateFields.permissions = permissions;
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    user: updatedUser,
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Super Admin)
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Don't allow deletion of super admin
  if (user.role === "super-admin") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete super admin account",
    });
  }

  // Check if user has active tickets or events
  const activeTickets = await Ticket.countDocuments({
    purchaser: user._id,
    status: { $in: ["confirmed", "pending"] },
  });

  if (activeTickets > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete user with active tickets",
    });
  }

  if (user.role === "sub-admin") {
    const userEvents = await Event.countDocuments({
      createdBy: user._id,
      status: "published",
    });

    if (userEvents > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete sub-admin with published events",
      });
    }
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Toggle user status
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private (Admin with clients permission)
const toggleUserStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Only super admin can modify other admins
  if (user.role !== "client" && req.user.role !== "super-admin") {
    return res.status(403).json({
      success: false,
      message: "Only super admin can modify admin accounts",
    });
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// @desc    Get sub-admins
// @route   GET /api/admin/sub-admins
// @access  Private (Super Admin)
const getSubAdmins = asyncHandler(async (req, res, next) => {
  const subAdmins = await User.find({ role: "sub-admin" })
    .select("-password")
    .sort({ createdAt: -1 });

  // Get statistics for each sub-admin
  const subAdminsWithStats = await Promise.all(
    subAdmins.map(async (admin) => {
      const eventsCount = await Event.countDocuments({ createdBy: admin._id });
      const ticketsSold = await Ticket.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        {
          $match: {
            "eventDetails.createdBy": admin._id,
            status: { $in: ["confirmed", "used"] },
          },
        },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: "$quantity" },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]);

      const stats = ticketsSold[0] || { totalTickets: 0, revenue: 0 };

      return {
        ...admin.toObject(),
        stats: {
          eventsCreated: eventsCount,
          ticketsSold: stats.totalTickets,
          revenue: stats.revenue,
        },
      };
    })
  );

  res.status(200).json({
    success: true,
    count: subAdminsWithStats.length,
    subAdmins: subAdminsWithStats,
  });
});

// @desc    Get clients
// @route   GET /api/admin/clients
// @access  Private (Admin with clients permission)
const getClients = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  let query = { role: "client" };

  if (req.query.search) {
    query.$or = [
      { username: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { fullName: { $regex: req.query.search, $options: "i" } },
    ];
  }

  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  }

  const clients = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  // Get ticket statistics for each client
  const clientsWithStats = await Promise.all(
    clients.map(async (client) => {
      const ticketStats = await Ticket.aggregate([
        { $match: { purchaser: client._id } },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: "$quantity" },
            totalSpent: { $sum: "$totalAmount" },
            confirmedTickets: {
              $sum: {
                $cond: [{ $eq: ["$status", "confirmed"] }, "$quantity", 0],
              },
            },
          },
        },
      ]);

      const stats = ticketStats[0] || {
        totalTickets: 0,
        totalSpent: 0,
        confirmedTickets: 0,
      };

      return {
        ...client.toObject(),
        stats,
      };
    })
  );

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: clientsWithStats.length,
    total,
    clients: clientsWithStats,
  });
});

// @desc    Get reports
// @route   GET /api/admin/reports
// @access  Private (Admin with reports permission)
const getReports = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, type = "overview" } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  let eventFilter = {};
  if (req.user.role === "sub-admin") {
    eventFilter.createdBy = req.user._id;
  }

  switch (type) {
    case "sales":
      const salesData = await Ticket.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "eventDetails",
          },
        },
        {
          $match: {
            ...dateFilter,
            status: { $in: ["confirmed", "used"] },
            ...(req.user.role === "sub-admin" && {
              "eventDetails.createdBy": req.user._id,
            }),
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            totalSales: { $sum: "$totalAmount" },
            ticketCount: { $sum: "$quantity" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return res.status(200).json({
        success: true,
        type: "sales",
        data: salesData,
      });

    case "events":
      const eventData = await Event.aggregate([
        {
          $match: {
            ...eventFilter,
            ...dateFilter,
          },
        },
        {
          $lookup: {
            from: "tickets",
            localField: "_id",
            foreignField: "event",
            as: "tickets",
          },
        },
        {
          $project: {
            name: 1,
            date: 1,
            category: 1,
            capacity: 1,
            availableTickets: 1,
            ticketsSold: { $subtract: ["$capacity", "$availableTickets"] },
            revenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$tickets",
                      cond: { $in: ["$$this.status", ["confirmed", "used"]] },
                    },
                  },
                  as: "ticket",
                  in: "$$ticket.totalAmount",
                },
              },
            },
          },
        },
        { $sort: { date: -1 } },
      ]);

      return res.status(200).json({
        success: true,
        type: "events",
        data: eventData,
      });

    default:
      // Overview report
      const overview = await Promise.all([
        // Total revenue
        Ticket.aggregate([
          {
            $lookup: {
              from: "events",
              localField: "event",
              foreignField: "_id",
              as: "eventDetails",
            },
          },
          {
            $match: {
              ...dateFilter,
              status: { $in: ["confirmed", "used"] },
              ...(req.user.role === "sub-admin" && {
                "eventDetails.createdBy": req.user._id,
              }),
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              totalTickets: { $sum: "$quantity" },
            },
          },
        ]),

        // Events by category
        Event.aggregate([
          {
            $match: {
              ...eventFilter,
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
        ]),

        // Top selling events
        Event.aggregate([
          {
            $match: eventFilter,
          },
          {
            $lookup: {
              from: "tickets",
              localField: "_id",
              foreignField: "event",
              as: "tickets",
            },
          },
          {
            $project: {
              name: 1,
              ticketsSold: { $subtract: ["$capacity", "$availableTickets"] },
              revenue: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$tickets",
                        cond: { $in: ["$$this.status", ["confirmed", "used"]] },
                      },
                    },
                    as: "ticket",
                    in: "$$ticket.totalAmount",
                  },
                },
              },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ]),
      ]);

      return res.status(200).json({
        success: true,
        type: "overview",
        data: {
          summary: overview[0][0] || { totalRevenue: 0, totalTickets: 0 },
          eventsByCategory: overview[1],
          topEvents: overview[2],
        },
      });
  }
});

// @desc    Export data
// @route   POST /api/admin/export/:dataType
// @access  Private (Admin with reports permission)
const exportData = asyncHandler(async (req, res, next) => {
  const { dataType } = req.params;
  const { startDate, endDate, format = "csv" } = req.body;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  let eventFilter = {};
  if (req.user.role === "sub-admin") {
    eventFilter.createdBy = req.user._id;
  }

  // Format date range for display
  const formatDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();
      return `${start} - ${end}`;
    }
    return "All Time";
  };

  try {
    if (format === "pdf") {
      // Generate PDF using PDFGenerator
      const pdfGenerator = new PDFGenerator();

      switch (dataType) {
        case "sales":
          const salesData = await Ticket.aggregate([
            {
              $lookup: {
                from: "events",
                localField: "event",
                foreignField: "_id",
                as: "eventDetails",
              },
            },
            {
              $match: {
                ...dateFilter,
                status: { $in: ["confirmed", "used"] },
                ...(req.user.role === "sub-admin" && {
                  "eventDetails.createdBy": req.user._id,
                }),
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                totalSales: { $sum: "$totalAmount" },
                ticketCount: { $sum: "$quantity" },
              },
            },
            { $sort: { _id: 1 } },
          ]);

          pdfGenerator.generateSalesReport(salesData, formatDateRange());
          break;

        case "events":
          const eventsData = await Event.aggregate([
            {
              $match: {
                ...eventFilter,
                ...dateFilter,
              },
            },
            {
              $lookup: {
                from: "tickets",
                localField: "_id",
                foreignField: "event",
                as: "tickets",
              },
            },
            {
              $project: {
                name: 1,
                date: 1,
                location: 1,
                category: 1,
                capacity: 1,
                availableTickets: 1,
                charges: 1,
                currency: 1,
                status: 1,
                ticketsSold: { $subtract: ["$capacity", "$availableTickets"] },
                revenue: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$tickets",
                          cond: {
                            $in: ["$$this.status", ["confirmed", "used"]],
                          },
                        },
                      },
                      as: "ticket",
                      in: "$$ticket.totalAmount",
                    },
                  },
                },
              },
            },
            { $sort: { date: -1 } },
          ]);

          pdfGenerator.generateEventsReport(eventsData, formatDateRange());
          break;

        case "comprehensive":
          const [ticketData, eventData, categoryData] = await Promise.all([
            // Ticket sales summary
            Ticket.aggregate([
              {
                $lookup: {
                  from: "events",
                  localField: "event",
                  foreignField: "_id",
                  as: "eventDetails",
                },
              },
              {
                $match: {
                  ...dateFilter,
                  status: { $in: ["confirmed", "used"] },
                  ...(req.user.role === "sub-admin" && {
                    "eventDetails.createdBy": req.user._id,
                  }),
                },
              },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$totalAmount" },
                  totalTickets: { $sum: "$quantity" },
                  averageTicketPrice: { $avg: "$totalAmount" },
                },
              },
            ]),

            // Top events
            Event.aggregate([
              { $match: eventFilter },
              {
                $lookup: {
                  from: "tickets",
                  localField: "_id",
                  foreignField: "event",
                  as: "tickets",
                },
              },
              {
                $project: {
                  name: 1,
                  ticketsSold: {
                    $subtract: ["$capacity", "$availableTickets"],
                  },
                  revenue: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$tickets",
                            cond: {
                              $in: ["$$this.status", ["confirmed", "used"]],
                            },
                          },
                        },
                        as: "ticket",
                        in: "$$ticket.totalAmount",
                      },
                    },
                  },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 10 },
            ]),

            // Events by category
            Event.aggregate([
              { $match: { ...eventFilter, ...dateFilter } },
              {
                $group: {
                  _id: "$category",
                  count: { $sum: 1 },
                },
              },
            ]),
          ]);

          const comprehensiveData = {
            summary: ticketData[0] || {
              totalRevenue: 0,
              totalTickets: 0,
              averageTicketPrice: 0,
            },
            topEvents: eventData,
            eventsByCategory: categoryData,
          };

          pdfGenerator.generateComprehensiveReport(
            comprehensiveData,
            formatDateRange()
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid data type for export",
          });
      }

      // Set response headers for PDF download
      const filename = `${dataType}-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Cache-Control", "no-cache");

      // Pipe the PDF to response
      pdfGenerator.finalize().pipe(res);
    } else {
      // CSV Export (existing logic)
      let csvData = "";
      let filename = "";

      switch (dataType) {
        case "sales":
          const salesData = await Ticket.aggregate([
            {
              $lookup: {
                from: "events",
                localField: "event",
                foreignField: "_id",
                as: "eventDetails",
              },
            },
            {
              $match: {
                ...dateFilter,
                status: { $in: ["confirmed", "used"] },
                ...(req.user.role === "sub-admin" && {
                  "eventDetails.createdBy": req.user._id,
                }),
              },
            },
            {
              $project: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                eventName: { $arrayElemAt: ["$eventDetails.name", 0] },
                quantity: 1,
                totalAmount: 1,
                status: 1,
                purchaserEmail: 1,
              },
            },
            { $sort: { createdAt: -1 } },
          ]);

          csvData = "Date,Event Name,Quantity,Amount,Status,Purchaser Email\n";
          salesData.forEach((sale) => {
            csvData += `${sale.date},"${sale.eventName || "Unknown"}",${
              sale.quantity
            },${sale.totalAmount},${sale.status},"${
              sale.purchaserEmail || "N/A"
            }"\n`;
          });
          filename = `sales-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          break;

        case "events":
          const eventsData = await Event.aggregate([
            {
              $match: {
                ...eventFilter,
                ...dateFilter,
              },
            },
            {
              $lookup: {
                from: "tickets",
                localField: "_id",
                foreignField: "event",
                as: "tickets",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                as: "creator",
              },
            },
            {
              $project: {
                name: 1,
                date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                location: 1,
                category: 1,
                capacity: 1,
                availableTickets: 1,
                charges: 1,
                currency: 1,
                status: 1,
                creatorName: { $arrayElemAt: ["$creator.fullName", 0] },
                ticketsSold: { $subtract: ["$capacity", "$availableTickets"] },
                revenue: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$tickets",
                          cond: {
                            $in: ["$$this.status", ["confirmed", "used"]],
                          },
                        },
                      },
                      as: "ticket",
                      in: "$$ticket.totalAmount",
                    },
                  },
                },
              },
            },
            { $sort: { date: -1 } },
          ]);

          csvData =
            "Name,Date,Location,Category,Capacity,Available,Sold,Charges,Currency,Revenue,Status,Creator\n";
          eventsData.forEach((event) => {
            csvData += `"${event.name}",${event.date},"${event.location}","${
              event.category
            }",${event.capacity},${event.availableTickets},${
              event.ticketsSold
            },${event.charges},"${event.currency}",${event.revenue},"${
              event.status
            }","${event.creatorName || "N/A"}"\n`;
          });
          filename = `events-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          break;

        case "comprehensive":
          // Overview report with multiple sections
          const [ticketData, eventData, userData] = await Promise.all([
            // Ticket sales summary
            Ticket.aggregate([
              {
                $lookup: {
                  from: "events",
                  localField: "event",
                  foreignField: "_id",
                  as: "eventDetails",
                },
              },
              {
                $match: {
                  ...dateFilter,
                  status: { $in: ["confirmed", "used"] },
                  ...(req.user.role === "sub-admin" && {
                    "eventDetails.createdBy": req.user._id,
                  }),
                },
              },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$totalAmount" },
                  totalTickets: { $sum: "$quantity" },
                  averageTicketPrice: { $avg: "$totalAmount" },
                },
              },
            ]),

            // Events summary
            Event.aggregate([
              { $match: { ...eventFilter, ...dateFilter } },
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ]),

            // User registrations (if super admin)
            req.user.role === "super-admin"
              ? User.aggregate([
                  { $match: { ...dateFilter, role: "client" } },
                  {
                    $group: {
                      _id: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" },
                      },
                      newUsers: { $sum: 1 },
                    },
                  },
                  { $sort: { _id: 1 } },
                ])
              : [],
          ]);

          const summary = ticketData[0] || {
            totalRevenue: 0,
            totalTickets: 0,
            averageTicketPrice: 0,
          };

          csvData = "COMPREHENSIVE REPORT\n\n";
          csvData += "SALES SUMMARY\n";
          csvData += "Metric,Value\n";
          csvData += `Total Revenue,${summary.totalRevenue}\n`;
          csvData += `Total Tickets Sold,${summary.totalTickets}\n`;
          csvData += `Average Ticket Price,${summary.averageTicketPrice}\n\n`;

          csvData += "EVENTS BY STATUS\n";
          csvData += "Status,Count\n";
          eventData.forEach((item) => {
            csvData += `${item._id},${item.count}\n`;
          });

          if (req.user.role === "super-admin" && userData.length > 0) {
            csvData += "\nUSER REGISTRATIONS BY MONTH\n";
            csvData += "Month,New Users\n";
            userData.forEach((item) => {
              csvData += `${item._id},${item.newUsers}\n`;
            });
          }

          filename = `comprehensive-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid data type for export",
          });
      }

      // Set response headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Cache-Control", "no-cache");

      res.status(200).send(csvData);
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate export file",
    });
  }
});

module.exports = {
  getDashboardStats,
  getUsers,
  getUser,
  createSubAdmin,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getSubAdmins,
  getClients,
  getReports,
  exportData,
};
