const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [100, "Event title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: [2000, "Event description cannot exceed 2000 characters"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
      validate: {
        validator: function (date) {
          return date > new Date();
        },
        message: "Event date must be in the future",
      },
    },
    location: {
      type: String,
      required: [true, "Event location is required"],
      trim: true,
      maxlength: [200, "Event location cannot exceed 200 characters"],
    },
    price: {
      type: Number,
      required: [true, "Event price is required"],
      min: [0, "Event price cannot be negative"],
    },
    capacity: {
      type: Number,
      required: [true, "Event capacity is required"],
      min: [1, "Event capacity must be at least 1"],
    },
    availableTickets: {
      type: Number,
      default: function () {
        return this.capacity;
      },
    },
    category: {
      type: String,
      required: [true, "Event category is required"],
      enum: [
        "conference",
        "workshop",
        "seminar",
        "concert",
        "festival",
        "sports",
        "networking",
        "other",
      ],
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
    },
    image: {
      type: String,
      default: "event-hero.png",
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
EventSchema.index({ date: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ createdBy: 1 });
EventSchema.index({ isActive: 1 });

// Virtual for sold tickets
EventSchema.virtual("soldTickets").get(function () {
  return this.capacity - this.availableTickets;
});

// Virtual for event status
EventSchema.virtual("isPublished").get(function () {
  return this.status === "published";
});

// Virtual for event availability
EventSchema.virtual("isAvailable").get(function () {
  return this.status === "published" && this.availableTickets > 0;
});

// Pre-save middleware to update available tickets
EventSchema.pre("save", function (next) {
  if (this.isNew) {
    this.availableTickets = this.capacity;
  }
  next();
});

// Static method to get published events
EventSchema.statics.getPublishedEvents = function () {
  return this.find({ status: "published", isActive: true })
    .populate("createdBy", "username fullName")
    .sort({ date: 1 });
};

// Static method to get events by creator
EventSchema.statics.getEventsByCreator = function (creatorId) {
  return this.find({ createdBy: creatorId, isActive: true })
    .populate("createdBy", "username fullName")
    .sort({ createdAt: -1 });
};

// Instance method to update available tickets
EventSchema.methods.updateAvailableTickets = function (ticketsSold) {
  this.availableTickets = Math.max(0, this.availableTickets - ticketsSold);
  return this.save();
};

// Instance method to check if event is full
EventSchema.methods.isFull = function () {
  return this.availableTickets === 0;
};

module.exports = mongoose.model("Event", EventSchema);
