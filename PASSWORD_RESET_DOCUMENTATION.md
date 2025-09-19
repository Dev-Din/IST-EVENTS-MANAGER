# Password Reset Implementation - Documentation

## Overview

This implementation provides a secure password reset system specifically for **Clients** and **Sub-Admins** only. Super-admins are excluded for security reasons.

## Features Implemented

### 1. Backend Implementation

#### New API Endpoints:

- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:resettoken` - Reset password with token
- `POST /api/auth/verify-temp-credentials` - Verify temporary credentials

#### Security Features:

- **Role Restriction**: Only clients and sub-admins can use password reset
- **Rate Limiting**: Maximum 3 attempts per hour per IP/email
- **Temporary Passwords**: Generated passwords expire in 10 minutes
- **Token Expiry**: Reset tokens expire after 10 minutes
- **Audit Logging**: All password reset attempts are logged

### 2. Frontend Components

#### New Pages:

- `ForgotPassword.js` - Request password reset
- `TempCredentialsLogin.js` - Login with temporary credentials
- `ChangePassword.js` - Set new password after temp login

### 3. Email Templates

#### New Credentials Email:

- Professional HTML template with clear instructions
- Temporary password prominently displayed
- Security warnings and next steps
- Mobile-responsive design

## How It Works

### Step 1: Request Password Reset

1. User visits `/forgot-password` page
2. Enters their email address
3. System checks if user is eligible (client or sub-admin)
4. Generates temporary password and reset token
5. Sends email with new credentials

### Step 2: Login with Temporary Credentials

1. User receives email with temporary password
2. Uses `/temp-credentials-login` page
3. Enters email and temporary password
4. System verifies credentials and token expiry
5. User is logged in and redirected to change password

### Step 3: Set New Password

1. User is redirected to `/change-password` page
2. Enters temporary password as current password
3. Sets new secure password
4. Password is updated and user is fully authenticated

## API Usage Examples

### Request Password Reset

```javascript
const response = await fetch("/api/auth/forgot-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email: "user@example.com" }),
});

const data = await response.json();
// Returns: { success: true, message: "New login credentials have been sent to your email" }
```

### Verify Temporary Credentials

```javascript
const response = await fetch("/api/auth/verify-temp-credentials", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
    password: "temp123456",
  }),
});

const data = await response.json();
// Returns: { success: true, token: "...", requiresPasswordChange: true }
```

### Reset Password with Token

```javascript
const response = await fetch(`/api/auth/reset-password/${resetToken}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ password: "newSecurePassword123" }),
});

const data = await response.json();
// Returns: { success: true, message: "Password reset successful", token: "..." }
```

## Security Considerations

### What's Protected:

- ✅ Only clients and sub-admins can reset passwords
- ✅ Rate limiting prevents brute force attacks
- ✅ Temporary passwords expire in 10 minutes
- ✅ Reset tokens are hashed and expire
- ✅ All sensitive operations are logged

### What's NOT Protected:

- ❌ Super-admins cannot use this system (by design)
- ❌ No email verification required (assumes email is secure)
- ❌ No additional verification steps (SMS, etc.)

## Testing

### Manual Testing:

1. Create test users with different roles
2. Test password reset for clients and sub-admins
3. Verify super-admins are blocked
4. Test rate limiting by making multiple requests
5. Test token expiry by waiting 10+ minutes

### Automated Testing:

Run the test suite:

```bash
npm test -- passwordReset.test.js
```

## Configuration

### Environment Variables:

```bash
# Required for email functionality
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password
EMAIL_FROM=LegitEvents <noreply@legitevents.com>
FRONTEND_URL=http://localhost:3000
```

### Rate Limiting Configuration:

```javascript
// In middleware/auth.js
const passwordResetRateLimit = (maxAttempts = 3, windowMs = 60 * 60 * 1000) => {
  // 3 attempts per hour
};
```

## Error Handling

### Common Error Scenarios:

1. **Invalid Email**: "No eligible user found with that email"
2. **Rate Limited**: "Too many password reset attempts. Please try again later."
3. **Expired Token**: "Temporary credentials have expired"
4. **Invalid Credentials**: "Invalid credentials"
5. **Email Failure**: "Email could not be sent"

### Error Response Format:

```json
{
  "success": false,
  "message": "Error description",
  "retryAfter": 3600 // For rate limiting errors
}
```

## Monitoring & Logging

### What's Logged:

- All password reset requests
- Successful and failed attempts
- Rate limit violations
- Email delivery status
- Token usage and expiry

### Log Format:

```
[timestamp] Password reset request: email=user@example.com, ip=192.168.1.1, role=client
[timestamp] Password reset success: email=user@example.com, token=abc123
[timestamp] Rate limit exceeded: ip=192.168.1.1, attempts=4
```

## Deployment Checklist

### Before Going Live:

- [ ] Configure production email service
- [ ] Set up proper environment variables
- [ ] Test email delivery in production
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring and alerting
- [ ] Test with real user accounts
- [ ] Document the process for support team

### Production Considerations:

- Use a reliable email service (SendGrid, AWS SES, etc.)
- Monitor email delivery rates
- Set up alerts for failed password resets
- Consider implementing additional verification steps
- Regular security audits

## Troubleshooting

### Common Issues:

#### 1. Emails Not Sending

- Check email service configuration
- Verify SMTP credentials
- Check spam folders
- Test with different email providers

#### 2. Rate Limiting Too Strict

- Adjust `maxAttempts` and `windowMs` parameters
- Consider different limits for different user types
- Implement IP whitelisting for support team

#### 3. Token Expiry Issues

- Check system time synchronization
- Verify token generation and validation logic
- Consider extending expiry time for testing

#### 4. Frontend Integration Issues

- Verify API endpoint URLs
- Check CORS configuration
- Ensure proper error handling
- Test with different browsers

## Future Enhancements

### Potential Improvements:

1. **SMS Verification**: Add SMS as additional verification step
2. **Security Questions**: Implement security questions for additional verification
3. **Admin Override**: Allow super-admins to reset passwords for other users
4. **Audit Dashboard**: Create admin dashboard for monitoring password resets
5. **Email Templates**: Add more email templates for different scenarios
6. **Multi-language Support**: Support multiple languages for emails
7. **Password History**: Prevent reuse of recent passwords

### Security Enhancements:

1. **IP Geolocation**: Block requests from suspicious locations
2. **Device Fingerprinting**: Track devices for additional security
3. **Behavioral Analysis**: Detect unusual password reset patterns
4. **Two-Factor Authentication**: Require 2FA for password resets

## Support Information

### For Users:

- Password reset is only available for regular users and sub-admins
- Temporary passwords expire in 10 minutes
- Contact support if you don't receive the email
- Never share your temporary password with anyone

### For Administrators:

- Monitor password reset attempts regularly
- Check logs for suspicious activity
- Verify email service is working properly
- Consider implementing additional security measures

---

_This documentation covers the complete password reset implementation for the Event Organizing System. For technical support or questions, contact the development team._
