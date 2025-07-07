const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  EAST_AFRICAN_COUNTRIES,
  DEFAULT_COUNTRY,
  validatePhoneNumber,
  EAST_AFRICAN_PHONE_PATTERN,
} = require("../utils/eastAfricanCountries");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (phone) {
          if (!phone) return true; // Phone is optional
          return EAST_AFRICAN_PHONE_PATTERN.test(phone.replace(/\s/g, ""));
        },
        message:
          "Please enter a valid East African phone number (e.g., +254 712 345 678)",
      },
    },
    country: {
      type: String,
      enum: EAST_AFRICAN_COUNTRIES.map((c) => c.code),
      default: DEFAULT_COUNTRY.code,
      required: [true, "Country selection is required"],
    },
    currency: {
      type: String,
      default: function () {
        const country = EAST_AFRICAN_COUNTRIES.find(
          (c) => c.code === this.country
        );
        return country ? country.currency : DEFAULT_COUNTRY.currency;
      },
    },
    role: {
      type: String,
      enum: ["client", "sub-admin", "super-admin"],
      default: "client",
    },
    permissions: {
      type: [String],
      enum: ["events", "tickets", "reports", "clients", "sub-admins"],
      default: function () {
        switch (this.role) {
          case "super-admin":
            return ["events", "tickets", "reports", "clients", "sub-admins"];
          case "sub-admin":
            return ["events", "tickets"];
          default:
            return [];
        }
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "default-avatar.png",
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1, isActive: 1 });

// Virtual for account lock status
UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update permissions when role changes and set currency based on country
UserSchema.pre("save", function (next) {
  // Update permissions based on role
  if (this.isModified("role")) {
    switch (this.role) {
      case "super-admin":
        this.permissions = [
          "events",
          "tickets",
          "reports",
          "clients",
          "sub-admins",
        ];
        break;
      case "sub-admin":
        this.permissions = ["events", "tickets"];
        break;
      default:
        this.permissions = [];
    }
  }

  // Set currency based on country
  if (this.isModified("country") || this.isNew) {
    const country = EAST_AFRICAN_COUNTRIES.find((c) => c.code === this.country);
    if (country) {
      this.currency = country.currency;
    }
  }

  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      permissions: this.permissions,
    },
    process.env.JWT_SECRET || "fallback_secret",
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = require("crypto").randomBytes(20).toString("hex");

  this.resetPasswordToken = require("crypto")
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Handle failed login attempts
UserSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1, loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Update last login
UserSchema.methods.updateLastLogin = function () {
  return this.updateOne({
    lastLogin: new Date(),
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Check if user has permission
UserSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission) || this.role === "super-admin";
};

// Get user's country information
UserSchema.methods.getCountryInfo = function () {
  return (
    EAST_AFRICAN_COUNTRIES.find((c) => c.code === this.country) ||
    DEFAULT_COUNTRY
  );
};

// Validate phone number against user's country
UserSchema.methods.validatePhoneForCountry = function (phone) {
  if (!phone) return true; // Phone is optional
  return validatePhoneNumber(phone, this.country);
};

// Format phone number according to country format
UserSchema.methods.getFormattedPhone = function () {
  if (!this.phone) return "";
  const countryInfo = this.getCountryInfo();
  return this.phone || "";
};

// Static method to get users by role
UserSchema.statics.getUsersByRole = function (role) {
  return this.find({ role, isActive: true }).select("-password");
};

// Static method for authentication
UserSchema.statics.authenticate = async function (identifier, password) {
  const user = await this.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    isActive: true,
  }).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.isLocked) {
    throw new Error(
      "Account is temporarily locked due to too many failed login attempts"
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    await user.incLoginAttempts();
    throw new Error("Invalid credentials");
  }

  await user.updateLastLogin();
  return user;
};

module.exports = mongoose.model("User", UserSchema);
