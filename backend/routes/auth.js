const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword,
  verifyTempCredentials,
} = require("../controllers/auth");
const { protect, passwordResetRateLimit } = require("../middleware/auth");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Password reset routes (public with rate limiting)
router.post("/forgot-password", passwordResetRateLimit(), forgotPassword);
router.put("/reset-password/:resettoken", resetPassword);
router.post("/verify-temp-credentials", verifyTempCredentials);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
router.post("/logout", protect, logout);

module.exports = router;
