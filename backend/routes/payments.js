const express = require("express");
const router = express.Router();
const {
  initiateMpesaPayment,
  handleMpesaCallback,
  queryMpesaStatus,
  getPaymentHistory
} = require("../controllers/payments");
const { protect } = require("../middleware/auth");

// M-Pesa payment routes
router.post("/mpesa/initiate", protect, initiateMpesaPayment);
router.post("/mpesa/callback", handleMpesaCallback); // Public route for M-Pesa callbacks
router.get("/mpesa/status/:checkoutRequestID", protect, queryMpesaStatus);

// Payment history
router.get("/history", protect, getPaymentHistory);

module.exports = router;
