const mongoose = require("mongoose");

// Global test setup
beforeAll(async () => {
  // Suppress console logs during tests
  if (process.env.NODE_ENV === "test") {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(async () => {
  // Clean up any remaining connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Increase timeout for database operations
jest.setTimeout(10000);
