const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/legitevents"
    );
    console.log("MongoDB Connected for user check");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

const checkUsers = async () => {
  try {
    await connectDB();

    console.log("🔍 Checking all users in database...\n");

    const allUsers = await User.find({}).select(
      "userId username email role isActive"
    );

    console.log(`📊 Total users found: ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log("❌ No users found in database");
      return;
    }

    console.log("👥 User breakdown by role:");
    const roleStats = {};
    allUsers.forEach((user) => {
      const role = user.role || "unknown";
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count} users`);
    });

    console.log("\n📝 All users:");
    allUsers.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.userId || "No ID"} - ${user.username} (${
          user.email
        })`
      );
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log("");
    });

    // Check specifically for client users
    const clientUsers = await User.find({ role: "client" }).select(
      "userId username email isActive"
    );
    console.log(`🎯 Client users specifically: ${clientUsers.length}`);

    if (clientUsers.length > 0) {
      clientUsers.forEach((user, index) => {
        console.log(
          `${index + 1}. ${user.userId || "No ID"} - ${user.username} (${
            user.email
          }) - Active: ${user.isActive}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error checking users:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
    process.exit(0);
  }
};

checkUsers();
