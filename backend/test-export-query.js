/**
 * Test script to verify MongoDB query filtering by role
 * Run with: node backend/test-export-query.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const testRoleFiltering = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/event-organizing-system");
    console.log("✓ Connected to MongoDB\n");

    // Test 1: Query for clients only
    console.log("========== TEST 1: Query for clients ==========");
    const clientQuery = { role: "client" };
    console.log("Query:", JSON.stringify(clientQuery, null, 2));
    const clients = await User.find(clientQuery).select("username email role");
    console.log(`Found ${clients.length} clients:`);
    clients.forEach(u => {
      console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`);
    });
    console.log("Roles in result:", [...new Set(clients.map(u => u.role))]);
    console.log("✓ All should be 'client'\n");

    // Test 2: Query for sub-admins only
    console.log("========== TEST 2: Query for sub-admins ==========");
    const subAdminQuery = { role: "sub-admin" };
    console.log("Query:", JSON.stringify(subAdminQuery, null, 2));
    const subAdmins = await User.find(subAdminQuery).select("username email role");
    console.log(`Found ${subAdmins.length} sub-admins:`);
    subAdmins.forEach(u => {
      console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`);
    });
    console.log("Roles in result:", [...new Set(subAdmins.map(u => u.role))]);
    console.log("✓ All should be 'sub-admin'\n");

    // Test 3: Query for super-admins
    console.log("========== TEST 3: Query for super-admins ==========");
    const superAdminQuery = { role: "super-admin" };
    console.log("Query:", JSON.stringify(superAdminQuery, null, 2));
    const superAdmins = await User.find(superAdminQuery).select("username email role");
    console.log(`Found ${superAdmins.length} super-admins:`);
    superAdmins.forEach(u => {
      console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`);
    });
    console.log("Roles in result:", [...new Set(superAdmins.map(u => u.role))]);
    console.log("✓ All should be 'super-admin'\n");

    // Test 4: Verify all users in database
    console.log("========== TEST 4: All users in database ==========");
    const allUsers = await User.find({}).select("username email role");
    console.log(`Total users in database: ${allUsers.length}`);
    const roleCounts = allUsers.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    console.log("Role breakdown:", roleCounts);
    console.log("\nAll users:");
    allUsers.forEach(u => {
      console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`);
    });

    // Test 5: Verify query with exact match
    console.log("\n========== TEST 5: Verify exact role match ==========");
    const testRole = "client";
    const exactQuery = { role: testRole };
    const exactResults = await User.find(exactQuery).select("username role");
    const hasWrongRoles = exactResults.some(u => u.role !== testRole);
    
    if (hasWrongRoles) {
      console.log("❌ ERROR: Query returned users with wrong roles!");
      exactResults.forEach(u => {
        if (u.role !== testRole) {
          console.log(`  ❌ ${u.username} has role '${u.role}' but should be '${testRole}'`);
        }
      });
    } else {
      console.log(`✓ Query correctly returns only users with role '${testRole}'`);
    }

    await mongoose.connection.close();
    console.log("\n✓ Test completed. Database connection closed.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

testRoleFiltering();

