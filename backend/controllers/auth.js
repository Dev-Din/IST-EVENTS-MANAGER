const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const emailService = require("../utils/emailService");
const crypto = require("crypto");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { username, email, password, fullName, phone, country } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });

  if (existingUser) {
    return next(new ErrorResponse("User already exists", 400));
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    fullName,
    phone,
    country,
  });

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Set token as cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Allow cross-origin in dev
  };

  res.cookie("token", token, options);

  // Send welcome email (don't block response)
  emailService
    .sendWelcomeEmail(user)
    .catch((err) => console.error("Failed to send welcome email:", err));

  // Send admin notification (don't block response)
  emailService
    .sendAdminNotificationEmail(user)
    .catch((err) => console.error("Failed to send admin notification:", err));

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      country: user.country,
      currency: user.currency,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // Check for user
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Set token as cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Allow cross-origin in dev
  };

  res.cookie("token", token, options);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      country: user.country,
      currency: user.currency,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      country: user.country,
      currency: user.currency,
      phone: user.phone,
      avatar: user.avatar,
      preferences: user.preferences,
    },
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

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      country: user.country,
      currency: user.currency,
      phone: user.phone,
      avatar: user.avatar,
      preferences: user.preferences,
    },
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = user.getSignedJwtToken();

  // Set token as cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Allow cross-origin in dev
  };

  res.cookie("token", token, options);

  res.json({
    success: true,
    message: "Password updated successfully",
    token,
  });
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
    message: "User logged out successfully",
  });
});

// @desc    Forgot password - Clients and Sub-admins only
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse("Please provide an email address", 400));
  }

  // Find user and check if they're eligible for password reset
  const user = await User.findOne({
    email: email.toLowerCase(),
    role: { $in: ["client", "sub-admin"] }, // Only clients and sub-admins
    isActive: true,
  });

  if (!user) {
    return next(
      new ErrorResponse("No eligible user found with that email", 404)
    );
  }

  // Generate new temporary password
  const tempPassword = crypto.randomBytes(8).toString("hex");

  // Generate reset token for verification
  const resetToken = user.getResetPasswordToken();

  // Update user with temporary password and reset token
  user.password = tempPassword;
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Create reset URL for password change
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    // Send email with new credentials
    await emailService.sendNewCredentialsEmail(user, tempPassword, resetUrl);

    res.status(200).json({
      success: true,
      message: "New login credentials have been sent to your email",
    });
  } catch (error) {
    console.error("Password reset email error:", error);

    // Clear reset token if email fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

// @desc    Reset password with new password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new ErrorResponse("Please provide a new password", 400));
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
    role: { $in: ["client", "sub-admin"] }, // Only clients and sub-admins
  });

  if (!user) {
    return next(new ErrorResponse("Invalid or expired reset token", 400));
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Set token as cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  res.cookie("token", token, options);

  res.status(200).json({
    success: true,
    message: "Password reset successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      country: user.country,
      currency: user.currency,
    },
  });
});

// @desc    Verify temporary credentials
// @route   POST /api/auth/verify-temp-credentials
// @access  Public
const verifyTempCredentials = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse("Please provide email and password", 400));
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    role: { $in: ["client", "sub-admin"] },
    isActive: true,
  }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if this is a temporary password (has reset token)
  if (!user.resetPasswordToken || user.resetPasswordExpire < Date.now()) {
    return next(new ErrorResponse("Temporary credentials have expired", 401));
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Set token as cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  res.cookie("token", token, options);

  res.status(200).json({
    success: true,
    message: "Temporary credentials verified. Please change your password.",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      country: user.country,
      currency: user.currency,
    },
    requiresPasswordChange: true,
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword,
  verifyTempCredentials,
};
