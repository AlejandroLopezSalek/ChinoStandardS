const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration
 * Handles connection, reconnection, and error handling
 */

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chinostandard';

    // MongoDB connection options
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000, // 15s — gives enough time on nodemon restart
      socketTimeoutMS: 45000,
      family: 4,
      bufferCommands: false,
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

    if (process.env.NODE_ENV === 'production') {
      // In production, crash the process so the container/PM2 can restart it
      process.exit(1);
    } else {
      // In development, retry after 5s — don't kill the server
      console.warn(' [Dev] MongoDB not ready yet — retrying in 5s...');
      setTimeout(connectDB, 5000);
    }
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
        const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chinostandard';
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