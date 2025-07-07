const express = require("express");
const { body } = require("express-validator");
const {
  protect,
  requireAdmin,
  requireOwnership,
  requirePermission,
} = require("../middleware/auth");
const {
  purchaseTicket,
  getUserTickets,
  getTicket,
  cancelTicket,
  checkInTicket,
  getEventTickets,
  refundTicket,
  transferTicket,
} = require("../controllers/tickets");

const router = express.Router();

// Ticket purchase validation
const purchaseValidation = [
  body("eventId").isMongoId().withMessage("Valid event ID is required"),
  body("quantity")
    .isInt({ min: 1, max: 10 })
    .withMessage("Quantity must be between 1 and 10"),
  body("attendee.fullName")
    .isLength({ min: 2, max: 100 })
    .withMessage("Attendee full name is required"),
  body("attendee.email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid attendee email is required"),
  body("paymentDetails.method")
    .isIn([
      "credit_card",
      "debit_card",
      "paypal",
      "mpesa",
      "bank_transfer",
      "cash",
    ])
    .withMessage("Valid payment method is required"),
];

// Protected routes - require authentication
router.use(protect);

// Customer routes
router.post("/purchase", purchaseValidation, purchaseTicket);
router.get("/my-tickets", getUserTickets);
router.get("/:id", getTicket);
router.put("/:id/cancel", cancelTicket);
router.put("/:id/transfer", transferTicket);

// Admin routes
router.get("/event/:eventId", requirePermission("tickets"), getEventTickets);
router.put("/:id/checkin", requireAdmin, checkInTicket);
router.put("/:id/refund", requireAdmin, refundTicket);

module.exports = router;
