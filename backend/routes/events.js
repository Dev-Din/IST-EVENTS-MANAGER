const express = require("express");
const { body, query } = require("express-validator");
const {
  protect,
  requireAdmin,
  canModifyEvent,
  optionalAuth,
  requirePermission,
} = require("../middleware/auth");
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getFeaturedEvents,
  searchEvents,
  getEventStats,
  publishEvent,
  unpublishEvent,
} = require("../controllers/events");

const router = express.Router();

// Event validation rules
const eventValidation = [
  body("name")
    .isLength({ min: 3, max: 200 })
    .withMessage("Event name must be between 3 and 200 characters"),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Event description cannot exceed 2000 characters"),
  body("date")
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error("Event date must be in the future");
      }
      return true;
    }),
  body("location")
    .isLength({ min: 3, max: 300 })
    .withMessage("Event location must be between 3 and 300 characters"),
  body("charges")
    .isNumeric({ min: 0, max: 10000 })
    .withMessage("Event charges must be between 0 and 10000"),
  body("capacity")
    .isInt({ min: 1, max: 100000 })
    .withMessage("Event capacity must be between 1 and 100000"),
  body("category")
    .optional()
    .isIn([
      "conference",
      "workshop",
      "seminar",
      "concert",
      "festival",
      "sports",
      "exhibition",
      "networking",
      "other",
    ])
    .withMessage("Invalid event category"),
];

// Public routes
router.get("/featured", getFeaturedEvents);
router.get("/search", searchEvents);
router.get("/", optionalAuth, getEvents);
router.get("/:id", optionalAuth, getEvent);

// Protected routes - require authentication
router.use(protect);

router.get("/user/my-events", getMyEvents);

// Admin only routes
router.use(requireAdmin);

router.post("/", requirePermission("events"), eventValidation, createEvent);
router.put("/:id", canModifyEvent, eventValidation, updateEvent);
router.delete("/:id", canModifyEvent, deleteEvent);
router.get("/:id/stats", requirePermission("reports"), getEventStats);
router.put("/:id/publish", canModifyEvent, publishEvent);
router.put("/:id/unpublish", canModifyEvent, unpublishEvent);

module.exports = router;
