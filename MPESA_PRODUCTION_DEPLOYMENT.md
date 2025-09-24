# M-Pesa Production Deployment Guide

## Overview

This guide covers deploying the M-Pesa STK Push integration to production, including security considerations, performance optimization, and monitoring setup.

## Pre-Deployment Checklist

### 1. M-Pesa Production Credentials

- [ ] Obtain production M-Pesa credentials from Safaricom
- [ ] Update environment variables with production values
- [ ] Verify shortcode and passkey are correct
- [ ] Ensure callback URL is publicly accessible

### 2. Security Configuration

- [ ] Enable HTTPS for all endpoints
- [ ] Implement proper authentication
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable request validation

### 3. Database Setup

- [ ] Set up production MongoDB instance
- [ ] Configure proper indexes
- [ ] Set up database backups
- [ ] Configure connection pooling

### 4. Monitoring & Logging

- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Set up transaction logging
- [ ] Implement health checks

## Production Environment Variables

```env
# Production M-Pesa Configuration
NODE_ENV=production
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_SHORTCODE=your_production_shortcode
MPESA_PASSKEY=your_production_passkey
MPESA_BASE_URL=https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/legitevents

# Security
JWT_SECRET=your_strong_jwt_secret
FRONTEND_URL=https://yourdomain.com

# Server
PORT=5000
BACKEND_URL=https://api.yourdomain.com
```

## Security Enhancements

### 1. Callback Signature Validation

Add signature validation to the callback endpoint:

```javascript
// In mpesaService.js
validateCallbackSignature(callbackData, signature) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', this.passkey)
    .update(JSON.stringify(callbackData))
    .digest('hex');

  return signature === expectedSignature;
}
```

### 2. Rate Limiting

Implement stricter rate limiting for production:

```javascript
// In server.js
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    message: "Too many payment requests, please try again later",
  },
});

app.use("/api/payments/mpesa/initiate", paymentLimiter);
```

### 3. Input Validation

Add comprehensive input validation:

```javascript
// In controllers/payments.js
const { body, validationResult } = require("express-validator");

const validatePaymentRequest = [
  body("phoneNumber")
    .matches(/^2547\d{8}$/)
    .withMessage("Invalid M-Pesa phone number format"),
  body("quantity")
    .isInt({ min: 1, max: 10 })
    .withMessage("Quantity must be between 1 and 10"),
  body("eventId").isMongoId().withMessage("Invalid event ID"),
];
```

## Performance Optimization

### 1. Database Indexes

Add production indexes:

```javascript
// In models/Transaction.js
TransactionSchema.index({ checkoutRequestID: 1 }, { unique: true });
TransactionSchema.index({ user: 1, initiatedAt: -1 });
TransactionSchema.index({ status: 1, initiatedAt: -1 });
TransactionSchema.index({ phoneNumber: 1 });
TransactionSchema.index({ createdAt: -1 });
```

### 2. Connection Pooling

Configure MongoDB connection pooling:

```javascript
// In config/database.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
```

### 3. Caching

Implement Redis caching for access tokens:

```javascript
// Install redis: npm install redis
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// In mpesaService.js
async getAccessToken() {
  try {
    // Check cache first
    const cachedToken = await client.get('mpesa_access_token');
    if (cachedToken) {
      return cachedToken;
    }

    // Get new token
    const token = await this.fetchNewToken();

    // Cache for 55 minutes (tokens expire in 1 hour)
    await client.setex('mpesa_access_token', 3300, token);

    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}
```

## Monitoring Setup

### 1. Health Check Endpoint

Enhance the health check endpoint:

```javascript
// In server.js
app.get("/health", async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      database: "unknown",
      mpesa: "unknown",
    },
  };

  try {
    // Check database
    await mongoose.connection.db.admin().ping();
    healthCheck.services.database = "healthy";
  } catch (error) {
    healthCheck.services.database = "unhealthy";
  }

  try {
    // Check M-Pesa connection
    const mpesaTest = await mpesaService.testConnection();
    healthCheck.services.mpesa = mpesaTest.success ? "healthy" : "unhealthy";
  } catch (error) {
    healthCheck.services.mpesa = "unhealthy";
  }

  const statusCode = Object.values(healthCheck.services).every(
    (status) => status === "healthy"
  )
    ? 200
    : 503;

  res.status(statusCode).json(healthCheck);
});
```

### 2. Transaction Monitoring

Add transaction monitoring:

```javascript
// In controllers/payments.js
const logTransaction = (action, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId: data.userId,
    transactionId: data.transactionId,
    amount: data.amount,
    status: data.status,
    ip: data.ip,
    userAgent: data.userAgent,
  };

  // Log to monitoring service (e.g., DataDog, New Relic)
  console.log("TRANSACTION_LOG:", JSON.stringify(logEntry));
};
```

### 3. Error Tracking

Implement error tracking:

```javascript
// Install Sentry: npm install @sentry/node
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// In error handler
app.use((error, req, res, next) => {
  Sentry.captureException(error);

  // Log error details
  console.error("Error:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});
```

## Deployment Steps

### 1. Build Application

```bash
# Install production dependencies
npm ci --only=production

# Build frontend
cd ../frontend
npm run build
```

### 2. Environment Setup

```bash
# Set production environment variables
export NODE_ENV=production
export MONGODB_URI=mongodb+srv://...
export MPESA_CONSUMER_KEY=...
# ... other variables
```

### 3. Database Migration

```bash
# Run database migrations if any
npm run migrate

# Create indexes
npm run create-indexes
```

### 4. Start Application

```bash
# Using PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name "legitevents-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

## Load Balancing

For high-traffic applications, implement load balancing:

```nginx
# Nginx configuration
upstream api_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location /api/payments/mpesa/callback {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for M-Pesa callbacks
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
    }

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup Strategy

### 1. Database Backups

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="legitevents"

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/$DATE.tar.gz $BACKUP_DIR/$DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE.tar.gz"
```

### 2. Transaction Logs

```javascript
// Log all transactions to separate collection
const TransactionLog = mongoose.model("TransactionLog", {
  transactionId: String,
  action: String,
  data: Object,
  timestamp: Date,
  ip: String,
  userAgent: String,
});

// In payment controller
const logTransaction = async (action, data) => {
  await TransactionLog.create({
    transactionId: data.transactionId,
    action,
    data,
    timestamp: new Date(),
    ip: data.ip,
    userAgent: data.userAgent,
  });
};
```

## Testing in Production

### 1. Smoke Tests

```bash
#!/bin/bash
# smoke-tests.sh

BASE_URL="https://api.yourdomain.com"

# Test health endpoint
curl -f $BASE_URL/health || exit 1

# Test M-Pesa connection
curl -f -H "Authorization: Bearer $AUTH_TOKEN" \
  $BASE_URL/api/payments/mpesa/test || exit 1

echo "Smoke tests passed"
```

### 2. Load Testing

```bash
# Install artillery: npm install -g artillery

# artillery-config.yml
config:
  target: 'https://api.yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Payment initiation"
    weight: 100
    flow:
      - post:
          url: "/api/payments/mpesa/initiate"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            eventId: "{{ eventId }}"
            phoneNumber: "254708374149"
            quantity: 1
```

## Maintenance

### 1. Regular Tasks

- Monitor transaction success rates
- Check callback response times
- Review error logs
- Update dependencies
- Rotate credentials

### 2. Performance Monitoring

- Track API response times
- Monitor database performance
- Check memory usage
- Review error rates

### 3. Security Updates

- Keep dependencies updated
- Monitor security advisories
- Regular security audits
- Update SSL certificates

## Troubleshooting Production Issues

### 1. High Error Rates

- Check M-Pesa API status
- Review callback endpoint logs
- Verify database connectivity
- Check server resources

### 2. Slow Response Times

- Monitor database queries
- Check network latency
- Review server resources
- Optimize database indexes

### 3. Callback Failures

- Verify callback URL accessibility
- Check SSL certificate validity
- Review timeout settings
- Monitor server logs

---

**Remember:** Always test thoroughly in staging environment before deploying to production. Monitor closely after deployment and have rollback plans ready.
