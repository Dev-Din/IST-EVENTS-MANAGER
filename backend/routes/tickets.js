const express = require("express");
const router = express.Router();
const {
  purchaseTickets,
  getMyTickets,
  getTicketsByEvent,
  cancelTicket,
  downloadTicketPDF,
  downloadAllTicketsPDF,
} = require("../controllers/tickets");
const { protect } = require("../middleware/auth");

// All routes are protected
router.post("/purchase", protect, purchaseTickets);
router.get("/my-tickets", protect, getMyTickets);
router.get("/event/:eventId", protect, getTicketsByEvent);
router.put("/:id/cancel", protect, cancelTicket);
router.get("/:id/download", protect, downloadTicketPDF);
router.get("/download-all", protect, downloadAllTicketsPDF);

module.exports = router;
