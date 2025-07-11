const crypto = require("crypto");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { username, email, password, fullName, phone, country, role } =
    req.body;

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

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    fullName,
    phone,
    country,
    role: role || "client", // Default to client role
  });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(20).toString("hex");
  user.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  console.log(`Email verification token: ${verificationToken}`);

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { identifier, password } = req.body;

  try {
    const user = await User.authenticate(identifier, password);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("-password");

  res.status(200).json({
    success: true,
    user,
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    fullName: req.body.fullName,
    phone: req.body.phone,
    country: req.body.country,
    preferences: req.body.preferences,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach((key) => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    user,
  });
});

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
const updatePreferences = asyncHandler(async (req, res, next) => {
  const { notifications, language, timezone } = req.body;

  const preferencesToUpdate = {};
  if (notifications)
    preferencesToUpdate["preferences.notifications"] = notifications;
  if (language) preferencesToUpdate["preferences.language"] = language;
  if (timezone) preferencesToUpdate["preferences.timezone"] = timezone;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: preferencesToUpdate },
    { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    message: "Preferences updated successfully",
    user,
  });
});

// @desc    Get user profile stats
// @route   GET /api/auth/profile-stats
// @access  Private
const getProfileStats = asyncHandler(async (req, res, next) => {
  const Ticket = require("../models/Ticket");
  const Event = require("../models/Event");

  let stats = {
    totalTickets: 0,
    upcomingEvents: 0,
    totalSpent: 0,
    recentActivity: [],
  };

  // Get user's tickets
  const tickets = await Ticket.find({
    user: req.user.id,
  })
    .populate("event", "name date location")
    .sort({ createdAt: -1 });

  stats.totalTickets = tickets.length;
  stats.totalSpent = tickets.reduce(
    (sum, ticket) => sum + ticket.totalAmount,
    0
  );

  // Count upcoming events
  const upcomingEvents = tickets.filter(
    (ticket) => ticket.event && new Date(ticket.event.date) > new Date()
  );
  stats.upcomingEvents = upcomingEvents.length;

  // Recent activity (last 5 ticket purchases)
  stats.recentActivity = tickets.slice(0, 5).map((ticket) => ({
    type: "ticket_purchase",
    eventName: ticket.event?.name || "Unknown Event",
    date: ticket.createdAt,
    amount: ticket.totalAmount,
    currency: ticket.currency,
  }));

  res.status(200).json({
    success: true,
    stats,
  });
});

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required to delete account",
    });
  }

  // Get user with password
  const user = await User.findById(req.user.id).select("+password");

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Incorrect password",
    });
  }

  // Soft delete - set inactive instead of hard delete to preserve data integrity
  await User.findByIdAndUpdate(req.user.id, {
    isActive: false,
    email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
    username: `deleted_${Date.now()}_${user.username}`, // Prevent username conflicts
  });

  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "No user found with that email",
    });
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/auth/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    // TODO: Send email
    console.log(`Password reset URL: ${resetUrl}`);

    res.status(200).json({
      success: true,
      message: "Email sent with password reset instructions",
    });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message: "Email could not be sent",
    });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
    });
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res, next) => {
  const emailVerificationToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken,
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification token",
    });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updatePreferences,
  getProfileStats,
  deleteAccount,
};
