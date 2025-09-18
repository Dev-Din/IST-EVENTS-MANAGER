const request = require("supertest");
const mongoose = require("mongoose");
const app = require("./testServer");
const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

const MONGODB_URI = "mongodb://localhost:27017/legitevents_test";

describe("Tickets Endpoints", () => {
  let adminUser, clientUser, testEvent, adminToken, clientToken;

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
    await User.deleteMany({});
    await Event.deleteMany({});
    await Ticket.deleteMany({});

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

    // Create test event
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

    adminToken = adminUser.getSignedJwtToken();
    clientToken = clientUser.getSignedJwtToken();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Ticket.deleteMany({});
  });

  describe("POST /api/tickets/purchase", () => {
    it("should purchase tickets successfully", async () => {
      const ticketData = {
        eventId: testEvent._id,
        quantity: 2,
        paymentMethod: "mobile_money",
      };

      const response = await request(app)
        .post("/api/tickets/purchase")
        .set("Cookie", `token=${clientToken}`)
        .send(ticketData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(2);
      expect(response.body.data.totalPrice).toBe(2000); // 2 * 1000
      expect(response.body.data.ticketNumber).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const ticketData = {
        eventId: testEvent._id,
        quantity: 1,
        paymentMethod: "mobile_money",
      };

      const response = await request(app)
        .post("/api/tickets/purchase")
        .send(ticketData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should fail with invalid quantity", async () => {
      const ticketData = {
        eventId: testEvent._id,
        quantity: 0, // Invalid
        paymentMethod: "mobile_money",
      };

      const response = await request(app)
        .post("/api/tickets/purchase")
        .set("Cookie", `token=${clientToken}`)
        .send(ticketData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/tickets/my-tickets", () => {
    beforeEach(async () => {
      // Create test ticket
      await Ticket.create({
        event: testEvent._id,
        user: clientUser._id,
        quantity: 1,
        totalPrice: 1000,
        paymentMethod: "mobile_money",
        status: "confirmed",
        paymentStatus: "completed",
      });
    });

    it("should return user tickets", async () => {
      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Cookie", `token=${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].quantity).toBe(1);
    });

    it("should fail without authentication", async () => {
      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
