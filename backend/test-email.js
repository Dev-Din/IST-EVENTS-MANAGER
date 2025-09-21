const emailService = require("./utils/emailService");
require("dotenv").config();

async function testEmailConfiguration() {
  console.log("🧪 Testing Email Configuration...\n");

  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(
    `EMAIL_USER: ${process.env.EMAIL_USER ? "✅ Set" : "❌ Not set"}`
  );
  console.log(
    `EMAIL_PASS: ${process.env.EMAIL_PASS ? "✅ Set" : "❌ Not set"}`
  );
  console.log(
    `SENDGRID_API_KEY: ${
      process.env.SENDGRID_API_KEY ? "✅ Set" : "❌ Not set"
    }`
  );
  console.log(
    `AWS_ACCESS_KEY_ID: ${
      process.env.AWS_ACCESS_KEY_ID ? "✅ Set" : "❌ Not set"
    }`
  );
  console.log(
    `ETHEREAL_USER: ${process.env.ETHEREAL_USER ? "✅ Set" : "❌ Not set"}`
  );
  console.log(
    `ETHEREAL_PASS: ${process.env.ETHEREAL_PASS ? "✅ Set" : "❌ Not set"}`
  );
  console.log(
    `EMAIL_FROM: ${
      process.env.EMAIL_FROM || "LegitEvents <noreply@legitevents.com>"
    }\n`
  );

  // Test email service
  try {
    console.log("📧 Testing Email Service...");

    const result = await emailService.sendNewCredentialsEmail(
      { email: "test@example.com", fullName: "Test User" },
      "temp123456",
      "http://localhost:3000/reset-password/token123"
    );

    console.log("✅ Email sent successfully!");
    console.log("📧 Message ID:", result.messageId);

    if (process.env.NODE_ENV === "development") {
      console.log("🔗 Preview URL:", result.previewUrl);
    }
  } catch (error) {
    console.error("❌ Email failed:", error.message);

    if (error.code === "EAUTH") {
      console.log("\n💡 Authentication Error Solutions:");
      console.log("1. For Gmail: Use App Password (not regular password)");
      console.log("2. Enable 2-Factor Authentication first");
      console.log("3. Generate App Password in Google Account settings");
      console.log("4. Use the 16-character App Password as EMAIL_PASS");
    } else if (error.code === "ECONNECTION") {
      console.log("\n💡 Connection Error Solutions:");
      console.log("1. Check internet connection");
      console.log("2. Verify SMTP server settings");
      console.log("3. Check firewall/antivirus settings");
    }
  }
}

// Test transporter creation
function testTransporterCreation() {
  console.log("🔧 Testing Transporter Creation...");

  try {
    const transporter = emailService.transporter;
    console.log("✅ Transporter created successfully");
    console.log("📡 Service:", transporter.options.service || "Custom SMTP");
    console.log("🏠 Host:", transporter.options.host || "Service default");
    console.log("🔌 Port:", transporter.options.port || "Service default");
  } catch (error) {
    console.error("❌ Transporter creation failed:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Password Reset Email Configuration Test\n");
  console.log("=".repeat(50));

  testTransporterCreation();
  console.log("");

  await testEmailConfiguration();

  console.log("\n" + "=".repeat(50));
  console.log("📚 Configuration Guide:");
  console.log(
    "See PASSWORD_RESET_CONFIGURATION.md for detailed setup instructions"
  );

  process.exit(0);
}

runTests().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
