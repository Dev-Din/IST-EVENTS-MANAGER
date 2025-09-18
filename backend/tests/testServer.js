const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

// Import middleware
const errorHandler = require("../middleware/errorHandler");

// Import routes
const authRoutes = require("../routes/auth");
const eventRoutes = require("../routes/events");
const ticketRoutes = require("../routes/tickets");
const adminRoutes = require("../routes/admin");

const app = express();

// Basic middleware for testing
app.use(cors({ credentials: true }));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
