# M-Pesa STK Push Integration Documentation

## Overview

This document provides comprehensive documentation for the M-Pesa STK Push integration in the Event Organising System. The integration allows users to purchase event tickets using M-Pesa mobile money payments.

## Table of Contents

1. [Architecture](#architecture)
2. [Setup Instructions](#setup-instructions)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Database Schema](#database-schema)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Architecture

### Backend Components

- **M-Pesa Service** (`utils/mpesaService.js`): Handles M-Pesa API communication
- **Transaction Model** (`models/Transaction.js`): Stores M-Pesa transaction data
- **Payment Controller** (`controllers/payments.js`): Manages payment operations
- **Payment Routes** (`routes/payments.js`): Defines API endpoints

### Frontend Components

- **MpesaPaymentForm** (`components/MpesaPaymentForm.js`): Payment form component
- **MpesaTestPage** (`pages/MpesaTestPage.js`): Testing interface

### Payment Flow

1. User selects event and initiates payment
2. Frontend sends payment request to backend
3. Backend creates pending ticket and transaction
4. Backend initiates STK Push with M-Pesa
5. User receives STK Push on phone
6. User enters M-Pesa PIN
7. M-Pesa sends callback to backend
8. Backend updates transaction and ticket status
9. Frontend polls for status updates

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- MongoDB running locally or remotely
- M-Pesa Daraja API credentials (sandbox or production)
- ngrok for callback testing (development)

### Quick Setup

1. **Clone and install dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp env.example .env
   # Edit .env with your M-Pesa credentials
   ```

3. **Run setup script:**

   ```bash
   ./setup-mpesa-integration.sh
   ```

4. **Start the application:**

   ```bash
   # Backend
   npm run dev

   # Frontend (in another terminal)
   cd ../frontend
   npm start
   ```

### Environment Configuration

Required environment variables:

```env
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=your_callback_url
MPESA_BASE_URL=https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

# Database
MONGODB_URI=mongodb://localhost:27017/legitevents

# Server
PORT=5000
NODE_ENV=development
BACKEND_URL=http://localhost:5000
```

### Sandbox Credentials

For testing, use these sandbox credentials:

```env
MPESA_CONSUMER_KEY=vJwBhoK0r1OL8YwJ4HqBBiXLA6BlssZBQSaRhMAeUyRyjD8A
MPESA_CONSUMER_SECRET=kueOiHHw8AsXEF0iaGFGSJStGEJvsszTEUOAaXagviAd7wfJL0kGhma3CAmuBXck
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```

## API Endpoints

### Payment Initiation

**POST** `/api/payments/mpesa/initiate`

Initiates M-Pesa STK Push payment.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "eventId": "event_object_id",
  "phoneNumber": "254712345678",
  "quantity": 1
}
```

**Response:**

```json
{
  "success": true,
  "message": "M-Pesa payment initiated successfully",
  "data": {
    "ticketId": "ticket_object_id",
    "ticketNumber": "TKT-123456789",
    "transactionId": "transaction_object_id",
    "amount": 1,
    "currency": "KES",
    "checkoutRequestID": "ws_CO_123456789",
    "customerMessage": "Success. Request accepted for processing",
    "phoneNumber": "254712345678",
    "accountReference": "TKT-123456789"
  }
}
```

### Payment Callback

**POST** `/api/payments/mpesa/callback`

Handles M-Pesa payment callbacks (public endpoint).

**Request Body:**

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "ws_MR_123456789",
      "CheckoutRequestID": "ws_CO_123456789",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1 },
          { "Name": "MpesaReceiptNumber", "Value": "QBF1234567" },
          { "Name": "TransactionDate", "Value": 20231201120000 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

**Response:**

```json
{
  "ResultCode": 0,
  "ResultDesc": "Success"
}
```

### Payment Status Query

**GET** `/api/payments/mpesa/status/:checkoutRequestID`

Queries payment status from M-Pesa.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "checkoutRequestID": "ws_CO_123456789",
    "resultCode": 0,
    "resultDesc": "The service request is processed successfully.",
    "transaction": {
      "id": "transaction_object_id",
      "status": "success",
      "amount": 1,
      "currency": "KES",
      "phoneNumber": "254712345678",
      "initiatedAt": "2023-12-01T12:00:00.000Z",
      "completedAt": "2023-12-01T12:01:00.000Z"
    },
    "ticket": {
      "id": "ticket_object_id",
      "ticketNumber": "TKT-123456789",
      "status": "confirmed",
      "paymentStatus": "completed",
      "event": "Event Title",
      "amount": 1
    }
  }
}
```

### Transaction Management

**GET** `/api/payments/transactions`

Gets user's transaction history.

**Query Parameters:**

- `status`: Filter by transaction status (pending, success, failed, cancelled)
- `limit`: Number of transactions per page (default: 20)
- `page`: Page number (default: 1)

**GET** `/api/payments/transaction/:transactionId`

Gets detailed transaction information.

**GET** `/api/payments/mpesa/test`

Tests M-Pesa API connection.

## Frontend Components

### MpesaPaymentForm

A React component for handling M-Pesa payments.

**Props:**

- `eventId`: ID of the event to purchase tickets for

**Features:**

- Phone number validation and formatting
- Real-time payment status checking
- Automatic status polling
- Error handling and user feedback

**Usage:**

```jsx
import MpesaPaymentForm from "./components/MpesaPaymentForm";

<MpesaPaymentForm eventId={eventId} />;
```

### MpesaTestPage

A testing interface for M-Pesa integration.

**Features:**

- Connection testing
- STK Push testing
- Test results display
- Comprehensive testing instructions

## Database Schema

### Transaction Model

```javascript
{
  checkoutRequestID: String,      // M-Pesa checkout request ID
  merchantRequestID: String,      // M-Pesa merchant request ID
  mpesaReceiptNumber: String,     // M-Pesa receipt number
  amount: Number,                 // Transaction amount
  currency: String,               // Currency (default: KES)
  phoneNumber: String,           // Customer phone number
  status: String,                // pending, success, failed, cancelled
  resultCode: Number,            // M-Pesa result code
  resultDesc: String,           // M-Pesa result description
  ticket: ObjectId,              // Reference to Ticket
  user: ObjectId,                // Reference to User
  event: ObjectId,               // Reference to Event
  accountReference: String,       // Account reference
  transactionDesc: String,       // Transaction description
  transactionDate: Date,         // M-Pesa transaction date
  callbackData: Mixed,           // Raw callback data
  initiatedAt: Date,            // Transaction initiation time
  completedAt: Date              // Transaction completion time
}
```

### Ticket Model Updates

The existing Ticket model includes:

- `paymentReference`: M-Pesa checkout request ID or receipt number
- `paymentMethod`: "mobile_money" for M-Pesa payments
- `paymentStatus`: "pending", "completed", "failed", "refunded"

## Testing

### Automated Tests

Run the M-Pesa integration tests:

```bash
npm test -- tests/mpesa.test.js
```

**Test Coverage:**

- M-Pesa service functionality
- Payment initiation
- Callback handling
- Status queries
- Transaction management
- Error handling

### Manual Testing

1. **Start the application:**

   ```bash
   npm run dev
   ```

2. **Expose callback URL:**

   ```bash
   ngrok http 5000
   ```

3. **Update callback URL in .env:**

```env
MPESA_CALLBACK_URL=https://boreal-etta-unfuddled.ngrok-free.dev/api/payments/mpesa/callback
# If ngrok issues a new URL, update MPESA_CALLBACK_URL to match.
```

4. **Test with sandbox credentials:**
   - Phone: 254708374149
   - PIN: 1234
   - Amount: KES 1.00 (sandbox)

### Test Scenarios

1. **Successful Payment:**

   - Initiate payment with valid phone number
   - Enter PIN when prompted
   - Verify callback received
   - Check ticket confirmation

2. **Failed Payment:**

   - Initiate payment
   - Cancel or enter wrong PIN
   - Verify failure handling

3. **Network Issues:**
   - Test with invalid credentials
   - Test callback timeout
   - Test status query failures

## Deployment

### Production Setup

1. **Update environment variables:**

   ```env
   NODE_ENV=production
   MPESA_BASE_URL=https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
   MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
   ```

2. **Use production M-Pesa credentials:**

   - Get credentials from Safaricom
   - Update shortcode and passkey
   - Ensure callback URL is accessible

3. **Database considerations:**

   - Use production MongoDB instance
   - Set up proper indexes
   - Configure backup strategy

4. **Security measures:**
   - Use HTTPS for all endpoints
   - Validate callback signatures
   - Implement rate limiting
   - Log all transactions

### Callback URL Requirements

- Must be publicly accessible
- Must use HTTPS in production
- Must respond within 30 seconds
- Must return proper JSON response

## Troubleshooting

### Common Issues

1. **"Missing required M-Pesa configuration"**

   - Check all environment variables are set
   - Verify credentials are correct
   - Ensure no extra spaces in values

2. **"M-Pesa API connection failed"**

   - Check network connectivity
   - Verify credentials with Safaricom
   - Check API endpoint URLs

3. **"Invalid M-Pesa phone number format"**

   - Use format: 2547XXXXXXXX
   - Remove spaces and special characters
   - Ensure 12 digits total

4. **Callback not received**

   - Check ngrok is running
   - Verify callback URL is accessible
   - Check server logs for errors

5. **Payment stuck in pending**
   - Check M-Pesa service status
   - Verify callback endpoint is working
   - Use status query endpoint

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
```

This will log all M-Pesa API calls and responses.

### Logs

Check these logs for issues:

- Server console output
- MongoDB transaction records
- M-Pesa API responses
- Callback data

### Support

For M-Pesa API issues:

- Safaricom Developer Portal
- M-Pesa API Documentation
- Safaricom Support

For application issues:

- Check server logs
- Verify database connectivity
- Test API endpoints manually

## Security Considerations

1. **Environment Variables:**

   - Never commit credentials to version control
   - Use different credentials for dev/staging/production
   - Rotate credentials regularly

2. **API Security:**

   - Validate all input data
   - Implement rate limiting
   - Use HTTPS in production
   - Validate callback signatures

3. **Data Protection:**
   - Encrypt sensitive data
   - Implement proper access controls
   - Log security events
   - Regular security audits

## Performance Optimization

1. **Database:**

   - Add proper indexes
   - Use connection pooling
   - Implement query optimization

2. **API Calls:**

   - Cache access tokens
   - Implement retry logic
   - Use connection pooling

3. **Frontend:**
   - Implement proper loading states
   - Use efficient polling
   - Handle network errors gracefully

## Monitoring

1. **Transaction Monitoring:**

   - Track success/failure rates
   - Monitor response times
   - Alert on errors

2. **System Health:**

   - Monitor API connectivity
   - Track callback success rates
   - Monitor database performance

3. **Business Metrics:**
   - Track payment volumes
   - Monitor conversion rates
   - Analyze user behavior

---

**Last Updated:** December 2023  
**Version:** 1.0.0  
**Maintainer:** Event Organising System Team
