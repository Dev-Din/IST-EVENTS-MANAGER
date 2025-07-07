const express = require("express");
const { body } = require("express-validator");
const {
  protect,
  requireSuperAdmin,
  requireAdmin,
  requirePermission,
} = require("../middleware/auth");
const {
  getUsers,
  getUser,
  createSubAdmin,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getSubAdmins,
  getClients,
  getDashboardStats,
  getReports,
  exportData,
} = require("../controllers/admin");

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(requireAdmin);

// User validation rules
const createSubAdminValidation = [
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
    .withMessage("Password must be at least 6 characters"),
  body("fullName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Full name cannot exceed 100 characters"),
  body("permissions")
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((permissions) => {
      const validPermissions = ["events", "tickets", "reports", "clients"];
      return permissions.every((permission) =>
        validPermissions.includes(permission)
      );
    })
    .withMessage("Invalid permissions provided"),
];

// Dashboard and statistics
router.get("/dashboard", getDashboardStats);

// User management routes
router.get("/users", requirePermission("clients"), getUsers);
router.get("/users/:id", requirePermission("clients"), getUser);
router.put("/users/:id", requirePermission("clients"), updateUser);
router.delete("/users/:id", requireSuperAdmin, deleteUser);
router.put(
  "/users/:id/toggle-status",
  requirePermission("clients"),
  toggleUserStatus
);

// Sub-admin specific routes (Super Admin only)
router.get("/sub-admins", requireSuperAdmin, getSubAdmins);
router.post(
  "/sub-admins",
  requireSuperAdmin,
  createSubAdminValidation,
  createSubAdmin
);

// Client management routes
router.get("/clients", requirePermission("clients"), getClients);

// Reports and analytics
router.get("/reports", requirePermission("reports"), getReports);
router.post("/export/:dataType", requirePermission("reports"), exportData);

module.exports = router;
