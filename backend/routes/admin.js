const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/admin");
const { protect, authorize } = require("../middleware/auth");

// All routes are protected and require admin access
router.use(protect);
router.use(authorize("super-admin"));

// Sub-admin routes
router.get("/sub-admins", getSubAdmins);
router.post("/sub-admins", createSubAdmin);
router.put("/users/:id", updateSubAdmin);
router.delete("/users/:id", deleteSubAdmin);
router.put("/users/:id/toggle-status", toggleSubAdminStatus);

// Client routes
router.get("/clients", getClients);
router.put("/users/:id/toggle-status", toggleClientStatus);
router.delete("/clients/:id", deleteClient);

// Dashboard and reports
router.get("/dashboard", getDashboardStats);
router.get("/reports", getReports);

// Export routes
router.post("/export/:type", exportCSV);
router.post("/export-pdf/:type", exportPDF);

module.exports = router;
