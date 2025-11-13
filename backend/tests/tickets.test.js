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
        ticketPrice: 1000,
        processingFee: 1.5,
        totalPrice: 1001.5,
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
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].quantity).toBe(1);
      expect(response.body.data[0].event).toBeDefined();
      expect(response.body.data[0].event.title).toBeDefined();
      expect(response.body.data[0].event.date).toBeDefined();
    });

    it("should return empty array when user has no tickets", async () => {
      // Create a new user with no tickets
      const newUser = await User.create({
        username: "newuser",
        email: "newuser@test.com",
        password: "password123",
        fullName: "New User",
        country: "KE",
      });
      const newUserToken = newUser.getSignedJwtToken();

      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Cookie", `token=${newUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it("should populate event data correctly", async () => {
      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Cookie", `token=${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const ticket = response.body.data[0];
      expect(ticket.event).toBeDefined();
      expect(ticket.event.title).toBe(testEvent.title);
      expect(ticket.event.date).toBeDefined();
      expect(ticket.event.location).toBe(testEvent.location);
      expect(ticket.event.price).toBe(testEvent.price);
    });

    it("should handle tickets with deleted events gracefully", async () => {
      // Create a ticket, then delete the event
      const tempEvent = await Event.create({
        title: "Temp Event",
        description: "Temp Description",
        date: new Date(Date.now() + 86400000),
        location: "Temp Location",
        price: 500,
        currency: "KES",
        capacity: 50,
        category: "conference",
        status: "published",
        createdBy: adminUser._id,
      });

      await Ticket.create({
        event: tempEvent._id,
        user: clientUser._id,
        quantity: 1,
        ticketPrice: 500,
        processingFee: 1.5,
        totalPrice: 501.5,
        paymentMethod: "mobile_money",
        status: "confirmed",
        paymentStatus: "completed",
      });

      // Delete the event
      await Event.findByIdAndDelete(tempEvent._id);

      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Cookie", `token=${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should still return tickets, but event may be null
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should only return tickets for the authenticated user", async () => {
      // Create another user with tickets
      const otherUser = await User.create({
        username: "otheruser",
        email: "otheruser@test.com",
        password: "password123",
        fullName: "Other User",
        country: "KE",
      });

      await Ticket.create({
        event: testEvent._id,
        user: otherUser._id,
        quantity: 2,
        ticketPrice: 2000,
        processingFee: 1.5,
        totalPrice: 2001.5,
        paymentMethod: "mobile_money",
        status: "confirmed",
        paymentStatus: "completed",
      });

      const response = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Cookie", `token=${clientToken}`)
        .expect(200);

      // Should only return clientUser's tickets, not otherUser's
      expect(response.body.success).toBe(true);
      response.body.data.forEach((ticket) => {
        expect(ticket.user._id.toString()).toBe(clientUser._id.toString());
      });
    });
  });

  describe("GET /api/tickets/:id/download", () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = await Ticket.create({
        event: testEvent._id,
        user: clientUser._id,
        quantity: 1,
        ticketPrice: 1000,
        processingFee: 1.5,
        totalPrice: 1001.5,
        paymentMethod: "mobile_money",
        status: "confirmed",
        paymentStatus: "completed",
      });
    });

    it("should download ticket PDF for ticket owner", async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}/download`)
        .set("Cookie", `token=${clientToken}`)
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.headers["content-disposition"]).toContain(
        `filename="ticket-${testTicket.ticketNumber}.pdf"`
      );
    });

    it("should fail for non-owner", async () => {
      const otherUser = await User.create({
        username: "otheruser2",
        email: "otheruser2@test.com",
        password: "password123",
        fullName: "Other User 2",
        country: "KE",
      });
      const otherToken = otherUser.getSignedJwtToken();

      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}/download`)
        .set("Cookie", `token=${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it("should fail without authentication", async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}/download`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/tickets/download-all", () => {
    beforeEach(async () => {
      // Create multiple confirmed tickets
      await Ticket.create({
        event: testEvent._id,
        user: clientUser._id,
        quantity: 1,
        ticketPrice: 1000,
        processingFee: 1.5,
        totalPrice: 1001.5,
        paymentMethod: "mobile_money",
        status: "confirmed",
        paymentStatus: "completed",
      });

      await Ticket.create({
        event: testEvent._id,
        user: clientUser._id,
        quantity: 2,
        ticketPrice: 2000,
        processingFee: 1.5,
        totalPrice: 2001.5,
        paymentMethod: "mobile_money",
        status: "confirmed",
        paymentStatus: "completed",
      });
    });

    it("should download all tickets as PDF", async () => {
      const response = await request(app)
        .get("/api/tickets/download-all")
        .set("Cookie", `token=${clientToken}`)
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.headers["content-disposition"]).toContain(
        "filename=\"my-tickets-"
      );
    });

    it("should return 404 when user has no confirmed tickets", async () => {
      const newUser = await User.create({
        username: "newuser2",
        email: "newuser2@test.com",
        password: "password123",
        fullName: "New User 2",
        country: "KE",
      });
      const newUserToken = newUser.getSignedJwtToken();

      const response = await request(app)
        .get("/api/tickets/download-all")
        .set("Cookie", `token=${newUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
