# Password Reset Configuration Guide

## Overview

This guide covers all the necessary configurations to make the password reset functionality work completely, including email delivery.

## Required Environment Variables

### Backend Configuration (`backend/.env`)

Add these variables to your `backend/.env` file:

```bash
# Existing variables (keep these)
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/legitevents
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
CLIENT_URL=http://localhost:3000

# Add these new variables for email functionality
FRONTEND_URL=http://localhost:3000
EMAIL_FROM=LegitEvents <noreply@legitevents.com>

# Email Service Configuration (choose one)
# Option 1: Gmail SMTP (Recommended for development)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Option 2: SendGrid (Recommended for production)
SENDGRID_API_KEY=your_sendgrid_api_key

# Option 3: AWS SES (For production)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Option 4: Ethereal Email (Development only - temporary)
ETHEREAL_USER=ethereal.user@ethereal.email
ETHEREAL_PASS=ethereal.pass
```

### Frontend Configuration (`frontend/.env`)

Create a `frontend/.env` file with:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Frontend URL
REACT_APP_FRONTEND_URL=http://localhost:3000

# Environment
REACT_APP_NODE_ENV=development
```

## Email Service Setup Options

### Option 1: Gmail SMTP (Easiest for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:

   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `EMAIL_PASS`

3. **Update `.env`**:
   ```bash
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**: https://sendgrid.com
2. **Generate API Key**:

   - Go to Settings → API Keys
   - Create API Key with "Full Access"
   - Copy the key

3. **Update `.env`**:
   ```bash
   SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
   ```

### Option 3: AWS SES (For Production)

1. **Set up AWS SES**:

   - Verify your email domain
   - Create IAM user with SES permissions
   - Get access keys

2. **Update `.env`**:
   ```bash
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   ```

### Option 4: Ethereal Email (Development Testing)

1. **Create Ethereal Account**: https://ethereal.email
2. **Get Test Credentials**:

   - Create account
   - Get SMTP credentials

3. **Update `.env`**:
   ```bash
   ETHEREAL_USER=your_ethereal_username
   ETHEREAL_PASS=your_ethereal_password
   ```

## Email Service Configuration Update

The email service needs to be updated to use the configured credentials. Here's the updated configuration:

### Update `backend/utils/emailService.js`

```javascript
createTransporter() {
  // Configure based on environment
  if (process.env.NODE_ENV === "production") {
    // Production: Use SendGrid or AWS SES
    if (process.env.SENDGRID_API_KEY) {
      return nodemailer.createTransporter({
        service: 'sendgrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.AWS_ACCESS_KEY_ID) {
      return nodemailer.createTransporter({
        SES: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION
        }
      });
    } else {
      // Fallback to Gmail
      return nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  } else {
    // Development: Use configured service or Ethereal
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Use Gmail for development
      return nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
      // Use Ethereal Email
      return nodemailer.createTransporter({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER,
          pass: process.env.ETHEREAL_PASS,
        },
      });
    } else {
      // Default Ethereal (current)
      return nodemailer.createTransporter({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: "ethereal.user@ethereal.email",
          pass: "ethereal.pass",
        },
      });
    }
  }
}
```

## Testing Configuration

### 1. Test Email Service

Create a test script `backend/test-email.js`:

```javascript
const EmailService = require("./utils/emailService");
require("dotenv").config();

const emailService = new EmailService();

async function testEmail() {
  try {
    const result = await emailService.sendNewCredentialsEmail({
      email: "test@example.com",
      tempPassword: "temp123456",
      resetUrl: "http://localhost:3000/reset-password/token123",
    });

    console.log("✅ Email sent successfully:", result);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
}

testEmail();
```

Run the test:

```bash
cd backend
node test-email.js
```

### 2. Test Complete Password Reset Flow

1. **Start Backend**:

   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend**:

   ```bash
   cd frontend
   npm start
   ```

3. **Test Flow**:
   - Go to http://localhost:3000/login
   - Click "Forgot Password?"
   - Enter email: `nurudiin222@gmail.com`
   - Check email for temporary credentials
   - Use credentials to login
   - Set new password

## Security Considerations

### 1. Environment Variables Security

- Never commit `.env` files to version control
- Use different credentials for development and production
- Rotate API keys regularly

### 2. Email Security

- Use App Passwords for Gmail (not regular passwords)
- Enable 2FA on email accounts
- Use dedicated email service accounts for production

### 3. Rate Limiting

- Password reset is rate-limited to 3 attempts per hour
- Consider implementing CAPTCHA for production

## Troubleshooting

### Common Issues:

#### 1. "535 Authentication failed"

- **Gmail**: Use App Password, not regular password
- **2FA**: Must be enabled for Gmail App Passwords
- **Credentials**: Check username/password are correct

#### 2. "Connection refused"

- **SMTP Port**: Ensure port 587 is not blocked
- **Firewall**: Check firewall settings
- **Network**: Test internet connection

#### 3. "Invalid API Key"

- **SendGrid**: Verify API key is correct and has permissions
- **AWS**: Check IAM permissions for SES

#### 4. "Email not received"

- **Spam Folder**: Check spam/junk folder
- **Email Address**: Verify email address is correct
- **Delivery**: Check email service delivery logs

## Production Deployment

### 1. Environment Variables

- Set all environment variables in your hosting platform
- Use secure secret management (AWS Secrets Manager, etc.)

### 2. Email Service

- Use production email service (SendGrid, AWS SES)
- Set up proper SPF/DKIM records
- Monitor delivery rates

### 3. Monitoring

- Set up email delivery monitoring
- Log password reset attempts
- Monitor for abuse patterns

## Next Steps

1. **Choose Email Service**: Select Gmail, SendGrid, or AWS SES
2. **Configure Credentials**: Set up the chosen service
3. **Update Environment**: Add variables to `.env` files
4. **Test Configuration**: Run email test script
5. **Test Complete Flow**: Test end-to-end password reset
6. **Deploy**: Configure production environment

---

**Note**: This configuration will enable full password reset functionality with email delivery. Choose the email service that best fits your needs and budget.
