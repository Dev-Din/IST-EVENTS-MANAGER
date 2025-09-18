const request = require("supertest");
const mongoose = require("mongoose");
const app = require("./testServer");
const User = require("../models/User");
const Event = require("../models/Event");

const MONGODB_URI = "mongodb://localhost:27017/legitevents_test";

describe("Events Endpoints", () => {
  let adminUser, clientUser, adminToken, clientToken;

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    await User.deleteMany({});
    await Event.deleteMany({});

    // Create test users
    adminUser = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password123",
      fullName: "Test Admin",
      role: "super-admin",
      country: "KE",
    });

    clientUser = await User.create({
      username: "client",
      email: "client@test.com",
      password: "password123",
      fullName: "Test Client",
      country: "KE",
    });

    adminToken = adminUser.getSignedJwtToken();
    clientToken = clientUser.getSignedJwtToken();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Event.deleteMany({});
  });

  describe("GET /api/events", () => {
    it("should return all published events", async () => {
      // Create test events
      await Event.create({
        title: "Test Event 1",
        description: "Test Description",
        date: new Date(Date.now() + 86400000), // Tomorrow
        location: "Test Location",
        price: 1000,
        currency: "KES",
        capacity: 100,
        category: "conference",
        status: "published",
        createdBy: adminUser._id,
      });

      await Event.create({
        title: "Draft Event",
        description: "Test Description",
        date: new Date(Date.now() + 86400000),
        location: "Test Location",
        price: 1000,
        currency: "KES",
        capacity: 100,
        category: "conference",
        status: "draft", // Should not appear in results
        createdBy: adminUser._id,
      });

      const response = await request(app).get("/api/events").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1); // Only published events
      expect(response.body.data[0].title).toBe("Test Event 1");
    });
  });

  describe("POST /api/events", () => {
    it("should create event with admin authentication", async () => {
      const eventData = {
        title: "New Test Event",
        description: "Test Description",
        date: new Date(Date.now() + 86400000),
        location: "Test Location",
        price: 1500,
        currency: "KES",
        capacity: 50,
        category: "workshop",
      };

      const response = await request(app)
        .post("/api/events")
        .set("Cookie", `token=${adminToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
      expect(response.body.data.status).toBe("published"); // Auto-published
    });

    it("should fail without authentication", async () => {
      const eventData = {
        title: "New Test Event",
        description: "Test Description",
        date: new Date(Date.now() + 86400000),
        location: "Test Location",
        price: 1500,
        currency: "KES",
        capacity: 50,
        category: "workshop",
      };

      const response = await request(app)
        .post("/api/events")
        .send(eventData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/events/:id", () => {
    let testEvent;

    beforeEach(async () => {
      testEvent = await Event.create({
        title: "Test Event",
        description: "Test Description",
        date: new Date(Date.now() + 86400000),
        location: "Test Location",
        price: 1000,
        currency: "KES",
        capacity: 100,
        category: "conference",
        status: "published",
        createdBy: adminUser._id,
      });
    });

    it("should return specific event by ID", async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("Test Event");
      expect(response.body.data._id).toBe(testEvent._id.toString());
    });

    it("should return 404 for non-existent event", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/events/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
