const express = require("express");
const router = express.Router();
const {
  purchaseTickets,
  getMyTickets,
  getTicketsByEvent,
  cancelTicket,
} = require("../controllers/tickets");
const { protect } = require("../middleware/auth");

// All routes are protected
router.post("/purchase", protect, purchaseTickets);
router.get("/my-tickets", protect, getMyTickets);
router.get("/event/:eventId", protect, getTicketsByEvent);
router.put("/:id/cancel", protect, cancelTicket);

module.exports = router;
