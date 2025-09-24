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
  testSTKPush,
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

// Payment history (legacy)
router.get("/history", protect, getPaymentHistory);

module.exports = router;
