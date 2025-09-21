#!/bin/bash

# Email Service Configuration Script
# Usage: ./setup-email.sh [ethereal|gmail|sendgrid|aws]

case $1 in
  "ethereal")
    echo "Setting up Ethereal Email (Testing Only)..."
    cat > .env.email << EOF
# Ethereal Email Configuration (Testing Only)
ETHEREAL_USER=k3fpadbgjbzvt6c3@ethereal.email
ETHEREAL_PASS=bnbWd91dSevdwFJymy
EMAIL_FROM=LegitEvents <noreply@legitevents.com>
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Ethereal Email configured - No real emails will be sent"
    ;;
    
  "gmail")
    echo "Setting up Gmail SMTP..."
    echo "Please enter your Gmail credentials:"
    read -p "Gmail address: " gmail_user
    read -s -p "App Password (16 characters): " gmail_pass
    echo
    
    cat > .env.email << EOF
# Gmail SMTP Configuration
EMAIL_USER=$gmail_user
EMAIL_PASS=$gmail_pass
EMAIL_FROM=LegitEvents <noreply@legitevents.com>
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Gmail SMTP configured - Real emails will be sent"
    ;;
    
  "sendgrid")
    echo "Setting up SendGrid..."
    read -p "SendGrid API Key: " sendgrid_key
    
    cat > .env.email << EOF
# SendGrid Configuration
SENDGRID_API_KEY=$sendgrid_key
EMAIL_FROM=LegitEvents <noreply@legitevents.com>
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ SendGrid configured - Real emails will be sent"
    ;;
    
  "aws")
    echo "Setting up AWS SES..."
    read -p "AWS Access Key ID: " aws_key
    read -s -p "AWS Secret Access Key: " aws_secret
    echo
    read -p "AWS Region (e.g., us-east-1): " aws_region
    
    cat > .env.email << EOF
# AWS SES Configuration
AWS_ACCESS_KEY_ID=$aws_key
AWS_SECRET_ACCESS_KEY=$aws_secret
AWS_REGION=$aws_region
EMAIL_FROM=LegitEvents <noreply@legitevents.com>
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ AWS SES configured - Real emails will be sent"
    ;;
    
  *)
    echo "Usage: $0 [ethereal|gmail|sendgrid|aws]"
    echo ""
    echo "Available email services:"
    echo "  ethereal  - Testing only, no real delivery"
    echo "  gmail     - Real delivery via Gmail SMTP"
    echo "  sendgrid  - Professional email service"
    echo "  aws       - AWS SES for enterprise use"
    ;;
esac

if [ -f .env.email ]; then
  echo ""
  echo "📧 Email configuration saved to .env.email"
  echo "To apply: cp .env.email .env"
  echo "To test: node test-email.js"
fi
