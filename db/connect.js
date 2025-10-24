// // db/connect.js
// const mongoose = require("mongoose");

// const connectDB = (url) => {
//   const connectWithRetry = async () => {
//     try {
//       await mongoose.connect(url, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//         serverSelectionTimeoutMS: 10000, // 10s timeout
//       });
//       console.log("✅ MongoDB connected successfully");
//     } catch (err) {
//       console.error("❌ MongoDB connection error:", err.message);
//       console.log("🔁 Retrying connection in 5 seconds...");
//       setTimeout(connectWithRetry, 5000);
//     }
//   };

//   // Event listeners for reliability
//   mongoose.connection.on("connected", () => {
//     console.log("🟢 Mongoose connected to DB");
//   });

//   mongoose.connection.on("error", (err) => {
//     console.error("❌ Mongoose connection error:", err.message);
//   });

//   mongoose.connection.on("disconnected", () => {
//     console.warn("⚠️ Mongoose disconnected. Retrying in 5 seconds...");
//     setTimeout(connectWithRetry, 5000);
//   });

//   mongoose.connection.on("reconnected", () => {
//     console.log("🟢 Mongoose reconnected!");
//   });

//   // Initial connection
//   connectWithRetry();
// };

// module.exports = connectDB;

const mongoose = require('mongoose');

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 5000;

const getMongoUri = (url) => {
  if (url && url.trim() !== '') return url;
  if (process.env.MONGO_URI && process.env.MONGO_URI.trim() !== '') return process.env.MONGO_URI;

  const user = encodeURIComponent(process.env.MONGO_USER || '');
  const pass = encodeURIComponent(process.env.MONGO_PASSWORD || '');
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'test';
  const auth = user && pass ? `${user}:${pass}@` : '';
  const authSource = user && pass ? '?authSource=admin' : '';
  return `mongodb://${auth}${host}:${port}/${db}${authSource}`;
};

// Connect with retry/backoff. Returns when connected.
const connectWithRetry = async (uri, attempt = 0) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
    });
    console.log('✅ MongoDB connected');
    return;
  } catch (err) {
    const nextAttempt = attempt + 1;
    const delay = Math.min(30000, 2000 + attempt * 2000);
    console.error(`❌ MongoDB connection error (attempt ${nextAttempt}):`, err.message);
    console.log(`🔁 Retrying MongoDB connection in ${delay}ms...`);
    await new Promise((res) => setTimeout(res, delay));
    return connectWithRetry(uri, nextAttempt);
  }
};

const attachListeners = () => {
  mongoose.connection.on('connected', () => {
    console.log('🟢 Mongoose connected to DB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err && err.message ? err.message : err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Mongoose disconnected. Will attempt reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🟢 Mongoose reconnected');
  });
};

/**
 * connectDB(url?) -> Promise
 * - url (optional): explicit MongoDB connection string. If omitted the function
 *   will prefer process.env.MONGO_URI or construct one from MONGO_* env vars.
 * - Returns: resolves once a successful connection is established.
 */
const connectDB = async (url) => {
  attachListeners();
  const uri = getMongoUri(url);
  await connectWithRetry(uri, 0);
};

module.exports = connectDB;