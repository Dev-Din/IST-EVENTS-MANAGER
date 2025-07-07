const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/event_organiser"
    );
    console.log("MongoDB Connected for seeding");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// Sample data
const sampleUsers = [
  {
    username: "superadmin",
    email: "superadmin@example.com",
    password: "password123",
    fullName: "Super Administrator",
    phone: "+1234567890",
    role: "super-admin",
    isActive: true,
    emailVerified: true,
  },
  {
    username: "subadmin1",
    email: "subadmin1@example.com",
    password: "password123",
    fullName: "John Smith",
    phone: "+1234567891",
    role: "sub-admin",
    permissions: ["events", "tickets", "reports"],
    isActive: true,
    emailVerified: true,
  },
  {
    username: "subadmin2",
    email: "subadmin2@example.com",
    password: "password123",
    fullName: "Jane Doe",
    phone: "+1234567892",
    role: "sub-admin",
    permissions: ["events", "tickets"],
    isActive: true,
    emailVerified: true,
  },
  {
    username: "client1",
    email: "client1@example.com",
    password: "password123",
    fullName: "Alice Johnson",
    phone: "+1234567893",
    role: "client",
    isActive: true,
    emailVerified: true,
  },
  {
    username: "client2",
    email: "client2@example.com",
    password: "password123",
    fullName: "Bob Wilson",
    phone: "+1234567894",
    role: "client",
    isActive: true,
    emailVerified: true,
  },
  {
    username: "client3",
    email: "client3@example.com",
    password: "password123",
    fullName: "Carol Brown",
    phone: "+1234567895",
    role: "client",
    isActive: true,
    emailVerified: true,
  },
];

const sampleEvents = [
  {
    name: "Tech Conference 2024",
    description:
      "Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge technologies.",
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    location: "San Francisco Convention Center, CA",
    charges: 299,
    category: "conference",
    capacity: 500,
    status: "published",
    isPublic: true,
    isFeatured: true,
    organizer: {
      name: "Tech Events Inc.",
      email: "info@techevents.com",
      phone: "+1-555-0123",
      website: "https://techevents.com",
    },
    venue: {
      name: "San Francisco Convention Center",
      address: {
        street: "747 Howard St",
        city: "San Francisco",
        state: "CA",
        zipCode: "94103",
        country: "USA",
      },
    },
    tags: ["technology", "conference", "networking", "innovation"],
  },
  {
    name: "Web Development Workshop",
    description:
      "Learn modern web development techniques with React, Node.js, and MongoDB in this hands-on workshop.",
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    location: "Downtown Learning Center, New York",
    charges: 199,
    category: "workshop",
    capacity: 50,
    status: "published",
    isPublic: true,
    organizer: {
      name: "Code Academy",
      email: "workshops@codeacademy.com",
      phone: "+1-555-0124",
    },
    tags: ["web development", "react", "nodejs", "mongodb"],
  },
  {
    name: "Digital Marketing Seminar",
    description:
      "Discover the latest trends and strategies in digital marketing to grow your business.",
    date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    location: "Business Hub, Chicago",
    charges: 149,
    category: "seminar",
    capacity: 100,
    status: "published",
    isPublic: true,
    organizer: {
      name: "Marketing Masters",
      email: "info@marketingmasters.com",
      phone: "+1-555-0125",
    },
    tags: ["marketing", "digital", "business", "strategy"],
  },
  {
    name: "Summer Music Festival",
    description:
      "Three days of amazing music featuring top artists from around the world.",
    date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    location: "Central Park, New York",
    charges: 89,
    category: "festival",
    capacity: 2000,
    status: "published",
    isPublic: true,
    isFeatured: true,
    organizer: {
      name: "Festival Productions",
      email: "info@festivalproductions.com",
      phone: "+1-555-0126",
    },
    tags: ["music", "festival", "outdoor", "entertainment"],
  },
  {
    name: "AI & Machine Learning Expo",
    description:
      "Explore the future of artificial intelligence and machine learning technologies.",
    date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    location: "Los Angeles Convention Center, CA",
    charges: 399,
    category: "exhibition",
    capacity: 800,
    status: "published",
    isPublic: true,
    isFeatured: true,
    organizer: {
      name: "AI Expo Group",
      email: "info@aiexpo.com",
      phone: "+1-555-0127",
    },
    tags: [
      "artificial intelligence",
      "machine learning",
      "technology",
      "innovation",
    ],
  },
  {
    name: "Startup Networking Event",
    description:
      "Connect with fellow entrepreneurs, investors, and startup enthusiasts.",
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    location: "WeWork Space, Austin",
    charges: 0, // Free event
    category: "networking",
    capacity: 80,
    status: "published",
    isPublic: true,
    organizer: {
      name: "Startup Community Austin",
      email: "events@startupaustin.com",
      phone: "+1-555-0128",
    },
    tags: ["startup", "networking", "entrepreneurship", "investors"],
  },
];

// Clear existing data
const clearData = async () => {
  try {
    await User.deleteMany({});
    await Event.deleteMany({});
    await Ticket.deleteMany({});
    console.log("Existing data cleared");
  } catch (error) {
    console.error("Error clearing data:", error);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const users = await User.insertMany(sampleUsers);
    console.log(`${users.length} users created`);
    return users;
  } catch (error) {
    console.error("Error seeding users:", error);
    throw error;
  }
};

// Seed events
const seedEvents = async (users) => {
  try {
    // Assign events to sub-admins
    const subAdmins = users.filter((user) => user.role === "sub-admin");

    const eventsWithCreators = sampleEvents.map((event, index) => {
      const creator = subAdmins[index % subAdmins.length];
      return {
        ...event,
        createdBy: creator._id,
        lastModifiedBy: creator._id,
        availableTickets: event.capacity,
      };
    });

    const events = await Event.insertMany(eventsWithCreators);
    console.log(`${events.length} events created`);
    return events;
  } catch (error) {
    console.error("Error seeding events:", error);
    throw error;
  }
};

// Seed tickets
const seedTickets = async (users, events) => {
  try {
    const clients = users.filter((user) => user.role === "client");
    const sampleTickets = [];

    // Create some sample ticket purchases
    for (let i = 0; i < 15; i++) {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const randomClient = clients[Math.floor(Math.random() * clients.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 tickets

      // Skip if not enough tickets available
      if (randomEvent.availableTickets < quantity) {
        continue;
      }

      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      const ticketNumber = `TKT-${timestamp}-${random}`.toUpperCase();
      const crypto = require('crypto');
      const qrCode = crypto.randomBytes(32).toString('hex');
      const barcode = crypto.randomBytes(16).toString('hex');

      const ticket = {
        ticketNumber,
        qrCode,
        barcode,
        event: randomEvent._id,
        purchaser: randomClient._id,
        attendee: {
          fullName: randomClient.fullName,
          email: randomClient.email,
          phone: randomClient.phone,
        },
        quantity,
        unitPrice: randomEvent.charges,
        totalAmount: quantity * randomEvent.charges,
        paymentDetails: {
          method: ["credit_card", "debit_card", "paypal"][
            Math.floor(Math.random() * 3)
          ],
          transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
          currency: "USD",
        },
        status: ["confirmed", "pending"][Math.floor(Math.random() * 2)],
      };

      sampleTickets.push(ticket);

      // Update event available tickets
      randomEvent.availableTickets -= quantity;
      await randomEvent.save();
    }

    if (sampleTickets.length > 0) {
      const tickets = await Ticket.insertMany(sampleTickets);
      console.log(`${tickets.length} tickets created`);
      return tickets;
    } else {
      console.log("No tickets created due to capacity constraints");
      return [];
    }
  } catch (error) {
    console.error("Error seeding tickets:", error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("🌱 Starting database seeding...");

    // Clear existing data
    await clearData();

    // Seed data in order
    const users = await seedUsers();
    const events = await seedEvents(users);
    const tickets = await seedTickets(users, events);

    console.log("\n✅ Database seeded successfully!");
    console.log("\n👥 Sample accounts created:");
    console.log("Super Admin: superadmin@example.com / password123");
    console.log("Sub Admin 1: subadmin1@example.com / password123");
    console.log("Sub Admin 2: subadmin2@example.com / password123");
    console.log("Client 1: client1@example.com / password123");
    console.log("Client 2: client2@example.com / password123");
    console.log("Client 3: client3@example.com / password123");

    console.log("\n📊 Data summary:");
    console.log(`- Users: ${users.length}`);
    console.log(`- Events: ${events.length}`);
    console.log(`- Tickets: ${tickets.length}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    mongoose.connection.close();
    console.log("\n🔐 Database connection closed");
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
