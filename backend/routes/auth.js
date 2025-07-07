const express = require("express");
const { body } = require("express-validator");
const { protect, authRateLimit } = require("../middleware/auth");
const {
  EAST_AFRICAN_COUNTRIES,
  validatePhoneNumber,
} = require("../utils/eastAfricanCountries");
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require("../controllers/auth");

const router = express.Router();

// Validation rules
const registerValidation = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .isAlphanumeric()
    .withMessage("Username must contain only letters and numbers"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  body("country")
    .notEmpty()
    .withMessage("Country selection is required")
    .isIn(EAST_AFRICAN_COUNTRIES.map((c) => c.code))
    .withMessage("Please select a valid East African country"),
  body("phone")
    .optional()
    .custom((value, { req }) => {
      if (value && !validatePhoneNumber(value, req.body.country)) {
        const country = EAST_AFRICAN_COUNTRIES.find(
          (c) => c.code === req.body.country
        );
        const exampleNumber = country
          ? country.exampleNumber
          : "+254 712 345 678";
        throw new Error(
          `Please provide a valid East African phone number (e.g., ${exampleNumber})`
        );
      }
      return true;
    }),
];

const loginValidation = [
  body("identifier").notEmpty().withMessage("Email or username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const updatePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

const resetPasswordValidation = [
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

// Public routes
router.post(
  "/register",
  authRateLimit(20, 15 * 60 * 1000),
  registerValidation,
  register
);
router.post(
  "/login",
  authRateLimit(20, 15 * 60 * 1000),
  loginValidation,
  login
);
router.post(
  "/forgot-password",
  authRateLimit(3, 60 * 60 * 1000),
  forgotPasswordValidation,
  forgotPassword
);
router.put(
  "/reset-password/:resetToken",
  resetPasswordValidation,
  resetPassword
);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.use(protect); // All routes below require authentication

router.get("/me", getMe);
router.put("/profile", updateProfile);
router.put("/password", updatePasswordValidation, updatePassword);
router.post("/logout", authRateLimit(100, 15 * 60 * 1000), protect, logout);

module.exports = router;
