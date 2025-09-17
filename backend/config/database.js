const { Sequelize } = require('sequelize');

const connectDB = async () => {
  try {
    const sequelize = new Sequelize(
      process.env.DATABASE_URL || "postgresql://postgres:[YOUR-PASSWORD]@db.qqpsgaodegzxlsmcwpua.supabase.co:5432/postgres",
      {
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

    // Test the connection
    await sequelize.authenticate();
    console.log('PostgreSQL Connected successfully');

    // Handle connection events
    sequelize.connectionManager.on('error', (err) => {
      console.error('PostgreSQL connection error:', err);
    });

    sequelize.connectionManager.on('disconnected', () => {
      console.log('PostgreSQL disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await sequelize.close();
      console.log('PostgreSQL connection closed through app termination');
      process.exit(0);
    });

    return sequelize;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
