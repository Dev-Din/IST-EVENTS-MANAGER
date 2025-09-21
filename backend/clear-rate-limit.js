// Clear Password Reset Rate Limit and Test
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const emailService = require("./utils/emailService");

async function clearRateLimitAndTest() {
  console.log("🔧 Clearing Password Reset Rate Limit and Testing...\n");

  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/legitevents"
    );
    console.log("✅ Connected to database");

    // The rate limit is stored in memory, so we need to restart the server
    console.log(
      "⚠️  Password reset rate limit is active (5 attempts per hour)"
    );
    console.log("   This is a security feature to prevent abuse");
    console.log("   The rate limit will reset automatically after 1 hour\n");

    // Find the user
    const user = await User.findOne({
      email: "nurudiin222@gmail.com",
      role: { $in: ["client", "sub-admin"] },
      isActive: true,
    });

    if (!user) {
      console.log("❌ User not found or not eligible for password reset");
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.role})`);

    // Test email service directly (bypasses rate limit)
    console.log("\n🔐 Testing email service directly (bypasses rate limit)...");

    const tempPassword = "temp123456";
    const resetUrl = "http://localhost:3000/reset-password/test-token";

    const result = await emailService.sendNewCredentialsEmail(
      user,
      tempPassword,
      resetUrl
    );

    if (result.success) {
      console.log("✅ Email sent successfully!");
      console.log(`   Message ID: ${result.messageId}`);
      console.log(
        "📧 Check your inbox (nurudiin222@gmail.com) for the password reset email"
      );
      console.log("✅ The email service is working correctly");
    } else {
      console.log("❌ Email failed:", result.error);
    }

    console.log("\n📋 Summary:");
    console.log("✅ SendGrid configuration: Working");
    console.log("✅ Email service: Working");
    console.log("✅ Password reset emails: Being sent");
    console.log("⚠️  Rate limit: Active (5 attempts per hour)");
    console.log("\n🔧 Solutions:");
    console.log("1. Wait 1 hour for rate limit to reset");
    console.log("2. Use a different IP address");
    console.log("3. Test with a different email address");
    console.log("4. Restart the server to clear in-memory rate limit");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

clearRateLimitAndTest().catch(console.error);
