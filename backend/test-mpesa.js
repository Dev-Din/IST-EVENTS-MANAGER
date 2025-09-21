const axios = require("axios");

const API_BASE = "http://localhost:5000/api";

async function testMpesaIntegration() {
  try {
    console.log("🧪 Testing M-Pesa Integration...\n");

    // First, login to get a token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "test@example.com",
      password: "password123",
    });

    console.log("✅ Login successful!");
    const token = loginResponse.data.token;

    // Test M-Pesa payment initiation
    console.log("\n💳 Testing M-Pesa Payment Initiation...");
    const mpesaResponse = await axios.post(
      `${API_BASE}/payments/mpesa/initiate`,
      {
        eventId: "507f1f77bcf86cd799439011", // Use a valid event ID
        quantity: 1,
        phoneNumber: "+254712345678",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ M-Pesa payment initiated successfully!");
    console.log(
      "📱 Checkout Request ID:",
      mpesaResponse.data.data.checkoutRequestID
    );
    console.log(
      "💰 Amount:",
      mpesaResponse.data.data.amount,
      mpesaResponse.data.data.currency
    );
    console.log("📞 Phone:", mpesaResponse.data.data.phoneNumber);
    console.log("💬 Message:", mpesaResponse.data.data.customerMessage);

    // Test payment status query
    console.log("\n🔍 Testing Payment Status Query...");
    const statusResponse = await axios.get(
      `${API_BASE}/payments/mpesa/status/${mpesaResponse.data.data.checkoutRequestID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Status query successful!");
    console.log("📊 Result Code:", statusResponse.data.data.resultCode);
    console.log("📝 Result Description:", statusResponse.data.data.resultDesc);
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error.response?.data?.message || error.message
    );
    if (error.response?.data) {
      console.error("📄 Response data:", error.response.data);
    }
  }
}

testMpesaIntegration();
