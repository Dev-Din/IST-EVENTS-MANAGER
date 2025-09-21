#!/bin/bash

# M-Pesa Configuration Setup Script
# This script helps you set up M-Pesa credentials for your Event Organizing System

echo "🔧 Setting up M-Pesa Configuration..."

# Create .env file in backend directory
BACKEND_ENV_FILE="backend/.env"

# Check if .env already exists
if [ -f "$BACKEND_ENV_FILE" ]; then
    echo "⚠️  .env file already exists. Creating backup..."
    cp "$BACKEND_ENV_FILE" "$BACKEND_ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create .env file with M-Pesa credentials
cat > "$BACKEND_ENV_FILE" << EOF
# Environment Variables for Local Development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/legitevents

# JWT Secret (Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Node Environment
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# JWT Expiration
JWT_EXPIRE=7d

# Backend URL
BACKEND_URL=http://localhost:5000

# Email Configuration
EMAIL_FROM=LegitEvents <your-email@example.com>
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-gmail-app-password
SENDGRID_API_KEY=your_sendgrid_api_key

# M-Pesa Daraja API Configuration (Sandbox)
MPESA_CONSUMER_KEY=vJwBhoK0r1OL8YwJ4HqBBiXLA6BlssZBQSaRhMAeUyRyjD8A
MPESA_CONSUMER_SECRET=kueOiHHw8AsXEF0iaGFGSJStGEJvsszTEUOAaXagviAd7wfJL0kGhma3CAmuBXck
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=http://localhost:5000/api/payments/mpesa/callback
EOF

echo "✅ M-Pesa configuration created in $BACKEND_ENV_FILE"
echo ""
echo "📋 Your M-Pesa Credentials:"
echo "Consumer Key: vJwBhoK0r1OL8YwJ4HqBBiXLA6BlssZBQSaRhMAeUyRyjD8A"
echo "Consumer Secret: kueOiHHw8AsXEF0iaGFGSJStGEJvsszTEUOAaXagviAd7wfJL0kGhma3CAmuBXck"
echo "Passkey: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
echo "Shortcode: 174379"
echo ""
echo "🔒 Security Note:"
echo "- These are SANDBOX credentials for testing only"
echo "- Never commit .env files to version control"
echo "- Use different credentials for production"
echo ""
echo "🧪 To test the configuration, run:"
echo "cd backend && node test-mpesa-real-config.js"
echo ""
echo "🚀 To start the backend server:"
echo "cd backend && npm start"
