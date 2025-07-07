const mongoose = require("mongoose");
const crypto = require("crypto");

const TicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event is required"],
    },
    purchaser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Purchaser is required"],
    },
    attendee: {
      fullName: {
        type: String,
        required: [true, "Attendee full name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Attendee email is required"],
        lowercase: true,
        match: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          "Please enter a valid email",
        ],
      },
      phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
      },
      specialRequirements: String,
    },
    quantity: {
      type: Number,
      required: [true, "Ticket quantity is required"],
      min: [1, "Quantity must be at least 1"],
      max: [10, "Cannot purchase more than 10 tickets at once"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Price cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    ticketType: {
      type: String,
      enum: ["regular", "earlybird", "vip", "group", "student", "senior"],
      default: "regular",
    },
    paymentDetails: {
      method: {
        type: String,
        enum: [
          "credit_card",
          "debit_card",
          "paypal",
          "bank_transfer",
          "cash",
          "free",
        ],
        required: true,
      },
      transactionId: String,
      paymentProcessor: String,
      currency: {
        type: String,
        default: "USD",
      },
      fees: {
        processingFee: { type: Number, default: 0 },
        serviceFee: { type: Number, default: 0 },
        taxes: { type: Number, default: 0 },
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "refunded",
        "used",
        "expired",
      ],
      default: "pending",
    },
    qrCode: {
      type: String,
      unique: true,
    },
    barcode: {
      type: String,
      unique: true,
    },
    seatInfo: {
      section: String,
      row: String,
      seat: String,
      isAssigned: { type: Boolean, default: false },
    },
    checkInDetails: {
      checkedIn: { type: Boolean, default: false },
      checkInTime: Date,
      checkInBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      location: String,
    },
    discounts: [
      {
        code: String,
        type: { type: String, enum: ["percentage", "fixed"] },
        amount: Number,
        description: String,
      },
    ],
    metadata: {
      source: { type: String, default: "web" }, // web, mobile, api, admin
      userAgent: String,
      ipAddress: String,
      referrer: String,
    },
    notes: String,
    tags: [String],
    isTransferable: {
      type: Boolean,
      default: true,
    },
    transferHistory: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        to: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        transferDate: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    refundDetails: {
      refundAmount: Number,
      refundDate: Date,
      refundReason: String,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderSent: Date,
    validFrom: Date,
    validUntil: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
TicketSchema.index({ event: 1, status: 1 });
TicketSchema.index({ purchaser: 1 });
TicketSchema.index({ ticketNumber: 1 });
TicketSchema.index({ qrCode: 1 });
TicketSchema.index({ "attendee.email": 1 });
TicketSchema.index({ createdAt: -1 });

// Virtual for is ticket valid
TicketSchema.virtual("isValid").get(function () {
  const now = new Date();
  return (
    this.status === "confirmed" &&
    (!this.validFrom || this.validFrom <= now) &&
    (!this.validUntil || this.validUntil >= now)
  );
});

// Virtual for can be refunded
TicketSchema.virtual("canBeRefunded").get(function () {
  const now = new Date();
  const refundDeadline = new Date(this.event.date);
  refundDeadline.setHours(refundDeadline.getHours() - 24); // 24 hours before event

  return (
    this.status === "confirmed" &&
    now < refundDeadline &&
    this.event.refundPolicy !== "none"
  );
});

// Virtual for time until event
TicketSchema.virtual("timeUntilEvent").get(function () {
  const now = new Date();
  const eventDate = new Date(this.event.date);
  return eventDate - now;
});

// Pre-save middleware to generate ticket number and codes
TicketSchema.pre("save", function (next) {
  if (this.isNew) {
    // Generate unique ticket number
    if (!this.ticketNumber) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      this.ticketNumber = `TKT-${timestamp}-${random}`.toUpperCase();
    }

    // Generate QR code data
    if (!this.qrCode) {
      this.qrCode = crypto.randomBytes(32).toString("hex");
    }

    // Generate barcode
    if (!this.barcode) {
      this.barcode = crypto.randomBytes(16).toString("hex");
    }

    // Set validity period
    if (!this.validFrom) {
      this.validFrom = new Date();
    }

    if (!this.validUntil && this.event) {
      // Valid until 2 hours after event end time (or event date + 6 hours if no end time)
      this.validUntil = new Date(this.event.date);
      this.validUntil.setHours(this.validUntil.getHours() + 6);
    }
  }

  next();
});

// Pre-save middleware to calculate total amount
TicketSchema.pre("save", function (next) {
  if (
    this.isModified("quantity") ||
    this.isModified("unitPrice") ||
    this.isNew
  ) {
    this.totalAmount = this.quantity * this.unitPrice;

    // Add fees
    if (this.paymentDetails && this.paymentDetails.fees) {
      this.totalAmount += this.paymentDetails.fees.processingFee || 0;
      this.totalAmount += this.paymentDetails.fees.serviceFee || 0;
      this.totalAmount += this.paymentDetails.fees.taxes || 0;
    }

    // Apply discounts
    if (this.discounts && this.discounts.length > 0) {
      this.discounts.forEach((discount) => {
        if (discount.type === "percentage") {
          this.totalAmount -= (this.totalAmount * discount.amount) / 100;
        } else if (discount.type === "fixed") {
          this.totalAmount -= discount.amount;
        }
      });
    }

    // Ensure total amount is not negative
    this.totalAmount = Math.max(0, this.totalAmount);
  }

  next();
});

// Instance methods
TicketSchema.methods.confirm = function () {
  this.status = "confirmed";
  return this.save();
};

TicketSchema.methods.cancel = function (reason) {
  this.status = "cancelled";
  this.notes = reason || "Cancelled by user";
  return this.save();
};

TicketSchema.methods.refund = function (amount, reason, processedBy) {
  this.status = "refunded";
  this.refundDetails = {
    refundAmount: amount,
    refundDate: new Date(),
    refundReason: reason,
    processedBy: processedBy,
  };
  return this.save();
};

TicketSchema.methods.checkIn = function (checkInBy, location) {
  if (this.checkInDetails.checkedIn) {
    throw new Error("Ticket has already been checked in");
  }

  if (this.status !== "confirmed") {
    throw new Error("Only confirmed tickets can be checked in");
  }

  if (!this.isValid) {
    throw new Error("Ticket is not valid for check-in");
  }

  this.checkInDetails = {
    checkedIn: true,
    checkInTime: new Date(),
    checkInBy: checkInBy,
    location: location || "Main entrance",
  };

  this.status = "used";
  return this.save();
};

TicketSchema.methods.transfer = function (newOwner, reason) {
  if (!this.isTransferable) {
    throw new Error("This ticket is not transferable");
  }

  if (this.status !== "confirmed") {
    throw new Error("Only confirmed tickets can be transferred");
  }

  this.transferHistory.push({
    from: this.purchaser,
    to: newOwner,
    reason: reason,
  });

  this.purchaser = newOwner;
  return this.save();
};

TicketSchema.methods.sendReminder = function () {
  this.remindersSent += 1;
  this.lastReminderSent = new Date();
  return this.save({ validateBeforeSave: false });
};

TicketSchema.methods.generateQRCodeData = function () {
  return JSON.stringify({
    ticketNumber: this.ticketNumber,
    eventId: this.event,
    attendee: this.attendee.email,
    qrCode: this.qrCode,
  });
};

// Static methods
TicketSchema.statics.findByTicketNumber = function (ticketNumber) {
  return this.findOne({ ticketNumber }).populate("event purchaser");
};

TicketSchema.statics.findByQRCode = function (qrCode) {
  return this.findOne({ qrCode }).populate("event purchaser");
};

TicketSchema.statics.getEventTickets = function (eventId, status = null) {
  const query = { event: eventId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate("purchaser", "username email fullName");
};

TicketSchema.statics.getUserTickets = function (userId, status = null) {
  const query = { purchaser: userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate("event", "name date location");
};

TicketSchema.statics.getTicketsSoldForEvent = function (eventId) {
  return this.aggregate([
    {
      $match: {
        event: mongoose.Types.ObjectId(eventId),
        status: { $in: ["confirmed", "used"] },
      },
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);
};

TicketSchema.statics.getSalesAnalytics = function (dateFrom, dateTo) {
  const matchStage = {
    status: { $in: ["confirmed", "used"] },
    createdAt: {
      $gte: new Date(dateFrom),
      $lte: new Date(dateTo),
    },
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalTickets: { $sum: "$quantity" },
        totalRevenue: { $sum: "$totalAmount" },
        uniqueEvents: { $addToSet: "$event" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);
};

TicketSchema.statics.getUpcomingTickets = function (userId) {
  return this.find({
    purchaser: userId,
    status: { $in: ["confirmed", "pending"] },
  })
    .populate({
      path: "event",
      match: { date: { $gte: new Date() } },
    })
    .then((tickets) => tickets.filter((ticket) => ticket.event));
};

module.exports = mongoose.model("Ticket", TicketSchema);
