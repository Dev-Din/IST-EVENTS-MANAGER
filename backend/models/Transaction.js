const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    // M-Pesa specific fields
    checkoutRequestID: {
      type: String,
      required: false, // Will be set after STK Push response
      trim: true,
    },
    merchantRequestID: {
      type: String,
      required: false, // Will be set after STK Push response
      trim: true,
    },
    mpesaReceiptNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when present
    },

    // Transaction details
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "KES",
      enum: ["KES", "UGX", "TZS", "RWF", "ETB", "BIF", "USD"],
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Transaction status
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    resultCode: {
      type: Number,
    },
    resultDesc: {
      type: String,
      trim: true,
    },

    // Related entities
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },

    // Transaction metadata
    accountReference: {
      type: String,
      required: true,
      trim: true,
    },
    transactionDesc: {
      type: String,
      required: true,
      trim: true,
    },
    transactionDate: {
      type: Date,
    },

    // Callback data
    callbackData: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
TransactionSchema.index(
  { checkoutRequestID: 1 },
  { sparse: true, unique: true }
);
TransactionSchema.index({ merchantRequestID: 1 }, { sparse: true });
TransactionSchema.index({ mpesaReceiptNumber: 1 }, { sparse: true });
TransactionSchema.index({ user: 1 });
TransactionSchema.index({ ticket: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ phoneNumber: 1 });
TransactionSchema.index({ initiatedAt: -1 });

// Virtual for transaction duration
TransactionSchema.virtual("duration").get(function () {
  if (this.completedAt && this.initiatedAt) {
    return this.completedAt - this.initiatedAt;
  }
  return null;
});

// Virtual for transaction success
TransactionSchema.virtual("isSuccessful").get(function () {
  return this.status === "success" && this.resultCode === 0;
});

// Static method to get transactions by user
TransactionSchema.statics.getTransactionsByUser = function (userId) {
  return this.find({ user: userId })
    .populate("ticket", "ticketNumber quantity totalPrice")
    .populate("event", "title date location")
    .sort({ initiatedAt: -1 });
};

// Static method to get transactions by status
TransactionSchema.statics.getTransactionsByStatus = function (status) {
  return this.find({ status })
    .populate("user", "username email fullName")
    .populate("ticket", "ticketNumber")
    .populate("event", "title")
    .sort({ initiatedAt: -1 });
};

// Instance method to mark transaction as successful
TransactionSchema.methods.markSuccessful = function (callbackData) {
  this.status = "success";
  this.resultCode = callbackData.resultCode || 0;
  this.resultDesc = callbackData.resultDesc || "Success";
  this.mpesaReceiptNumber = callbackData.mpesaReceiptNumber;
  this.completedAt = new Date();
  this.callbackData = callbackData;
  return this.save();
};

// Instance method to mark transaction as failed
TransactionSchema.methods.markFailed = function (
  resultCode,
  resultDesc,
  callbackData
) {
  this.status = "failed";
  this.resultCode = resultCode;
  this.resultDesc = resultDesc;
  this.completedAt = new Date();
  this.callbackData = callbackData;
  return this.save();
};

// Instance method to cancel transaction
TransactionSchema.methods.cancel = function () {
  this.status = "cancelled";
  this.completedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Transaction", TransactionSchema);
