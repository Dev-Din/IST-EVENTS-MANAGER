const mpesaService = require('./utils/mpesaService');

async function testMpesaConfig() {
  console.log('🔍 Testing M-Pesa Configuration...\n');
  
  try {
    // Test 1: Check environment variables
    console.log('1️⃣ Checking environment variables...');
    console.log('Consumer Key:', process.env.MPESA_CONSUMER_KEY ? '✅ Set' : '❌ Missing');
    console.log('Consumer Secret:', process.env.MPESA_CONSUMER_SECRET ? '✅ Set' : '❌ Missing');
    console.log('Passkey:', process.env.MPESA_PASSKEY ? '✅ Set' : '❌ Missing');
    console.log('Shortcode:', process.env.MPESA_SHORTCODE ? '✅ Set' : '❌ Missing');
    console.log('Callback URL:', process.env.MPESA_CALLBACK_URL ? '✅ Set' : '❌ Missing');
    
    if (!process.env.MPESA_CONSUMER_KEY) {
      console.log('\n❌ M-Pesa credentials not found in environment variables');
      console.log('Please ensure your .env file contains the M-Pesa credentials');
      return;
    }
    
    // Test 2: Get access token
    console.log('\n2️⃣ Testing access token generation...');
    const token = await mpesaService.getAccessToken();
    console.log('✅ Access token generated successfully');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Test 3: Test STK Push initiation
    console.log('\n3️⃣ Testing STK Push initiation...');
    const result = await mpesaService.initiateSTKPush(
      '254712345678', // Test phone number
      1, // 1 KES for testing
      'TEST-REF-001',
      'Test payment'
    );
    
    if (result.success) {
      console.log('✅ STK Push initiated successfully!');
      console.log('Response Code:', result.responseCode);
      console.log('Customer Message:', result.customerMessage);
      console.log('Checkout Request ID:', result.checkoutRequestID);
    } else {
      console.log('❌ STK Push failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testMpesaConfig();

