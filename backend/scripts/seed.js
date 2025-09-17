const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const User = require("../models/User");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { DEFAULT_EVENT_CURRENCY } = require("../utils/eastAfricanCountries");

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/legitevents"
    );
    console.log("MongoDB Connected for seeding");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// Secure Superadmin Credential
// ⚠️  IMPORTANT: Store these credentials securely!
const SUPERADMIN_CREDENTIALS = {
  username: "Legit Events Admin",
  email: "admin@legitevents.com",
  password: "LE@dm1n2024$ecur3", // Strong password for production
  fullName: "LegitEvents System Administrator",
  phone: "+254 700 123 456", // Kenya phone number format
  country: "KE", // Kenya as default East African hub
  role: "super-admin",
  isActive: true,
  emailVerified: true,
};

const sampleEvents = [
  {
    title: "East African Tech Summit 2024",
    description:
      "Join us for the biggest tech conference in East Africa featuring industry leaders and cutting-edge technologies.",
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    location: "Kenyatta International Convention Centre, Nairobi",
    price: 15000,
    currency: "KES",
    category: "conference",
    capacity: 500,
    status: "published",
    isPublic: true,
    isFeatured: true,
    organizer: {
      title: "East Africa Tech Events",
      email: "info@eatechevents.com",
      phone: "+254 700 123 001",
      website: "https://eatechevents.com",
    },
    venue: {
      title: "Kenyatta International Convention Centre",
      address: {
        street: "Harambee Avenue",
        city: "Nairobi",
        state: "Nairobi County",
        zipCode: "00100",
        country: "Kenya",
      },
    },
    tags: ["technology", "conference", "networking", "innovation"],
  },
  {
    title: "Web Development Workshop",
    description:
      "Learn modern web development techniques with React, Node.js, and MongoDB in this hands-on workshop.",
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    location: "iHub, Nairobi",
    price: 8000,
    currency: "KES",
    category: "workshop",
    capacity: 50,
    status: "published",
    isPublic: true,
    organizer: {
      title: "Code Academy East Africa",
      email: "workshops@codeacademyea.com",
      phone: "+254 700 123 002",
    },
    tags: ["web development", "react", "nodejs", "mongodb"],
  },
  {
    title: "Digital Marketing Seminar",
    description:
      "Discover the latest trends and strategies in digital marketing to grow your business in East Africa.",
    date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    location: "Business Hub, Kampala",
    price: 150000,
    currency: "UGX",
    category: "seminar",
    capacity: 100,
    status: "published",
    isPublic: true,
    organizer: {
      title: "Marketing Masters East Africa",
      email: "info@marketingmastersea.com",
      phone: "+256 700 123 003",
    },
    tags: ["marketing", "digital", "business", "strategy"],
  },
  {
    title: "East African Music Festival",
    description:
      "Three days of amazing music featuring top artists from across East Africa.",
    date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    location: "Uhuru Park, Nairobi",
    price: 3500,
    currency: "KES",
    category: "festival",
    capacity: 2000,
    status: "published",
    isPublic: true,
    isFeatured: true,
    organizer: {
      title: "East Africa Festival Productions",
      email: "info@eafestivalproductions.com",
      phone: "+254 700 123 004",
    },
    tags: ["music", "festival", "outdoor", "entertainment"],
  },
  {
    title: "AI & Machine Learning Expo East Africa",
    description:
      "Explore the future of artificial intelligence and machine learning technologies in East Africa.",
    date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    location: "Julius Nyerere Convention Centre, Dar es Salaam",
    price: 200000,
    currency: "TZS",
    category: "conference",
    capacity: 800,
    status: "published",
    isPublic: true,
    isFeatured: true,
    organizer: {
      title: "AI Expo East Africa",
      email: "info@aiexpoea.com",
      phone: "+255 700 123 005",
    },
    tags: [
      "artificial intelligence",
      "machine learning",
      "technology",
      "innovation",
    ],
  },
  {
    title: "East African Startup Networking Event",
    description:
      "Connect with fellow entrepreneurs, investors, and startup enthusiasts across East Africa.",
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    location: "Kigali Convention Centre, Rwanda",
    price: 25000,
    currency: "RWF",
    category: "networking",
    capacity: 80,
    status: "published",
    isPublic: true,
    organizer: {
      title: "East Africa Startup Community",
      email: "events@eastafricastartups.com",
      phone: "+250 700 123 006",
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

// Create superadmin user
const createSuperAdmin = async () => {
  try {
    console.log("Creating superadmin...");

    // Check if superadmin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { email: SUPERADMIN_CREDENTIALS.email },
        { username: SUPERADMIN_CREDENTIALS.username },
      ],
    });

    if (existingAdmin) {
      console.log("Superadmin already exists, skipping creation");
      return existingAdmin;
    }

    const superAdmin = new User(SUPERADMIN_CREDENTIALS);
    await superAdmin.save();
    console.log(
      `✓ Superadmin created: ${superAdmin.email} (${superAdmin._id})`
    );

    return superAdmin;
  } catch (error) {
    console.error("Error creating superadmin:", error);
    throw error;
  }
};

// Seed sample events (created by superadmin)
const seedEvents = async (superAdmin) => {
  try {
    console.log("Creating sample events...");

    const eventsWithCreator = sampleEvents.map((event) => ({
      ...event,
      createdBy: superAdmin._id,
      lastModifiedBy: superAdmin._id,
      availableTickets: event.capacity,
    }));

    const events = await Event.insertMany(eventsWithCreator);
    console.log(`✓ ${events.length} sample events created`);
    return events;
  } catch (error) {
    console.error("Error seeding events:", error);
    throw error;
  }
};

// No demo tickets will be created - users will purchase tickets naturally

// Main seeding function
const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("🌱 Starting LegitEvents database initialization...");

    // Clear existing data
    await clearData();

    // Create superadmin
    const superAdmin = await createSuperAdmin();

    // Create sample events
    const events = await seedEvents(superAdmin);

    // Verify data was saved
    console.log("\n🔍 Verifying data...");
    const userCount = await User.countDocuments();
    const eventCount = await Event.countDocuments();
    const ticketCount = await Ticket.countDocuments();

    console.log(
      `✓ Verified counts - Users: ${userCount}, Events: ${eventCount}, Tickets: ${ticketCount}`
    );

    console.log("\n✅ Database initialized successfully!");
    console.log("\n🔐 SUPERADMIN CREDENTIALS - STORE THESE SECURELY:");
    console.log("═".repeat(60));
    console.log(`📧 Email: ${SUPERADMIN_CREDENTIALS.email}`);
    console.log(`👤 Username: ${SUPERADMIN_CREDENTIALS.username}`);
    console.log(`🔑 Password: ${SUPERADMIN_CREDENTIALS.password}`);
    console.log("═".repeat(60));
    console.log("⚠️  IMPORTANT: Change this password after first login!");

    console.log("\n📊 System summary:");
    console.log(`- Superadmin created: 1`);
    console.log(`- Sample events: ${events.length}`);
    console.log(`- Demo tickets: 0 (users will purchase naturally)`);
    console.log(
      "\n🚀 System ready! Superadmin can now login and create sub-admins."
    );
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    console.error("Stack:", error.stack);
  } finally {
    console.log("\n🔐 Closing database connection...");
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
