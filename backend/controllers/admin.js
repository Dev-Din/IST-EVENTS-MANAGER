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

/**
 * @desc    Export data as CSV
 * @route   POST /api/admin/export/:type
 * @access  Private/Admin
 * 
 * Role-Based Filtering:
 * - When role="client" in request body: Returns ONLY users with role="client"
 * - When role="sub-admin" in request body: Returns ONLY users with role="sub-admin"
 * - When no role specified: Returns all active users
 * 
 * Safety Measures:
 * 1. MongoDB query filters by exact role match
 * 2. Post-query JavaScript filter removes any non-matching roles
 * 3. Final verification before CSV generation catches any remaining issues
 * 
 * @param {string} type - Type of data to export: "users", "events", "tickets", etc.
 * @param {string} req.body.role - Optional role filter: "client" or "sub-admin"
 * @param {string} req.body.startDate - Optional start date filter
 * @param {string} req.body.endDate - Optional end date filter
 */
const exportCSV = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { startDate, endDate, role } = req.body;

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
      // Support role filtering via body parameter - if role is specified, ONLY get that role
      // Strictly filter by role to prevent mixing admins/sub-admins with clients
      let userQuery = {};
      
      // ========== DEBUGGING: Export CSV ==========
      console.log("\n========== EXPORT CSV DEBUG START ==========");
      console.log("Request params:", JSON.stringify(req.params));
      console.log("Request body:", JSON.stringify(req.body));
      console.log("Role parameter (extracted):", role);
      console.log("Role type:", typeof role);
      console.log("Role === 'client':", role === "client");
      console.log("Role === 'sub-admin':", role === "sub-admin");
      console.log("Type parameter:", type);
      console.log("Date filter:", JSON.stringify(dateFilter));
      
      // CRITICAL: When role is "client", ONLY get clients - exclude super-admin and sub-admin
      if (role === "client") {
        // Explicitly filter ONLY for clients - exclude all other roles
        userQuery = { role: "client" };
        
        // Apply date filter if provided
        if (Object.keys(dateFilter).length > 0) {
          userQuery = { ...userQuery, ...dateFilter };
        }
        console.log("✓ Using CLIENT filter");
      } else if (role === "sub-admin") {
        // When role is "sub-admin", ONLY get sub-admins
        userQuery = { role: "sub-admin" };
        
        // Apply date filter if provided
        if (Object.keys(dateFilter).length > 0) {
          userQuery = { ...userQuery, ...dateFilter };
        }
        console.log("✓ Using SUB-ADMIN filter");
      } else {
        // Default: get all active users (no role filter)
        userQuery = { isActive: true, ...dateFilter };
        console.log("⚠ Using DEFAULT filter (all active users)");
      }
      
      console.log("Final MongoDB Query:", JSON.stringify(userQuery, null, 2));
      
      // Execute query
      data = await User.find(userQuery).select("-password");
      console.log("Users found BEFORE post-filter:", data.length);
      console.log("Roles BEFORE post-filter:", [...new Set(data.map(u => u.role))]);
      
      // Additional safety check: filter out any non-matching roles in case of data inconsistency
      const originalLength = data.length;
      if (role === "client") {
        data = data.filter(user => {
          const isClient = user.role === "client";
          if (!isClient) {
            console.log(`⚠ FILTERED OUT: ${user.username} (role: ${user.role})`);
          }
          return isClient;
        });
        console.log(`Post-filter: ${originalLength} → ${data.length} users (removed ${originalLength - data.length})`);
      } else if (role === "sub-admin") {
        data = data.filter(user => {
          const isSubAdmin = user.role === "sub-admin";
          if (!isSubAdmin) {
            console.log(`⚠ FILTERED OUT: ${user.username} (role: ${user.role})`);
          }
          return isSubAdmin;
        });
        console.log(`Post-filter: ${originalLength} → ${data.length} users (removed ${originalLength - data.length})`);
      }
      
      console.log("Final users count:", data.length);
      console.log("Final user details:", data.map(u => ({ 
        username: u.username, 
        role: u.role,
        email: u.email 
      })));
      console.log("========== EXPORT CSV DEBUG END ==========\n");
      
      // Final verification before generating CSV
      if (role === "client") {
        const nonClients = data.filter(u => u.role !== "client");
        if (nonClients.length > 0) {
          console.error("❌ ERROR: Non-client users found in data:", nonClients.map(u => ({ username: u.username, role: u.role })));
          // Force filter again as absolute safety
          data = data.filter(u => u.role === "client");
          console.log("✓ Force filtered to clients only");
        }
      } else if (role === "sub-admin") {
        const nonSubAdmins = data.filter(u => u.role !== "sub-admin");
        if (nonSubAdmins.length > 0) {
          console.error("❌ ERROR: Non-sub-admin users found in data:", nonSubAdmins.map(u => ({ username: u.username, role: u.role })));
          // Force filter again as absolute safety
          data = data.filter(u => u.role === "sub-admin");
          console.log("✓ Force filtered to sub-admins only");
        }
      }
      
      csvContent = CSVGenerator.generateUsersCSV(data);
      const roleSuffix = role ? `-${role}` : "";
      filename = `users${roleSuffix}-export-${Date.now()}.csv`;
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

/**
 * @desc    Export data as PDF
 * @route   POST /api/admin/export-pdf/:type
 * @access  Private/Admin
 * 
 * Role-Based Filtering:
 * - When role="client" in request body: Returns ONLY users with role="client"
 * - When role="sub-admin" in request body: Returns ONLY users with role="sub-admin"
 * - When no role specified: Returns all active users
 * 
 * Safety Measures:
 * 1. MongoDB query filters by exact role match
 * 2. Post-query JavaScript filter removes any non-matching roles
 * 3. Final verification before PDF generation catches any remaining issues
 * 
 * @param {string} type - Type of data to export: "users", "events", "tickets", etc.
 * @param {string} req.body.role - Optional role filter: "client" or "sub-admin"
 * @param {string} req.body.startDate - Optional start date filter
 * @param {string} req.body.endDate - Optional end date filter
 */
const exportPDF = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { startDate, endDate, role } = req.body;

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
      // Support role filtering via body parameter - if role is specified, ONLY get that role
      // Strictly filter by role to prevent mixing admins/sub-admins with clients
      let userQueryPDF = {};
      
      // ========== DEBUGGING: Export PDF ==========
      console.log("\n========== EXPORT PDF DEBUG START ==========");
      console.log("Request params:", JSON.stringify(req.params));
      console.log("Request body:", JSON.stringify(req.body));
      console.log("Role parameter (extracted):", role);
      console.log("Role type:", typeof role);
      console.log("Role === 'client':", role === "client");
      console.log("Role === 'sub-admin':", role === "sub-admin");
      console.log("Type parameter:", type);
      console.log("Date filter:", JSON.stringify(dateFilter));
      
      // CRITICAL: When role is "client", ONLY get clients - exclude super-admin and sub-admin
      if (role === "client") {
        // Explicitly filter ONLY for clients - exclude all other roles
        userQueryPDF = { role: "client" };
        
        // Apply date filter if provided
        if (Object.keys(dateFilter).length > 0) {
          userQueryPDF = { ...userQueryPDF, ...dateFilter };
        }
        console.log("✓ Using CLIENT filter");
      } else if (role === "sub-admin") {
        // When role is "sub-admin", ONLY get sub-admins
        userQueryPDF = { role: "sub-admin" };
        
        // Apply date filter if provided
        if (Object.keys(dateFilter).length > 0) {
          userQueryPDF = { ...userQueryPDF, ...dateFilter };
        }
        console.log("✓ Using SUB-ADMIN filter");
      } else {
        // Default: get all active users (no role filter)
        userQueryPDF = { isActive: true, ...dateFilter };
        console.log("⚠ Using DEFAULT filter (all active users)");
      }
      
      console.log("Final MongoDB Query:", JSON.stringify(userQueryPDF, null, 2));
      
      // Execute query
      data = await User.find(userQueryPDF).select("-password");
      console.log("Users found BEFORE post-filter:", data.length);
      console.log("Roles BEFORE post-filter:", [...new Set(data.map(u => u.role))]);
      
      // Additional safety check: filter out any non-matching roles in case of data inconsistency
      const originalLength = data.length;
      if (role === "client") {
        data = data.filter(user => {
          const isClient = user.role === "client";
          if (!isClient) {
            console.log(`⚠ FILTERED OUT: ${user.username} (role: ${user.role})`);
          }
          return isClient;
        });
        console.log(`Post-filter: ${originalLength} → ${data.length} users (removed ${originalLength - data.length})`);
      } else if (role === "sub-admin") {
        data = data.filter(user => {
          const isSubAdmin = user.role === "sub-admin";
          if (!isSubAdmin) {
            console.log(`⚠ FILTERED OUT: ${user.username} (role: ${user.role})`);
          }
          return isSubAdmin;
        });
        console.log(`Post-filter: ${originalLength} → ${data.length} users (removed ${originalLength - data.length})`);
      }
      
      console.log("Final users count:", data.length);
      console.log("Final user details:", data.map(u => ({ 
        username: u.username, 
        role: u.role,
        email: u.email 
      })));
      console.log("========== EXPORT PDF DEBUG END ==========\n");
      
      // Final verification before generating PDF
      if (role === "client") {
        const nonClients = data.filter(u => u.role !== "client");
        if (nonClients.length > 0) {
          console.error("❌ ERROR: Non-client users found in data:", nonClients.map(u => ({ username: u.username, role: u.role })));
          // Force filter again as absolute safety
          data = data.filter(u => u.role === "client");
          console.log("✓ Force filtered to clients only");
        }
      } else if (role === "sub-admin") {
        const nonSubAdmins = data.filter(u => u.role !== "sub-admin");
        if (nonSubAdmins.length > 0) {
          console.error("❌ ERROR: Non-sub-admin users found in data:", nonSubAdmins.map(u => ({ username: u.username, role: u.role })));
          // Force filter again as absolute safety
          data = data.filter(u => u.role === "sub-admin");
          console.log("✓ Force filtered to sub-admins only");
        }
      }
      
      const roleSuffix = role ? `-${role}` : "";
      filename = `users${roleSuffix}-report-${Date.now()}.pdf`;
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
