const request = require("supertest");
const mongoose = require("mongoose");
const app = require("./testServer");
const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

const MONGODB_URI = "mongodb://localhost:27017/legitevents_test";

describe("Admin Endpoints", () => {
  let adminUser, clientUser, subAdminUser, adminToken, clientToken;

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

    subAdminUser = await User.create({
      username: "subadmin",
      email: "subadmin@test.com",
      password: "password123",
      fullName: "Test Sub Admin",
      role: "sub-admin",
      country: "KE",
    });

    adminToken = adminUser.getSignedJwtToken();
    clientToken = clientUser.getSignedJwtToken();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("GET /api/admin/dashboard", () => {
    it("should return dashboard stats for admin", async () => {
      const response = await request(app)
        .get("/api/admin/dashboard")
        .set("Cookie", `token=${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("totalUsers");
      expect(response.body.data).toHaveProperty("totalClients");
      expect(response.body.data).toHaveProperty("totalSubAdmins");
      expect(response.body.data).toHaveProperty("totalEvents");
      expect(response.body.data).toHaveProperty("totalTickets");
      expect(response.body.data).toHaveProperty("totalRevenue");
    });

    it("should fail for non-admin users", async () => {
      const response = await request(app)
        .get("/api/admin/dashboard")
        .set("Cookie", `token=${clientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it("should fail without authentication", async () => {
      const response = await request(app)
        .get("/api/admin/dashboard")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/admin/clients", () => {
    it("should return list of clients for admin", async () => {
      const response = await request(app)
        .get("/api/admin/clients")
        .set("Cookie", `token=${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.clients).toBeDefined();
      expect(Array.isArray(response.body.clients)).toBe(true);
    });

    it("should fail for client users", async () => {
      const response = await request(app)
        .get("/api/admin/clients")
        .set("Cookie", `token=${clientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/admin/clients/:id", () => {
    it("should delete client successfully", async () => {
      const response = await request(app)
        .delete(`/api/admin/clients/${clientUser._id}`)
        .set("Cookie", `token=${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted successfully");

      // Verify user is deleted
      const deletedUser = await User.findById(clientUser._id);
      expect(deletedUser).toBeNull();
    });

    it("should fail for non-admin users", async () => {
      const response = await request(app)
        .delete(`/api/admin/clients/${clientUser._id}`)
        .set("Cookie", `token=${clientToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it("should fail for non-existent user", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/admin/clients/${fakeId}`)
        .set("Cookie", `token=${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
