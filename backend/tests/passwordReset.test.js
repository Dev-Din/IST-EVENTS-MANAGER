const request = require("supertest");
const mongoose = require("mongoose");
const app = require("./testServer");
const User = require("../models/User");

// Test database
const MONGODB_URI = "mongodb://localhost:27017/legitevents_test";

describe("Password Reset Endpoints", () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("POST /api/auth/forgot-password", () => {
    beforeEach(async () => {
      // Create test users
      await User.create({
        username: "clientuser",
        email: "client@test.com",
        password: "password123",
        fullName: "Test Client",
        role: "client",
        country: "KE",
      });

      await User.create({
        username: "subadmin",
        email: "subadmin@test.com",
        password: "password123",
        fullName: "Test Sub Admin",
        role: "sub-admin",
        country: "KE",
      });

      await User.create({
        username: "superadmin",
        email: "superadmin@test.com",
        password: "password123",
        fullName: "Test Super Admin",
        role: "super-admin",
        country: "KE",
      });
    });

    it("should send reset email for client user", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "client@test.com" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain(
        "New login credentials have been sent"
      );
    });

    it("should send reset email for sub-admin user", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "subadmin@test.com" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain(
        "New login credentials have been sent"
      );
    });

    it("should reject super-admin password reset", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "superadmin@test.com" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("No eligible user found");
    });

    it("should reject non-existent email", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@test.com" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("No eligible user found");
    });

    it("should require email field", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        "Please provide an email address"
      );
    });
  });

  describe("POST /api/auth/verify-temp-credentials", () => {
    let clientUser, tempPassword;

    beforeEach(async () => {
      // Create client user
      clientUser = await User.create({
        username: "clientuser",
        email: "client@test.com",
        password: "password123",
        fullName: "Test Client",
        role: "client",
        country: "KE",
      });

      // Simulate password reset process
      tempPassword = "temp123456";
      clientUser.password = tempPassword;
      clientUser.resetPasswordToken = "test-token";
      clientUser.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      await clientUser.save();
    });

    it("should verify temporary credentials successfully", async () => {
      const response = await request(app)
        .post("/api/auth/verify-temp-credentials")
        .send({
          email: "client@test.com",
          password: tempPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Temporary credentials verified");
      expect(response.body.requiresPasswordChange).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it("should reject expired temporary credentials", async () => {
      // Expire the token
      clientUser.resetPasswordExpire = Date.now() - 1000; // 1 second ago
      await clientUser.save();

      const response = await request(app)
        .post("/api/auth/verify-temp-credentials")
        .send({
          email: "client@test.com",
          password: tempPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        "Temporary credentials have expired"
      );
    });

    it("should reject invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/verify-temp-credentials")
        .send({
          email: "client@test.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid credentials");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      await User.create({
        username: "clientuser",
        email: "client@test.com",
        password: "password123",
        fullName: "Test Client",
        role: "client",
        country: "KE",
      });
    });

    it("should enforce rate limiting on forgot password", async () => {
      // Make 4 requests (exceeding the limit of 3)
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post("/api/auth/forgot-password")
          .send({ email: "client@test.com" });

        if (i < 3) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
          expect(response.body.message).toContain(
            "Too many password reset attempts"
          );
        }
      }
    });
  });
});
