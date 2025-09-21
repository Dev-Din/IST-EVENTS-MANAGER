const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account has been deactivated",
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: "Account is temporarily locked",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

// Check specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Super admin has all permissions
    if (req.user.role === "super-admin") {
      return next();
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required to access this resource`,
      });
    }

    next();
  };
};

// Check if user is admin (super-admin or sub-admin)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  if (!["super-admin", "sub-admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

// Check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  if (req.user.role !== "super-admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  // Check for token in header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret"
      );

      // Get user from database
      const user = await User.findById(decoded.id).select("-password");

      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log("Optional auth failed:", error.message);
    }
  }

  next();
};

// Check if user owns resource or is admin
const requireOwnership = (resourceUserField = "user") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Admins can access any resource
    if (["super-admin", "sub-admin"].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.resource
      ? req.resource[resourceUserField]
      : req.params.userId;

    if (
      !resourceUserId ||
      resourceUserId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this resource",
      });
    }

    next();
  };
};

// Middleware to check if user can modify events
const canModifyEvent = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }

  // Super admin can modify any event
  if (req.user.role === "super-admin") {
    return next();
  }

  // Sub-admin can only modify events they created
  if (req.user.role === "sub-admin") {
    try {
      const Event = require("../models/Event");
      const event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      if (event.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this event",
        });
      }

      req.event = event;
      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  return res.status(403).json({
    success: false,
    message: "Not authorized to modify events",
  });
};

// Rate limiting for authentication attempts
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.body.email || req.body.username || "");
    const now = Date.now();

    if (attempts.has(key)) {
      const userAttempts = attempts.get(key);
      // Remove old attempts outside the window
      userAttempts.attempts = userAttempts.attempts.filter(
        (attempt) => now - attempt < windowMs
      );

      if (userAttempts.attempts.length >= maxAttempts) {
        return res.status(429).json({
          success: false,
          message: "Too many authentication attempts. Please try again later.",
          retryAfter: Math.ceil(
            (userAttempts.attempts[0] + windowMs - now) / 1000
          ),
        });
      }

      userAttempts.attempts.push(now);
    } else {
      attempts.set(key, { attempts: [now] });
    }

    next();
  };
};

// Rate limiting for password reset attempts
const passwordResetRateLimit = (maxAttempts = 5, windowMs = 60 * 60 * 1000) => {
  // 5 attempts per hour
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + req.body.email;
    const now = Date.now();

    if (attempts.has(key)) {
      const userAttempts = attempts.get(key);
      // Remove old attempts outside the window
      userAttempts.attempts = userAttempts.attempts.filter(
        (attempt) => now - attempt < windowMs
      );

      if (userAttempts.attempts.length >= maxAttempts) {
        return res.status(429).json({
          success: false,
          message: "Too many password reset attempts. Please try again later.",
          retryAfter: Math.ceil(
            (userAttempts.attempts[0] + windowMs - now) / 1000
          ),
        });
      }

      userAttempts.attempts.push(now);
    } else {
      attempts.set(key, { attempts: [now] });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
  requirePermission,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth,
  requireOwnership,
  canModifyEvent,
  authRateLimit,
  passwordResetRateLimit,
};
