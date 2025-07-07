const mongoose = require("mongoose");
const {
  EVENT_CURRENCIES,
  DEFAULT_EVENT_CURRENCY,
} = require("../utils/eastAfricanCountries");

const EventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      maxlength: [200, "Event name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Event description cannot exceed 2000 characters"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Event date must be in the future",
      },
    },
    location: {
      type: String,
      required: [true, "Event location is required"],
      trim: true,
      maxlength: [300, "Event location cannot exceed 300 characters"],
    },
    charges: {
      type: Number,
      required: [true, "Event charges are required"],
      min: [0, "Event charges cannot be negative"],
      max: [10000000, "Event charges cannot exceed 10,000,000"],
    },
    category: {
      type: String,
      enum: [
        "conference",
        "workshop",
        "seminar",
        "concert",
        "festival",
        "sports",
        "exhibition",
        "networking",
        "other",
      ],
      default: "other",
    },
    capacity: {
      type: Number,
      required: [true, "Event capacity is required"],
      min: [1, "Event capacity must be at least 1"],
      max: [100000, "Event capacity cannot exceed 100,000"],
    },
    availableTickets: {
      type: Number,
      default: function () {
        return this.capacity;
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "draft",
    },
    images: [
      {
        url: String,
        alt: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    organizer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      website: String,
    },
    venue: {
      name: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      capacity: Number,
      facilities: [String],
    },
    schedule: [
      {
        startTime: Date,
        endTime: Date,
        title: String,
        description: String,
        speaker: String,
      },
    ],
    requirements: {
      ageLimit: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 120 },
      },
      specialRequirements: [String],
      accessibilityFeatures: [String],
    },
    currency: {
      type: String,
      enum: EVENT_CURRENCIES.map((c) => c.code),
      default: DEFAULT_EVENT_CURRENCY.code,
      required: [true, "Currency is required"],
    },
    pricing: {
      earlyBird: {
        price: Number,
        deadline: Date,
      },
      vip: {
        price: Number,
        benefits: [String],
      },
      group: {
        minSize: Number,
        discount: Number,
      },
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      website: String,
    },
    analytics: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      ticketsSold: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: Date,
    cancellationReason: String,
    refundPolicy: {
      type: String,
      enum: ["full", "partial", "none"],
      default: "partial",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringDetails: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      endDate: Date,
      daysOfWeek: [Number], // 0 = Sunday, 1 = Monday, etc.
      monthlyPattern: {
        type: String,
        enum: ["date", "day"], // repeat on same date or same day of month
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
EventSchema.index({ date: 1, status: 1 });
EventSchema.index({ location: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ createdBy: 1 });
EventSchema.index({ name: "text", description: "text", location: "text" });
EventSchema.index({ "venue.coordinates": "2dsphere" });

// Virtual for tickets sold percentage
EventSchema.virtual("ticketsSoldPercentage").get(function () {
  return ((this.capacity - this.availableTickets) / this.capacity) * 100;
});

// Virtual for time until event
EventSchema.virtual("timeUntilEvent").get(function () {
  const now = new Date();
  const eventDate = new Date(this.date);
  return eventDate - now;
});

// Virtual for event duration
EventSchema.virtual("duration").get(function () {
  if (this.schedule && this.schedule.length > 0) {
    const firstSession = this.schedule[0];
    const lastSession = this.schedule[this.schedule.length - 1];
    return new Date(lastSession.endTime) - new Date(firstSession.startTime);
  }
  return null;
});

// Virtual for is past event
EventSchema.virtual("isPastEvent").get(function () {
  return new Date(this.date) < new Date();
});

// Virtual for is upcoming event
EventSchema.virtual("isUpcoming").get(function () {
  const now = new Date();
  const eventDate = new Date(this.date);
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return eventDate > now && eventDate - now <= oneWeek;
});

// Pre-save middleware
EventSchema.pre("save", function (next) {
  // Set publishedAt when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // Ensure availableTickets doesn't exceed capacity
  if (this.availableTickets > this.capacity) {
    this.availableTickets = this.capacity;
  }

  // Update analytics when tickets are sold
  if (this.isModified("availableTickets")) {
    const ticketsSold = this.capacity - this.availableTickets;
    this.analytics.ticketsSold = ticketsSold;
    this.analytics.revenue = ticketsSold * this.charges;
  }

  next();
});

// Pre-save middleware for validation
EventSchema.pre("save", function (next) {
  // Validate schedule times
  if (this.schedule && this.schedule.length > 0) {
    for (let i = 0; i < this.schedule.length; i++) {
      const session = this.schedule[i];
      if (session.startTime >= session.endTime) {
        return next(new Error("Session start time must be before end time"));
      }
      // Check if session is on the same day as event
      const sessionDate = new Date(session.startTime).toDateString();
      const eventDate = new Date(this.date).toDateString();
      if (sessionDate !== eventDate) {
        return next(
          new Error("All sessions must be on the same day as the event")
        );
      }
    }
  }

  // Validate early bird pricing
  if (
    this.pricing &&
    this.pricing.earlyBird &&
    this.pricing.earlyBird.deadline
  ) {
    if (new Date(this.pricing.earlyBird.deadline) >= new Date(this.date)) {
      return next(new Error("Early bird deadline must be before event date"));
    }
  }

  next();
});

// Instance methods
EventSchema.methods.sellTickets = function (quantity) {
  if (quantity <= 0) {
    throw new Error("Ticket quantity must be positive");
  }

  if (this.availableTickets < quantity) {
    throw new Error("Not enough tickets available");
  }

  this.availableTickets -= quantity;
  return this.save();
};

EventSchema.methods.refundTickets = function (quantity) {
  if (quantity <= 0) {
    throw new Error("Refund quantity must be positive");
  }

  const maxRefund = this.capacity - this.availableTickets;
  if (quantity > maxRefund) {
    throw new Error("Cannot refund more tickets than were sold");
  }

  this.availableTickets += quantity;
  return this.save();
};

EventSchema.methods.incrementViews = function () {
  this.analytics.views += 1;
  return this.save({ validateBeforeSave: false });
};

EventSchema.methods.canBeModified = function () {
  return (
    this.status === "draft" ||
    (this.status === "published" && new Date(this.date) > new Date())
  );
};

EventSchema.methods.canBeCancelled = function () {
  return (
    ["draft", "published"].includes(this.status) &&
    new Date(this.date) > new Date()
  );
};

// Static methods
EventSchema.statics.getPublicEvents = function (filter = {}) {
  return this.find({
    ...filter,
    status: "published",
    isPublic: true,
    date: { $gte: new Date() },
  }).sort({ date: 1 });
};

EventSchema.statics.getFeaturedEvents = function (limit = 6) {
  return this.find({
    status: "published",
    isPublic: true,
    isFeatured: true,
    date: { $gte: new Date() },
  })
    .limit(limit)
    .sort({ date: 1 });
};

EventSchema.statics.getEventsByCategory = function (category) {
  return this.find({
    category,
    status: "published",
    isPublic: true,
    date: { $gte: new Date() },
  }).sort({ date: 1 });
};

EventSchema.statics.searchEvents = function (query, options = {}) {
  const searchQuery = {
    $and: [
      {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { location: { $regex: query, $options: "i" } },
          { tags: { $in: [new RegExp(query, "i")] } },
        ],
      },
      {
        status: "published",
        isPublic: true,
        date: { $gte: new Date() },
      },
    ],
  };

  if (options.category) {
    searchQuery.$and.push({ category: options.category });
  }

  if (options.location) {
    searchQuery.$and.push({
      location: { $regex: options.location, $options: "i" },
    });
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    const priceQuery = {};
    if (options.minPrice !== undefined) priceQuery.$gte = options.minPrice;
    if (options.maxPrice !== undefined) priceQuery.$lte = options.maxPrice;
    searchQuery.$and.push({ charges: priceQuery });
  }

  if (options.dateFrom || options.dateTo) {
    const dateQuery = {};
    if (options.dateFrom) dateQuery.$gte = new Date(options.dateFrom);
    if (options.dateTo) dateQuery.$lte = new Date(options.dateTo);
    searchQuery.$and.push({ date: dateQuery });
  }

  return this.find(searchQuery).sort({ date: 1 });
};

EventSchema.statics.getEventsByCreator = function (creatorId) {
  return this.find({ createdBy: creatorId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("Event", EventSchema);
