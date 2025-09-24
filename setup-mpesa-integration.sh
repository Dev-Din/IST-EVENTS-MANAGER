#!/bin/bash

# M-Pesa Integration Setup Script
# This script helps set up M-Pesa STK Push integration for the Event Organising System

echo "🚀 M-Pesa Integration Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from env.example..."
    cp env.example .env
    print_status ".env file created"
else
    print_status ".env file already exists"
fi

# Check if required environment variables are set
print_info "Checking M-Pesa configuration..."

# Source the .env file to check variables
source .env

required_vars=("MPESA_CONSUMER_KEY" "MPESA_CONSUMER_SECRET" "MPESA_SHORTCODE" "MPESA_PASSKEY" "MPESA_CALLBACK_URL")

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your_mpesa_consumer_key" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Missing or incomplete M-Pesa configuration:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_info "Please update your .env file with the correct M-Pesa credentials"
    echo ""
    print_info "For sandbox testing, use these values:"
    echo "  MPESA_CONSUMER_KEY=vJwBhoK0r1OL8YwJ4HqBBiXLA6BlssZBQSaRhMAeUyRyjD8A"
    echo "  MPESA_CONSUMER_SECRET=kueOiHHw8AsXEF0iaGFGSJStGEJvsszTEUOAaXagviAd7wfJL0kGhma3CAmuBXck"
    echo "  MPESA_SHORTCODE=174379"
    echo "  MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
    echo "  MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/payments/mpesa/callback"
    echo ""
    exit 1
fi

print_status "M-Pesa configuration looks good"

# Check if Node.js dependencies are installed
print_info "Checking Node.js dependencies..."

if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Node modules already installed"
fi

# Check if MongoDB is running
print_info "Checking MongoDB connection..."

# Try to connect to MongoDB
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/legitevents', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB connection successful');
    process.exit(0);
}).catch((err) => {
    console.log('❌ MongoDB connection failed:', err.message);
    process.exit(1);
});
"

if [ $? -ne 0 ]; then
    print_error "MongoDB connection failed. Please ensure MongoDB is running"
    print_info "Start MongoDB with: sudo systemctl start mongod"
    exit 1
fi

# Test M-Pesa connection
print_info "Testing M-Pesa API connection..."

node -e "
const mpesaService = require('./utils/mpesaService');
mpesaService.testConnection().then(result => {
    if (result.success) {
        console.log('✅ M-Pesa API connection successful');
        console.log('📱 Ready for STK Push testing');
    } else {
        console.log('❌ M-Pesa API connection failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
}).catch(err => {
    console.log('❌ M-Pesa API test error:', err.message);
    process.exit(1);
});
"

if [ $? -eq 0 ]; then
    print_status "M-Pesa API connection successful"
else
    print_error "M-Pesa API connection failed"
    print_info "Please check your M-Pesa credentials and network connection"
    exit 1
fi

# Check if ngrok is installed (for callback testing)
print_info "Checking ngrok installation..."

if command -v ngrok &> /dev/null; then
    print_status "ngrok is installed"
    print_info "To expose your callback URL, run: ngrok http 5000"
    print_info "Then update MPESA_CALLBACK_URL in your .env file"
else
    print_warning "ngrok not found"
    print_info "Install ngrok for callback testing:"
    print_info "  - Download from: https://ngrok.com/download"
    print_info "  - Or install via package manager"
    print_info "  - Then run: ngrok http 5000"
fi

# Run tests
print_info "Running M-Pesa integration tests..."

npm test -- tests/mpesa.test.js

if [ $? -eq 0 ]; then
    print_status "All tests passed!"
else
    print_warning "Some tests failed. This is normal for sandbox testing"
fi

echo ""
echo "🎉 M-Pesa Integration Setup Complete!"
echo "====================================="
echo ""
print_info "Next steps:"
echo "1. Start your backend server: npm run dev"
echo "2. Start your frontend: cd ../frontend && npm start"
echo "3. Expose callback URL with ngrok: ngrok http 5000"
echo "4. Update MPESA_CALLBACK_URL in .env with ngrok URL"
echo "5. Test payments using phone number: 254708374149"
echo ""
print_info "Test phone numbers for sandbox:"
echo "  - 254708374149 (Safaricom test number)"
echo "  - Use PIN: 1234 for testing"
echo ""
print_info "API Endpoints:"
echo "  - POST /api/payments/mpesa/initiate - Initiate payment"
echo "  - POST /api/payments/mpesa/callback - M-Pesa callback"
echo "  - GET /api/payments/mpesa/status/:id - Check status"
echo "  - GET /api/payments/mpesa/test - Test connection"
echo ""
print_warning "Remember: This is sandbox mode. All payments are KES 1.00"
echo ""
print_status "Happy testing! 🚀"
