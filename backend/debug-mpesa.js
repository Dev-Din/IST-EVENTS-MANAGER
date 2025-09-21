const axios = require("axios");

const API_BASE = "http://localhost:5000/api";

async function testMpesaDebug() {
  try {
    console.log("🔍 M-Pesa Debug Test...\n");

    // Test 1: Check if backend is running
    console.log("1️⃣ Testing backend connection...");
    try {
      const healthResponse = await axios.get(
        `${API_BASE.replace("/api", "")}/health`
      );
      console.log("✅ Backend is running");
    } catch (error) {
      console.log("❌ Backend not running:", error.message);
      return;
    }

    // Test 2: Login to get token
    console.log("\n2️⃣ Testing authentication...");
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "test@example.com",
      password: "password123",
    });
    console.log("✅ Login successful");
    const token = loginResponse.data.token;

    // Test 3: Check environment variables
    console.log("\n3️⃣ Testing M-Pesa configuration...");
    const configResponse = await axios.get(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Admin access working");

    // Test 4: Test M-Pesa payment initiation
    console.log("\n4️⃣ Testing M-Pesa payment initiation...");
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

    console.log("✅ M-Pesa payment initiated!");
    console.log("📱 Response:", JSON.stringify(mpesaResponse.data, null, 2));

    // Test 5: Check payment status
    console.log("\n5️⃣ Testing payment status query...");
    const statusResponse = await axios.get(
      `${API_BASE}/payments/mpesa/status/${mpesaResponse.data.data.checkoutRequestID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Status query successful!");
    console.log(
      "📊 Status Response:",
      JSON.stringify(statusResponse.data, null, 2)
    );
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.response?.data) {
      console.error(
        "📄 Full error response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

testMpesaDebug();
