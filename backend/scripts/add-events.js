const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const User = require("../models/User");
const Event = require("../models/Event");

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/legitevents"
    );
    console.log("MongoDB Connected for adding events");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// Sample events to add
const newEvents = [
  {
    title: "Kenya Tech Innovation Summit 2024",
    description:
      "Join Kenya's leading tech innovators, entrepreneurs, and investors for a day of networking, learning, and collaboration. Featuring keynote speakers from Silicon Valley and local tech giants.",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    location: "Radisson Blu Hotel, Nairobi",
    price: 12000,
    currency: "KES",
    category: "conference",
    capacity: 300,
    status: "published",
    publishedAt: new Date(),
    image: "tech-summit-2024.jpg",
    tags: ["technology", "innovation", "startups", "networking"],
  },
  {
    title: "React & Next.js Masterclass",
    description:
      "Deep dive into React 18 and Next.js 14 with hands-on projects. Perfect for developers looking to master modern React development and server-side rendering.",
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    location: "Andela Kenya, Nairobi",
    price: 15000,
    currency: "KES",
    category: "workshop",
    capacity: 25,
    status: "published",
    publishedAt: new Date(),
    image: "react-workshop.jpg",
    tags: ["react", "nextjs", "javascript", "frontend"],
  },
  {
    title: "Blockchain & Cryptocurrency Conference",
    description:
      "Explore the future of blockchain technology and cryptocurrency in East Africa. Learn about DeFi, NFTs, and blockchain solutions for African businesses.",
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
    location: "Safari Park Hotel, Nairobi",
    price: 18000,
    currency: "KES",
    category: "conference",
    capacity: 200,
    status: "published",
    publishedAt: new Date(),
    image: "blockchain-conference.jpg",
    tags: ["blockchain", "cryptocurrency", "defi", "fintech"],
  },
  {
    title: "Data Science & AI Workshop",
    description:
      "Hands-on workshop covering Python, machine learning, and data visualization. Perfect for beginners and intermediate data scientists.",
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    location: "Strathmore University, Nairobi",
    price: 20000,
    currency: "KES",
    category: "workshop",
    capacity: 40,
    status: "published",
    publishedAt: new Date(),
    image: "data-science-workshop.jpg",
    tags: ["data science", "python", "machine learning", "ai"],
  },
  {
    title: "East African Startup Pitch Competition",
    description:
      "Watch innovative startups from across East Africa pitch their ideas to a panel of investors. Winner takes home KES 1M in funding!",
    date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
    location: "Nairobi Garage, Nairobi",
    price: 5000,
    currency: "KES",
    category: "networking",
    capacity: 150,
    status: "published",
    publishedAt: new Date(),
    image: "startup-pitch.jpg",
    tags: ["startups", "pitching", "investment", "entrepreneurship"],
  },
  {
    title: "Cybersecurity Awareness Seminar",
    description:
      "Learn essential cybersecurity practices for businesses and individuals. Protect yourself from cyber threats and data breaches.",
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    location: "KCB Leadership Centre, Nairobi",
    price: 8000,
    currency: "KES",
    category: "seminar",
    capacity: 80,
    status: "published",
    publishedAt: new Date(),
    image: "cybersecurity-seminar.jpg",
    tags: ["cybersecurity", "security", "privacy", "protection"],
  },
  {
    title: "Mobile App Development Bootcamp",
    description:
      "Intensive 3-day bootcamp covering React Native, Flutter, and native iOS/Android development. Build and deploy your first mobile app.",
    date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days from now
    location: "Moringa School, Nairobi",
    price: 25000,
    currency: "KES",
    category: "workshop",
    capacity: 30,
    status: "published",
    publishedAt: new Date(),
    image: "mobile-bootcamp.jpg",
    tags: ["mobile development", "react native", "flutter", "ios", "android"],
  },
  {
    title: "Digital Marketing Masterclass",
    description:
      "Comprehensive digital marketing training covering SEO, social media marketing, email campaigns, and Google Ads. Perfect for marketers and business owners.",
    date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
    location: "Digital Marketing Institute, Nairobi",
    price: 16000,
    currency: "KES",
    category: "seminar",
    capacity: 60,
    status: "published",
    publishedAt: new Date(),
    image: "digital-marketing.jpg",
    tags: ["digital marketing", "seo", "social media", "google ads"],
  },
  {
    title: "Cloud Computing & DevOps Workshop",
    description:
      "Learn AWS, Azure, Docker, and Kubernetes. Deploy applications to the cloud and master DevOps practices for modern software development.",
    date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
    location: "Microsoft Kenya, Nairobi",
    price: 22000,
    currency: "KES",
    category: "workshop",
    capacity: 35,
    status: "published",
    publishedAt: new Date(),
    image: "cloud-devops.jpg",
    tags: ["cloud computing", "aws", "azure", "docker", "kubernetes"],
  },
  {
    title: "Women in Tech Networking Event",
    description:
      "Celebrate and connect with women in technology across East Africa. Featuring inspiring speakers, mentorship opportunities, and career development sessions.",
    date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
    location: "iHub, Nairobi",
    price: 3000,
    currency: "KES",
    category: "networking",
    capacity: 120,
    status: "published",
    publishedAt: new Date(),
    image: "women-in-tech.jpg",
    tags: ["women in tech", "networking", "mentorship", "career development"],
  },
];

// Function to add events
const addEvents = async () => {
  try {
    console.log("🚀 Starting to add events to the system...\n");

    // Find or create an admin user to be the creator
    let adminUser = await User.findOne({ role: "super-admin" });

    if (!adminUser) {
      console.log("⚠️  No super-admin found. Creating one...");
      adminUser = await User.create({
        username: "system-admin",
        email: "admin@legitevents.com",
        password: "Admin123!",
        fullName: "System Administrator",
        phone: "254712345678",
        country: "KE",
        role: "super-admin",
        isActive: true,
        emailVerified: true,
      });
      console.log("✅ Super-admin created");
    }

    console.log(
      `📋 Found admin user: ${adminUser.fullName} (${adminUser.email})\n`
    );

    // Check if events already exist
    const existingEvents = await Event.find({});
    console.log(`📊 Current events in database: ${existingEvents.length}\n`);

    // Add events with admin as creator
    const eventsWithCreator = newEvents.map((event) => ({
      ...event,
      createdBy: adminUser._id,
      lastModifiedBy: adminUser._id,
      availableTickets: event.capacity,
    }));

    const createdEvents = await Event.insertMany(eventsWithCreator);

    console.log(
      `✅ Successfully added ${createdEvents.length} events to the system!\n`
    );

    // Display summary
    console.log("📋 Event Summary:");
    createdEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   📅 Date: ${event.date.toLocaleDateString()}`);
      console.log(`   📍 Location: ${event.location}`);
      console.log(`   💰 Price: ${event.price} ${event.currency}`);
      console.log(`   🎫 Capacity: ${event.capacity} tickets`);
      console.log(`   📂 Category: ${event.category}`);
      console.log("");
    });

    console.log(
      "🎉 All events are now available in both admin and user dashboards!"
    );
    console.log("🔗 You can view them at:");
    console.log("   - Admin Dashboard: http://localhost:3000/admin");
    console.log("   - User Dashboard: http://localhost:3000/");
  } catch (error) {
    console.error("❌ Error adding events:", error.message);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await addEvents();
    console.log("\n🏁 Event addition completed successfully!");
  } catch (error) {
    console.error("💥 Script failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { addEvents, newEvents };
