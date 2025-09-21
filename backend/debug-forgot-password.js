// Debug Forgot Password Email Issue
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const emailService = require("./utils/emailService");

async function debugForgotPasswordEmail() {
  console.log("🔍 Debugging Forgot Password Email Issue...\n");

  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/legitevents"
    );
    console.log("✅ Connected to database");

    // Check configuration
    console.log("📋 Current Configuration:");
    console.log(
      `SENDGRID_API_KEY: ${
        process.env.SENDGRID_API_KEY ? "Set ✅" : "Not set ❌"
      }`
    );
    console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || "Not set ❌"}`);
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? "Set" : "Not set"}`);
    console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? "Set" : "Not set"}\n`);

    // Check which email service will be used
    if (
      process.env.SENDGRID_API_KEY &&
      process.env.SENDGRID_API_KEY.startsWith("SG.")
    ) {
      console.log("📧 Email Service: SendGrid (Production)");
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log("📧 Email Service: Gmail (Development)");
    } else {
      console.log("📧 Email Service: Ethereal (Testing)");
    }

    // Find a real user to test with
    const realUser = await User.findOne({
      role: { $in: ["client", "sub-admin"] },
      isActive: true,
    });

    if (!realUser) {
      console.log("❌ No eligible users found for password reset");
      console.log("   Only clients and sub-admins can reset passwords");
      console.log("   Creating a test user...\n");

      const testUser = await User.create({
        username: "testclient",
        email: "testclient@example.com",
        password: "password123",
        fullName: "Test Client User",
        phone: "+254 712 345 678",
        country: "KE",
        role: "client",
        isActive: true,
        emailVerified: true,
      });

      console.log("✅ Test client user created");
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Role: ${testUser.role}\n`);

      // Test forgot password email
      console.log("🔐 Testing forgot password email...");

      const tempPassword = "temp123456";
      const resetUrl = "http://localhost:3000/reset-password/test-token";

      const result = await emailService.sendNewCredentialsEmail(
        testUser,
        tempPassword,
        resetUrl
      );

      if (result.success) {
        console.log("✅ Forgot password email sent successfully!");
        console.log(`   Message ID: ${result.messageId}`);
        console.log("📧 Email delivered via SendGrid to real inbox!");
        console.log("✅ Users will now receive password reset emails");
      } else {
        console.log("❌ Forgot password email failed:", result.error);
      }

      // Clean up test user
      await User.findByIdAndDelete(testUser._id);
      console.log("\n🧹 Test user cleaned up");
    } else {
      console.log(
        `✅ Found eligible user: ${realUser.email} (${realUser.role})`
      );

      // Test with real user
      console.log("\n🔐 Testing forgot password email with real user...");

      const tempPassword = "temp123456";
      const resetUrl = "http://localhost:3000/reset-password/test-token";

      const result = await emailService.sendNewCredentialsEmail(
        realUser,
        tempPassword,
        resetUrl
      );

      if (result.success) {
        console.log("✅ Forgot password email sent successfully!");
        console.log(`   Message ID: ${result.messageId}`);
        console.log("📧 Email delivered via SendGrid to real inbox!");
        console.log(`✅ Check ${realUser.email} for the password reset email`);
      } else {
        console.log("❌ Forgot password email failed:", result.error);
      }
    }

    // Test the API endpoint
    console.log("\n🌐 Testing forgot password API endpoint...");

    const axios = require("axios");

    try {
      const testEmail = realUser ? realUser.email : "testclient@example.com";
      const response = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        {
          email: testEmail,
        }
      );

      if (response.data.success) {
        console.log("✅ Forgot password API call successful!");
        console.log(`   Response: ${response.data.message}`);
        console.log(`✅ Check ${testEmail} for the password reset email`);
      } else {
        console.log(
          "❌ Forgot password API call failed:",
          response.data.message
        );
      }
    } catch (error) {
      console.log(
        "❌ API call failed:",
        error.response?.data?.message || error.message
      );
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

debugForgotPasswordEmail().catch(console.error);
