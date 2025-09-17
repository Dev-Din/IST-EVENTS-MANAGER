const express = require("express");
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByCreator,
} = require("../controllers/events");
const { protect, authorize } = require("../middleware/auth");

// Public routes
router.get("/", getEvents);
router.get("/:id", getEvent);

// Protected routes
router.post("/", protect, createEvent);
router.put("/:id", protect, updateEvent);
router.delete("/:id", protect, deleteEvent);
router.get("/creator/:creatorId", protect, getEventsByCreator);

module.exports = router;
