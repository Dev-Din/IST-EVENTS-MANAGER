#!/bin/bash

# Password Reset Configuration Setup Script
# This script helps set up the necessary configurations for password reset functionality

echo "🚀 Password Reset Configuration Setup"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Setting up configuration files..."

# Backend .env setup
echo ""
echo "🔧 Backend Configuration (.env)"
echo "==============================="

if [ -f "backend/.env" ]; then
    echo "✅ backend/.env already exists"
    echo "📝 Please add the following variables to backend/.env:"
    echo ""
    echo "# Email Configuration"
    echo "EMAIL_FROM=LegitEvents <noreply@legitevents.com>"
    echo "EMAIL_USER=your_email@gmail.com"
    echo "EMAIL_PASS=your_gmail_app_password"
    echo ""
    echo "# Optional: Other email services"
    echo "# SENDGRID_API_KEY=your_sendgrid_api_key"
    echo "# AWS_ACCESS_KEY_ID=your_aws_access_key"
    echo "# AWS_SECRET_ACCESS_KEY=your_aws_secret_key"
    echo "# AWS_REGION=us-east-1"
else
    echo "❌ backend/.env not found"
    echo "📝 Please create backend/.env with the required variables"
fi

# Frontend .env setup
echo ""
echo "🔧 Frontend Configuration (.env)"
echo "=================================="

if [ -f "frontend/.env" ]; then
    echo "✅ frontend/.env already exists"
else
    echo "📝 Creating frontend/.env from template..."
    cp frontend/env.example frontend/.env
    echo "✅ frontend/.env created"
fi

echo ""
echo "📧 Email Service Setup Options"
echo "==============================="
echo ""
echo "Choose your email service:"
echo ""
echo "1. Gmail SMTP (Easiest for development)"
echo "   - Enable 2FA on Gmail"
echo "   - Generate App Password"
echo "   - Set EMAIL_USER and EMAIL_PASS"
echo ""
echo "2. SendGrid (Recommended for production)"
echo "   - Create account at sendgrid.com"
echo "   - Generate API Key"
echo "   - Set SENDGRID_API_KEY"
echo ""
echo "3. AWS SES (For production)"
echo "   - Set up AWS SES"
echo "   - Create IAM user"
echo "   - Set AWS credentials"
echo ""
echo "4. Ethereal Email (Development testing)"
echo "   - Create account at ethereal.email"
echo "   - Get test credentials"
echo "   - Set ETHEREAL_USER and ETHEREAL_PASS"
echo ""

echo "🧪 Testing Configuration"
echo "========================"
echo ""
echo "After setting up your email service, test the configuration:"
echo ""
echo "cd backend"
echo "node test-email.js"
echo ""

echo "📚 Documentation"
echo "================"
echo ""
echo "For detailed setup instructions, see:"
echo "- PASSWORD_RESET_CONFIGURATION.md"
echo "- PASSWORD_RESET_DOCUMENTATION.md"
echo ""

echo "✅ Setup script completed!"
echo ""
echo "Next steps:"
echo "1. Configure your chosen email service"
echo "2. Update backend/.env with email credentials"
echo "3. Run: cd backend && node test-email.js"
echo "4. Test the complete password reset flow"
