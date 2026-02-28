const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration
 * Handles connection, reconnection, and error handling
 */

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/turkamerica';

    // MongoDB connection options
    const options = {
      // Connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6

      // Mongoose-specific options
      bufferCommands: false, // Disable mongoose buffering
    };

    // Connect to MongoDB
    await mongoose.connect(mongoURI, options);

    console.log(' MongoDB connected successfully');
    console.log(` Database: ${mongoose.connection.name}`);
    console.log(` Host: ${mongoose.connection.host}`);

    // Set up connection event listeners
    setupConnectionListeners();

  } catch (error) {
    console.error(' MongoDB connection error:', error.message);
    console.log(' Troubleshooting tips:');
    console.log('  1. Make sure MongoDB is running');
    console.log('  2. Check your MONGODB_URI in .env file');
    console.log('  3. Verify network connectivity');
    console.log('  4. Check MongoDB logs for details');

    // Exit process with failure
    process.exit(1);
  }
};

/**
 * Setup connection event listeners for monitoring
 */
const setupConnectionListeners = () => {
  const conn = mongoose.connection;

  // Connection events
  conn.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
  });

  conn.on('error', (err) => {
    console.error(' Mongoose connection error:', err);
  });

  conn.on('disconnected', () => {
    console.log(' Mongoose disconnected from MongoDB');

    // Attempt to reconnect in production
    if (process.env.NODE_ENV === 'production') {
      console.log(' Attempting to reconnect...');
      setTimeout(() => {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/turkamerica';
        mongoose.connect(mongoURI, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4
        }).catch(err => {
          console.error(' Reconnection failed:', err.message);
        });
      }, 5000);
    }
  });

  conn.on('reconnected', () => {
    console.log(' Mongoose reconnected to MongoDB');
  });

  // Monitor slow queries in development
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      console.log(` Mongoose: ${collectionName}.${method}`, JSON.stringify(query));
    });
  }
};

/**
 * Gracefully close MongoDB connection
 */
const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Check if database is connected
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection status
 */
const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'N/A',
    name: mongoose.connection.name || 'N/A',
    collections: Object.keys(mongoose.connection.collections).length
  };
};

module.exports = {
  connectDB,
  closeDatabase,
  isDatabaseConnected,
  getDatabaseStatus
};