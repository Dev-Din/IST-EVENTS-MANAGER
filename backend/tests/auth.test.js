const request = require("supertest");
const mongoose = require("mongoose");
const app = require("./testServer");
const User = require("../models/User");

// Test database
const MONGODB_URI = "mongodb://localhost:27017/legitevents_test";

describe("Authentication Endpoints", () => {
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

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        country: "KE",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe("client");
      expect(response.body.token).toBeDefined();
    });

    it("should fail with duplicate email", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        country: "KE",
      };

      // Create first user
      await request(app).post("/api/auth/register").send(userData);

      // Try to create duplicate
      const response = await request(app)
        .post("/api/auth/register")
        .send({ ...userData, username: "testuser2" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    it("should fail with invalid email format", async () => {
      const userData = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
        fullName: "Test User",
        country: "KE",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create test user
      await User.create({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        country: "KE",
      });
    });

    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.token).toBeDefined();
    });

    it("should fail with invalid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should fail with non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    let authToken;

    beforeEach(async () => {
      // Create and login user
      const user = await User.create({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        country: "KE",
      });
      authToken = user.getSignedJwtToken();
    });

    it("should return user data for authenticated user", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `token=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe("test@example.com");
    });

    it("should fail without authentication token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Not authorized");
    });
  });
});
