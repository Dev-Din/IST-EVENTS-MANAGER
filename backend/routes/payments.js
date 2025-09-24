const express = require("express");
const router = express.Router();
const {
  initiateMpesaPayment,
  handleMpesaCallback,
  queryMpesaStatus,
  getPaymentHistory,
  testMpesaConnection,
  getTransactionDetails,
  getTransactionHistory,
  getTransactionLogs,
  getTransactionSummary,
  getTransactionsByPhone,
  getTransactionsByStatus,
  testSTKPush,
  exportTransactionLogsPDF,
  exportTransactionLogsCSV,
} = require("../controllers/payments");
const { protect } = require("../middleware/auth");

// M-Pesa payment routes
router.post("/mpesa/initiate", initiateMpesaPayment); // Temporarily removed auth for testing
router.post("/mpesa/callback", handleMpesaCallback); // Public route for M-Pesa callbacks
router.post("/mpesa/test-stk", testSTKPush); // Public route for testing STK Push with hardcoded phone
router.get("/mpesa/status/:checkoutRequestID", queryMpesaStatus); // Temporarily remove auth for testing
router.get("/mpesa/test", testMpesaConnection); // Temporarily remove auth for testing

// Transaction routes
router.get("/transaction/:transactionId", protect, getTransactionDetails);
router.get("/transactions", protect, getTransactionHistory);

// Transaction logs routes (for viewing JSON logs)
router.get("/logs", getTransactionLogs); // Public route for viewing transaction logs
router.get("/logs/summary", getTransactionSummary); // Public route for transaction summary
router.get("/logs/phone/:phoneNumber", getTransactionsByPhone); // Public route for transactions by phone
router.get("/logs/status/:status", getTransactionsByStatus); // Public route for transactions by status

// Export routes
router.get("/logs/export/pdf", exportTransactionLogsPDF);
router.get("/logs/export/csv", exportTransactionLogsCSV);

// Payment history (legacy)
router.get("/history", protect, getPaymentHistory);

module.exports = router;
