'use strict';

// Fix SSL/TLS issues on Render (Node 24 OpenSSL 3 vs MongoDB Atlas)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

// Inventory reservation system
const inventory = require('./src/inventory/reservation');
const inventoryRoutes = require('./src/routes/inventory');
const { withLock } = require('./src/inventory/lock');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Rate limiter for auth endpoints (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,                // 5 requests per minute per IP
  message: { success: false, message: 'Too many attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== MongoDB + In-Memory Cache Storage =====
let mongoClient = null;
let mongoDb = null;
const dataCache = {};
global.dataCache = dataCache; // Expose cache for route modules (dashboard.js etc)
const COLLECTIONS = ['users', 'products', 'orders', 'carts', 'notifications', 'messages', 'conversations', 'reservations'];

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('⚠️ MONGODB_URI not set, using file storage fallback');
    return false;
  }

  console.log('🔌 Connecting to MongoDB URI:', uri.substring(0, 35) + '...');
  try {
    // Simplest possible connection — let mongoose/driver handle TLS automatically
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    mongoDb = mongoose.connection.db;
    console.log('✅ Connected to MongoDB Atlas via Mongoose');

    // Load each collection into cache (merge with existing cache if present)
    for (const col of COLLECTIONS) {
      const docs = await mongoDb.collection(col).find({}).toArray();
      if (docs.length > 0) {
        const existingIds = new Set((dataCache[col] || []).map(d => d._id));
        const newDocs = docs.filter(d => !existingIds.has(d._id));
        dataCache[col] = [...(dataCache[col] || []), ...newDocs];
        console.log(`  📂 ${col}: ${newDocs.length} new records merged from MongoDB (${dataCache[col].length} total)`);
      } else {
        // Seed from JSON file if MongoDB is empty
        const filePath = path.join(__dirname, './data', `${col}.json`);
        if (fs.existsSync(filePath)) {
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (fileData.length > 0) {
            await mongoDb.collection(col).insertMany(fileData);
            console.log(`  🌱 ${col}: seeded ${fileData.length} records from file`);
          }
          dataCache[col] = fileData;
        } else if (col === 'users') {
          // Seed default users if no file exists
          const defaultUsers = [
            {
              _id: '1760257427529',
              email: 'tanmaytr05@gmail.com',
              password: '$2b$10$GOmHIYxLgWQ5btaZcLMT0u20AQWfqIvzlmfNmg8oCN2gYtoh2Otki',
              name: 'Tanmay',
              role: 'admin',
              createdAt: new Date().toISOString(),
              company: { name: 'ABC' }
            },
            {
              _id: '1760360335467',
              email: 'tanmaytalanki.cs23@bmsce.ac.in',
              password: '$2a$10$VF/J280U3qhLSrs.Fwnp4OlKCa8nM2MqQzCi9YqsRi6pOwJCKz/De',
              name: 'Tanmay T',
              company: { name: 'BCD' },
              role: 'buyer',
              createdAt: new Date().toISOString()
            }
          ];
          await mongoDb.collection('users').insertMany(defaultUsers);
          dataCache['users'] = defaultUsers;
          console.log(`  🌱 users: seeded ${defaultUsers.length} default users`);
        } else {
          dataCache[col] = [];
        }
      }
    }
    console.log('✅ Data loaded into memory cache');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️ Falling back to file storage, will retry every 30s...');
    
    // Retry connection every 30 seconds until success
    const retryInterval = setInterval(async () => {
      try {
        try { await mongoose.disconnect(); } catch(e) {}
        
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        mongoDb = mongoose.connection.db;
        console.log('✅ Connected to MongoDB Atlas on retry!');
        
        for (const col of COLLECTIONS) {
          const docs = await mongoDb.collection(col).find({}).toArray();
          if (docs.length > 0) {
            // MERGE: keep existing cache entries + add MongoDB docs (don't overwrite cache)
            const existingIds = new Set((dataCache[col] || []).map(d => d._id));
            const newDocs = docs.filter(d => !existingIds.has(d._id));
            dataCache[col] = [...(dataCache[col] || []), ...newDocs];
            console.log(`  📂 ${col}: ${newDocs.length} new records merged from MongoDB (${dataCache[col].length} total)`);
          } else {
            // MongoDB empty — seed from file or defaults
            const filePath = path.join(__dirname, './data', `${col}.json`);
            if (fs.existsSync(filePath)) {
              const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              if (fileData.length > 0) {
                await mongoDb.collection(col).insertMany(fileData);
                console.log(`  🌱 ${col}: seeded ${fileData.length} records from file`);
              }
              dataCache[col] = fileData;
            } else if (col === 'users' && (!dataCache['users'] || dataCache['users'].length === 0)) {
              const defaultUsers = [
                { _id: '1760257427529', email: 'tanmaytr05@gmail.com', password: '$2b$10$GOmHIYxLgWQ5btaZcLMT0u20AQWfqIvzlmfNmg8oCN2gYtoh2Otki', name: 'Tanmay', role: 'admin', createdAt: new Date().toISOString(), company: { name: 'ABC' } },
                { _id: '1760360335467', email: 'tanmaytalanki.cs23@bmsce.ac.in', password: '$2a$10$VF/J280U3qhLSrs.Fwnp4OlKCa8nM2MqQzCi9YqsRi6pOwJCKz/De', name: 'Tanmay T', company: { name: 'BCD' }, role: 'buyer', createdAt: new Date().toISOString() }
              ];
              await mongoDb.collection('users').insertMany(defaultUsers);
              dataCache['users'] = defaultUsers;
              console.log(`  🌱 users: seeded ${defaultUsers.length} default users`);
            } else {
              if (!dataCache[col]) dataCache[col] = [];
            }
          }
        }
        console.log('✅ Data loaded into memory cache');
        clearInterval(retryInterval);
      } catch (retryErr) {
        console.log('⏳ MongoDB retry failed, will try again in 30s...');
      }
    }, 30000);
    
    return false;
  }
}

// Get collection name from file path
function getCollectionName(filePath) {
  const basename = path.basename(filePath, '.json');
  return basename;
}

// Helper to read data (from in-memory cache, fast & sync)
function readJsonFile(filePath) {
  const colName = getCollectionName(filePath);
  if (dataCache[colName] !== undefined) {
    return dataCache[colName];
  }
  // Fallback to file if not in cache
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Helper to write data (update cache immediately + persist to MongoDB in background)
function writeJsonFile(filePath, data) {
  const colName = getCollectionName(filePath);
  // Update cache immediately (sync, so reads see the change)
  dataCache[colName] = data;
  // Persist to MongoDB in background (fire-and-forget)
  if (mongoDb) {
    persistToMongo(colName, data).catch(err => {
      console.error(`MongoDB write error (${colName}):`, err.message);
    });
  }
}

// Persist data to MongoDB (upsert all docs, delete removed ones)
async function persistToMongo(colName, data) {
  const col = mongoDb.collection(colName);
  if (data.length === 0) {
    await col.deleteMany({});
    return;
  }
  // Upsert each document by _id
  const ops = data.map(doc => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true
    }
  }));
  await col.bulkWrite(ops);
  // Delete documents that are no longer present
  const ids = data.map(d => d._id);
  await col.deleteMany({ _id: { $nin: ids } });
}

// Initialize storage
function initStorage() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create products.json if it doesn't exist
    const productsFile = path.join(dataDir, 'products.json');
    if (!fs.existsSync(productsFile)) {
      writeJsonFile(productsFile, []);
    }
    
    // Create users.json if it doesn't exist
    const usersFile = path.join(dataDir, 'users.json');
    if (!fs.existsSync(usersFile)) {
      writeJsonFile(usersFile, []);
    }
    
    // Pre-load ALL data files into cache immediately (synchronous, before MongoDB connects)
    // This ensures products/users are available from second 0, even before MongoDB connects
    for (const col of COLLECTIONS) {
      const filePath = path.join(__dirname, './data', `${col}.json`);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        dataCache[col] = fileData;
        console.log(`  📄 ${col}: ${fileData.length} records pre-loaded from file`);
      } else {
        dataCache[col] = [];
      }
    }
    
    console.log('✅ File storage initialized (cache pre-loaded)');
    return true;
  } catch (err) {
    console.error('Storage initialization error:', err);
    return false;
  }
}

// Enable CORS for frontend (allow local dev + the deployed frontend)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://techpharma.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['ETag']
}));

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      storage: mongoDb ? 'mongodb-atlas' : 'file-based',
      mongoConnected: !!mongoDb,
      nodeVersion: process.version
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error',
      message: 'Service unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Seed endpoint — creates default users + products if MongoDB is empty
app.get('/api/seed', async (req, res) => {
  try {
    if (!mongoDb) {
      return res.json({ success: false, message: 'MongoDB not connected' });
    }

    const results = [];

    // Seed users
    const existingUsers = await mongoDb.collection('users').countDocuments();
    if (existingUsers === 0) {
      const defaultUsers = [
        {
          _id: '1760257427529',
          email: 'tanmaytr05@gmail.com',
          password: '$2b$10$GOmHIYxLgWQ5btaZcLMT0u20AQWfqIvzlmfNmg8oCN2gYtoh2Otki',
          name: 'Tanmay',
          role: 'admin',
          createdAt: new Date().toISOString(),
          company: { name: 'ABC' }
        },
        {
          _id: '1760360335467',
          email: 'tanmaytalanki.cs23@bmsce.ac.in',
          password: '$2a$10$VF/J280U3qhLSrs.Fwnp4OlKCa8nM2MqQzCi9YqsRi6pOwJCKz/De',
          name: 'Tanmay T',
          company: { name: 'BCD' },
          role: 'buyer',
          createdAt: new Date().toISOString()
        }
      ];
      await mongoDb.collection('users').insertMany(defaultUsers);
      dataCache['users'] = defaultUsers;
      results.push(`Seeded ${defaultUsers.length} users`);
    } else {
      results.push(`Users already exist (${existingUsers})`);
    }

    // Seed products
    const existingProducts = await mongoDb.collection('products').countDocuments();
    if (existingProducts === 0) {
      const productsFile = path.join(__dirname, './data/products.json');
      if (fs.existsSync(productsFile)) {
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        if (products.length > 0) {
          await mongoDb.collection('products').insertMany(products);
          dataCache['products'] = products;
          results.push(`Seeded ${products.length} products`);
        }
      } else {
        results.push('No products.json file found');
      }
    } else {
      results.push(`Products already exist (${existingProducts})`);
    }

    res.json({ success: true, message: 'Seed complete', results });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug endpoint — list all users (emails only, no passwords)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({ _id: u._id, email: u.email, name: u.name, company: u.company, hasPassword: !!u.password }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug endpoint — check cache state
app.get('/api/debug/cache', (req, res) => {
  const result = {};
  for (const col of COLLECTIONS) {
    const data = dataCache[col] || [];
    if (col === 'products') {
      result[col] = data.map(p => ({ _id: p._id, name: p.name, userId: p.userId, status: p.status }));
    } else if (col === 'users') {
      result[col] = data.map(u => ({ _id: u._id, email: u.email }));
    } else {
      result[col] = data.length;
    }
  }
  result.mongoConnected = !!mongoDb;
  res.json(result);
});

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user data in request
    req.user = { 
      _id: decoded.userId,
      id: decoded.userId // Include both id formats for compatibility
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};



// Auth Routes
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Role is no longer required upfront — everyone can be both buyer & seller.
    // Default to 'member' (informational only; not used for access control).
    const role = req.body.role || 'member';

    // Read users from file
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role,
      company: req.body.companyName ? { name: req.body.companyName } : (req.body.company || {}),
      phone: req.body.phone || '',
      createdAt: new Date().toISOString()
    };

    // Add to users array and save
    users.push(user);
    writeJsonFile(usersFile, users);

    // Create welcome notification
    const notifFile = path.join(__dirname, './data/notifications.json');
    const allNotifs = readJsonFile(notifFile);
    allNotifs.push({
      _id: user._id + '-welcome',
      userId: user._id,
      title: 'Welcome to TechPharma!',
      message: 'Thank you for joining our platform.',
      read: false,
      archived: false,
      createdAt: new Date().toISOString()
    });
    writeJsonFile(notifFile, allNotifs);

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company || null,
        phone: user.phone || ''
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// ===== OTP for Signup =====
// In-memory OTP store (survives because Render is a persistent process)
const signupOtpStore = new Map();

// Email sender — tries Gmail API (HTTPS, port 443) → Resend → nodemailer fallback
const { google } = require('googleapis');

let gmailClient = null;
let gmailOauth2Client = null;
function getGmailClient() {
  if (!gmailClient) {
    gmailOauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    gmailOauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    gmailClient = google.gmail({ version: 'v1', auth: gmailOauth2Client });
  }
  return { gmail: gmailClient, oauth2Client: gmailOauth2Client };
}

const { Resend } = require('resend');
let resendClient = null;
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

async function sendEmail(to, subject, text, html) {
  // 1. Try Gmail API first (sends from techpharma10@gmail.com, uses HTTPS port 443)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
    try {
      const { gmail, oauth2Client } = getGmailClient();
      
      // Force refresh the access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('[Email] Gmail token refreshed, scope:', credentials.scope || 'unknown');
      
      const message = [
        `From: ${process.env.EMAIL_USER}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        html || text
      ].join('\r\n');
      const encodedMessage = Buffer.from(message).toString('base64url');
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });
      console.log('[Email] Sent via Gmail API to', to);
      return;
    } catch (err) {
      console.error('[Email] Gmail API failed:', err.code || '', err.message);
      if (err.errors) console.error('[Email] Gmail API error details:', JSON.stringify(err.errors));
    }
  }

  // 2. Try Resend (HTTPS API, works on Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = getResend();
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'TechPharma <onboarding@resend.dev>',
        to: to,
        subject: subject,
        text: text,
        html: html
      });
      console.log('[Email] Resend result:', JSON.stringify(result));
      if (result.error) {
        console.error('[Email] Resend API error:', result.error.message);
      } else {
        console.log('[Email] Sent via Resend to', to, 'ID:', result.data?.id);
      }
      return;
    } catch (err) {
      console.error('[Email] Resend failed:', err.message);
    }
  }

  // 3. Fallback: nodemailer SMTP (works locally only, blocked on Render free tier)
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
  });
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
}

// Check if email is already registered
app.post('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered', exists: true });
    }

    res.json({ success: true, message: 'Email available', exists: false });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ success: false, message: 'Failed to check email' });
  }
});

// Send OTP for signup verification
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if email is already registered
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    signupOtpStore.set(email, { otp, expiresAt });

    // Respond immediately — send email in background (don't block the request)
    res.json({ success: true, message: 'OTP sent successfully' });

    // Send email in background (fire-and-forget)
    sendEmail(
      email,
      'Your TechPharma Verification Code',
      `Your verification code is ${otp}. It expires in 5 minutes.`,
      `<p>Your verification code is <b>${otp}</b>. It expires in 5 minutes.</p>`
    ).catch(err => {
      console.error('[OTP] Email send failed for', email + ':', err.message);
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP for signup
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const entry = signupOtpStore.get(email);
    if (!entry) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
    }

    if (Date.now() > entry.expiresAt) {
      signupOtpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    if (entry.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    signupOtpStore.delete(email);
    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ===== Delete Account with OTP =====
const deleteOtpStore = new Map();

// Send OTP for account deletion
app.post('/api/auth/send-delete-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ success: false, message: 'No account found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    deleteOtpStore.set(email, { otp, expiresAt });

    // Respond immediately — send email in background
    res.json({ success: true, message: 'OTP sent successfully' });

    sendEmail(
      email,
      'Confirm Account Deletion - TechPharma',
      `Your account deletion confirmation code is ${otp}. If you did not request this, please ignore this email.`,
      `<p>Your account deletion confirmation code is <b>${otp}</b>. If you did not request this, please ignore this email.</p>`
    ).catch(err => {
      console.error('[Delete OTP] Email send failed for', email + ':', err.message);
    });
  } catch (error) {
    console.error('Send delete OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Delete account after OTP verification
app.post('/api/auth/delete-account', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const entry = deleteOtpStore.get(email);
    if (!entry) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
    }

    if (Date.now() > entry.expiresAt) {
      deleteOtpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    if (entry.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    deleteOtpStore.delete(email);

    // Delete user
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    const filteredUsers = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    writeJsonFile(usersFile, filteredUsers);

    // Delete user's notifications
    const notifFile = path.join(__dirname, './data/notifications.json');
    const allNotifs = readJsonFile(notifFile);
    const filteredNotifs = allNotifs.filter(n => n.userId !== filteredUsers.find(u => u.email === email)?._id);
    writeJsonFile(notifFile, filteredNotifs);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

const { sendPasswordResetEmail } = require('./src/utils/email');

app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    // Read users from file
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);

    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Generate reset token whether user exists or not (for security)
    const resetToken = jwt.sign(
      { 
        userId: user?._id || 'invalid',
        purpose: 'reset'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    if (user) {
      try {
        // Send password reset email
        await sendPasswordResetEmail(email, resetToken);
        
        // Store reset token with user
        user.resetToken = {
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        };
        writeJsonFile(usersFile, users);
        
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Log the reset link as fallback
        console.log(`
=========================================
🔑 Password Reset Requested (Email Failed)
-----------------------------------------
Email: ${email}
Reset Link: ${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}
=========================================`);
      }
    }

    // Always return the same response whether user exists or not
    return res.json({
      success: true,
      message: 'If an account exists with that email, you will receive password reset instructions.',
      token: resetToken // Include token in response for development
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, otp, password } = req.body;
    if (!token || !otp || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Read users
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    
    // Find user
    const user = users.find(u => u._id === decoded.userId);
    if (!user || !user.resetOtp) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Verify OTP and expiry
    if (user.resetOtp.code !== otp || new Date() > new Date(user.resetOtp.expiresAt)) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Update password
    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = null; // Clear reset OTP
    writeJsonFile(usersFile, users);

    return res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing request'
    });
  }
});

// Change password (when logged in)
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u._id === req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    writeJsonFile(usersFile, users);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Read users from file
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);

    // Find user by email
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company || null,
        phone: user.phone || ''
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Protected Routes
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    // Read users from file
    const usersFile = path.join(__dirname, './data/users.json');
    const users = readJsonFile(usersFile);
    const user = users.find(u => u._id === req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Read products from file
    const productsFile = path.join(__dirname, './data/products.json');
    const products = readJsonFile(productsFile);
    const userProducts = products.filter(p => p.userId === user._id);

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company || null,
        phone: user.phone || '',
        createdAt: user.createdAt
      },
      data: {
        totalProducts: userProducts.length
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Logout — invalidate token
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      authMiddleware.blacklistToken(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error during logout' });
  }
});

// Category counts
app.get('/api/products/category-counts', async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const counts = {};
    products.forEach(p => {
      if (p.status === 'active' && p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    res.json({ success: true, counts });
  } catch (error) {
    console.error('Category counts error:', error);
    res.status(500).json({ success: false, message: 'Error fetching category counts' });
  }
});

// Featured products
app.get('/api/products/featured', async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const users = readJsonFile(path.join(__dirname, './data/users.json'));

    const token = req.headers.authorization?.split(' ')[1];
    let isAuthed = false;
    if (token) {
      try { jwt.verify(token, JWT_SECRET); isAuthed = true; } catch (e) { isAuthed = false; }
    }

    const userMap = new Map(users.map(u => [u._id, u]));

    const featured = products
      .filter(p => p.status === 'active')
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 3)
      .map(p => {
        const supplier = userMap.get(p.userId);
        return {
          ...p,
          supplierName: isAuthed ? (supplier?.name || 'Supplier') : 'Seller',
          supplier: supplier ? { _id: supplier._id, name: isAuthed ? supplier.name : 'Seller' } : null
        };
      });

    res.json({ success: true, products: featured });
  } catch (error) {
    console.error('Featured products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching featured products' });
  }
});

// All products for carousel (random 5)
app.get('/api/products/all', async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const users = readJsonFile(path.join(__dirname, './data/users.json'));

    const token = req.headers.authorization?.split(' ')[1];
    let isAuthed = false;
    if (token) {
      try { jwt.verify(token, JWT_SECRET); isAuthed = true; } catch (e) { isAuthed = false; }
    }

    const userMap = new Map(users.map(u => [u._id, u]));

    const active = products
      .filter(p => p.status === 'active')
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(p => {
        const supplier = userMap.get(p.userId);
        return {
          ...p,
          supplierName: isAuthed ? (supplier?.name || 'Supplier') : 'Seller',
          supplier: supplier ? { _id: supplier._id, name: isAuthed ? supplier.name : 'Seller' } : null
        };
      });

    res.json({ success: true, products: active });
  } catch (error) {
    console.error('All products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const users = readJsonFile(path.join(__dirname, './data/users.json'));

    // Determine if requester is authenticated (supplier name only shown to logged-in users)
    const token = req.headers.authorization?.split(' ')[1];
    let isAuthed = false;
    if (token) {
      try { jwt.verify(token, JWT_SECRET); isAuthed = true; } catch (e) { isAuthed = false; }
    }

    // Prebuild a userId -> user map ONCE to avoid N+1 lookups inside the loop
    const userMap = new Map(users.map(u => [u._id, u]));

    // Filter active products and sort by createdAt
    const activeProducts = products
      .filter(p => p.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(p => {
        const supplier = userMap.get(p.userId);   // O(1) lookup
        const { userId, supplierId, createdAt, updatedAt, ...publicFields } = p;
        return {
          ...publicFields,
          supplierName: isAuthed ? (supplier?.name || 'Supplier') : 'Seller',
          supplier: supplier ? { _id: supplier._id, name: isAuthed ? supplier.name : 'Seller' } : null
        };
      });

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    const total = activeProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const paginated = activeProducts.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      products: paginated,
      pagination: { page, pageSize, total, totalPages }
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const product = products.find(p => p._id === req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Fetch supplier name
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    const supplier = users.find(u => u._id === product.userId);

    // Only show real supplier name to authenticated users
    const token = req.headers.authorization?.split(' ')[1];
    let isAuthed = false;
    if (token) {
      try { jwt.verify(token, JWT_SECRET); isAuthed = true; } catch (e) { isAuthed = false; }
    }
    
    res.json({
      success: true,
      product: {
        ...product,
        userId: undefined,
        supplierId: undefined,
        supplier: supplier ? { _id: supplier._id, name: isAuthed ? supplier.name : 'Seller' } : null,
        supplierName: isAuthed ? (supplier?.name || 'Supplier') : 'Seller'
      }
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, category, stock, images } = req.body;

    // Read existing products
    const productsPath = path.join(__dirname, './data/products.json');
    let products = [];
    try {
      products = readJsonFile(productsPath);
    } catch (err) {
      console.error('Error reading products file:', err);
    }

    // Generate new ID
    const id = products.length ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;

    // Create new product
    const product = {
      id,
      _id: String(id),
      name: name?.trim(),
      description: description?.trim(),
      price: Number(price),
      category: category?.trim(),
      stock: Number(stock),
      images: Array.isArray(images) ? images : [],
      userId: req.user._id,
      supplierId: req.user._id,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to products array
    products.push(product);

    // Save back to file
    writeJsonFile(productsPath, products);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      details: error.message
    });
  }
});

// Update product (with optimistic locking)
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, category, stock, images, version } = req.body;
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const index = products.findIndex(p => p._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (products[index].userId !== req.user._id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    // Optimistic locking: check version
    if (version !== undefined && products[index].version !== undefined && version !== products[index].version) {
      return res.status(409).json({ success: false, message: 'Product was modified by another user. Please refresh and try again.' });
    }

    const oldStock = products[index].stock;
    const newStock = stock !== undefined ? Number(stock) : oldStock;

    products[index] = {
      ...products[index],
      name: name?.trim() || products[index].name,
      description: description?.trim() || products[index].description,
      price: price !== undefined ? Number(price) : products[index].price,
      category: category?.trim() || products[index].category,
      stock: newStock,
      available_stock: newStock,
      images: images || products[index].images,
      version: (products[index].version || 0) + 1,
      updatedAt: new Date().toISOString()
    };

    writeJsonFile(path.join(__dirname, './data/products.json'), products);
    res.json({ success: true, product: products[index] });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const index = products.findIndex(p => p._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user owns the product
    if (products[index].userId !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Remove product
    const [deletedProduct] = products.splice(index, 1);
    writeJsonFile(path.join(__dirname, './data/products.json'), products);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Public supplier profile + their products
app.get('/api/supplier/:id', async (req, res) => {
  try {
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    const user = users.find(u => u._id === req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Get all products listed by this supplier (public)
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const supplierProducts = products
      .filter(p => p.status === 'active' && (p.userId === user._id || p.supplierId === user._id))
      .map(p => ({
        _id: p._id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        stock: p.available_stock !== undefined ? p.available_stock : p.stock,
        images: p.images,
      }));

    res.json({
      success: true,
      supplier: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company || null,
        createdAt: user.createdAt,
        products: supplierProducts,
        productCount: supplierProducts.length,
      }
    });
  } catch (error) {
    console.error('Supplier fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching supplier' });
  }
});

// User routes
app.get('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    const user = users.find(u => u._id === req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// Import routes
const messagesRoutes = require('./src/routes/messages');

// Dashboard route (inline — uses server.js authMiddleware, not separate middleware)
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }

    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const userProducts = products.filter(p => 
      String(p.userId || p.supplierId || '') === String(userId) && 
      (!p.status || p.status === 'active')
    );

    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const userOrders = orders.filter(o => 
      String(o.userId || '') === String(userId) || 
      String(o.supplierId || '') === String(userId)
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts: userProducts.length,
          productViews: userProducts.reduce((sum, p) => sum + (p.views || 0), 0),
          recentOrders: userOrders.length,
          revenue: userOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        },
        orders: userOrders.slice(0, 10).map(order => ({
          _id: order._id || order.id,
          user: order.userName || 'Anonymous',
          items: order.items || [],
          totalAmount: order.totalAmount || 0,
          status: order.status || 'pending',
          createdAt: order.createdAt || new Date().toISOString(),
          paymentDetails: order.paymentDetails || { status: 'pending', method: 'unknown' }
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/dashboard/analytics', authMiddleware, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const productMap = new Map(products.map(p => [p._id, p]));

    const userProducts = products.filter(p =>
      String(p.userId || p.supplierId || '') === userId && (!p.status || p.status === 'active')
    );

    let totalSales = 0;
    let sellerOrders = 0;
    const topSales = new Map();

    orders.forEach(order => {
      let orderHasSale = false;
      (order.items || []).forEach(item => {
        const product = productMap.get(item.product?._id || item.productId);
        const sellerId = String(item.sellerId || product?.userId || product?.supplierId || '');
        if (sellerId === userId) {
          const amount = (item.price > 0 ? item.price : (product?.price || 0)) * (item.quantity || 1);
          const name = item.product?.name && item.product?.name !== 'Product' ? item.product.name : (product?.name || 'Product');
          totalSales += amount;
          orderHasSale = true;
          topSales.set(name, (topSales.get(name) || 0) + amount);
        }
      });
      if (orderHasSale) sellerOrders++;
    });

    const topProducts = Array.from(topSales.entries()).map(([name, sales]) => ({ name, sales }));

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts: userProducts.length,
          recentOrders: sellerOrders,
          revenue: totalSales,
        },
        orders: [],
        analytics: {
          totalSales,
          totalOrders: sellerOrders,
          averageOrderValue: sellerOrders ? (totalSales / sellerOrders) : 0,
          topProducts,
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Use routes
app.use('/api/messages', messagesRoutes);
app.use('/api/inventory', inventoryRoutes);

// Notification routes
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
    const userNotifs = all.filter(n => !n.userId || n.userId === req.user._id);
    res.json({ success: true, notifications: userNotifs });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

app.get('/api/notifications/archived', authMiddleware, async (req, res) => {
  try {
    const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
    const archived = all.filter(n => n.userId === req.user._id && n.archived);
    res.json({ success: true, notifications: archived });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching archived notifications' });
  }
});

app.post('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
    const newNotif = {
      _id: Date.now().toString(),
      userId: req.user._id,
      title: req.body.title || '',
      message: req.body.message || '',
      type: req.body.type || 'info',
      read: false,
      archived: false,
      createdAt: new Date().toISOString()
    };
    all.push(newNotif);
    writeJsonFile(path.join(__dirname, './data/notifications.json'), all);
    res.status(201).json({ success: true, notification: newNotif });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating notification' });
  }
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await withLock(() => {
      const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
      const idx = all.findIndex(n => n._id === req.params.id);
      if (idx === -1) throw { status: 404, message: 'Not found' };
      all[idx].read = true;
      writeJsonFile(path.join(__dirname, './data/notifications.json'), all);
      return { notification: all[idx] };
    });
    res.json({ success: true, notification: result.notification });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Error marking as read' });
  }
});

app.post('/api/notifications/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await withLock(() => {
      const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
      let changed = false;
      all.forEach(n => {
        if ((!n.userId || n.userId === req.user._id) && !n.read) {
          n.read = true;
          changed = true;
        }
      });
      if (changed) writeJsonFile(path.join(__dirname, './data/notifications.json'), all);
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking all as read' });
  }
});

app.post('/api/notifications/:id/archive', authMiddleware, async (req, res) => {
  try {
    const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
    const idx = all.findIndex(n => n._id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    all[idx].archived = true;
    writeJsonFile(path.join(__dirname, './data/notifications.json'), all);
    res.json({ success: true, notification: all[idx] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error archiving notification' });
  }
});

app.post('/api/notifications/:id/unarchive', authMiddleware, async (req, res) => {
  try {
    const all = readJsonFile(path.join(__dirname, './data/notifications.json'));
    const idx = all.findIndex(n => n._id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    all[idx].archived = false;
    writeJsonFile(path.join(__dirname, './data/notifications.json'), all);
    res.json({ success: true, notification: all[idx] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unarchiving notification' });
  }
});

app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  try {
    let all = readJsonFile(path.join(__dirname, './data/notifications.json'));
    all = all.filter(n => n._id !== req.params.id);
    writeJsonFile(path.join(__dirname, './data/notifications.json'), all);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting notification' });
  }
});

// Order routes (file-based)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const userOrders = orders.filter(o => o.userId === req.user._id);

    // Resolve product details for each order item
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const productMap = new Map(products.map(p => [p._id, p]));

    // Build user map for supplier names
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    const userMap = new Map(users.map(u => [u._id, u]));

    userOrders.forEach(order => {
      order.items = order.items.map(item => {
        if (item.product && item.product.name && item.product.name !== 'Product' && item.price > 0) return item;
        const product = productMap.get(item.product?._id || item.productId);
        if (product) {
          const supplier = userMap.get(product.userId);
          return {
            ...item,
            product: { _id: product._id, name: product.name },
            price: product.price,
            supplierName: supplier?.name || 'Seller'
          };
        }
        return item;
      });

      // Also resolve supplierName for items that already had product data
      order.items.forEach(item => {
        if (!item.supplierName) {
          const product = productMap.get(item.product?._id || item.productId);
          if (product) {
            const supplier = userMap.get(product.userId);
            item.supplierName = supplier?.name || 'Seller';
          }
        }
      });

      // Recalculate total if it was 0
      if (!order.totalAmount || order.totalAmount === 0) {
        order.totalAmount = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
      }
    });

    res.json({ success: true, orders: userOrders });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

app.post('/api/orders/:id/archive', authMiddleware, async (req, res) => {
  try {
    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const order = orders.find(o => o._id === req.params.id && o.userId === req.user._id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.archived = true;
    writeJsonFile(path.join(__dirname, './data/orders.json'), orders);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error archiving order' });
  }
});

// Helper: build sold-products aggregation for a given sellerId
function buildSoldProducts(orders, users, products, sellerId) {
  const userMap = new Map(users.map(u => [u._id, u]));
  const productMap = new Map(products.map(p => [p._id, p]));
  const sales = [];
  orders.forEach(order => {
    const buyer = userMap.get(order.userId) || {};
    order.items.forEach(item => {
      // Resolve missing product data (legacy orders may only have productId)
      const product = productMap.get(item.product?._id || item.productId);
      const realItem = {
        productId: item.product?._id || item.productId || product?._id || null,
        productName: item.product?.name && item.product?.name !== 'Product' ? item.product.name : (product?.name || 'Product'),
        quantity: item.quantity,
        price: item.price > 0 ? item.price : (product?.price ?? 0),
        sellerId: item.sellerId || product?.userId || product?.supplierId || null,
      };
      if (realItem.sellerId === sellerId) {
        sales.push({
          orderId: order._id,
          productId: realItem.productId,
          productName: realItem.productName,
          quantity: realItem.quantity,
          price: realItem.price,
          revenue: (realItem.price || 0) * (realItem.quantity || 1),
          soldAt: order.createdAt,
          buyer: {
            _id: order.userId,
            name: order.buyerName || buyer.name || 'Unknown',
            email: order.buyerEmail || buyer.email || '',
          },
          paymentMethod: order.paymentMethod,
          shippingAddress: order.shippingAddress || {},
        });
      }
    });
  });
  const perProduct = {};
  sales.forEach(s => {
    const key = s.productId || s.productName;
    if (!perProduct[key]) {
      perProduct[key] = { _id: s.productId, name: s.productName, quantitySold: 0, revenue: 0, lastSoldAt: s.soldAt, buyers: [] };
    }
    perProduct[key].quantitySold += s.quantity;
    perProduct[key].revenue += s.revenue;
    if (new Date(s.soldAt) > new Date(perProduct[key].lastSoldAt)) perProduct[key].lastSoldAt = s.soldAt;
    perProduct[key].buyers.push({ name: s.buyer.name, email: s.buyer.email, quantity: s.quantity, date: s.soldAt, orderId: s.orderId });
  });
  const resultProducts = Object.values(perProduct).sort((a, b) => b.revenue - a.revenue);
  return { products: resultProducts, sales };
}

// Sold products for the current user (the seller)
app.get('/api/sold-products', authMiddleware, async (req, res) => {
  try {
    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const { products: sold, sales } = buildSoldProducts(orders, users, products, req.user._id);
    res.json({ success: true, products: sold, sales });
  } catch (error) {
    console.error('Sold products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching sold products' });
  }
});

// Sold products for a specific seller
app.get('/api/sold-products/:sellerId', authMiddleware, async (req, res) => {
  try {
    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const users = readJsonFile(path.join(__dirname, './data/users.json'));
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const { products: pp, sales } = buildSoldProducts(orders, users, products, req.params.sellerId);
    res.json({ success: true, products: pp, sales });
  } catch (error) {
    console.error('Sold products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching sold products' });
  }
});

app.get('/api/orders/stats', authMiddleware, async (req, res) => {
  try {
    const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
    const userOrders = orders.filter(o => o.userId === req.user._id);
    res.json({
      success: true,
      stats: {
        total: userOrders.length,
        pending: userOrders.filter(o => o.status === 'pending').length,
        completed: userOrders.filter(o => o.status === 'completed').length,
        revenue: userOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order stats' });
  }
});

// Cart routes (file-based)
const getCartFilePath = () => path.join(__dirname, './data/carts.json');

app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const carts = readJsonFile(getCartFilePath());
    let cart = carts.find(c => c.userId === req.user._id);
    if (!cart) {
      return res.json({ success: true, cart: { items: [], total: 0 } });
    }

    // Resolve product details for each cart item
    const products = readJsonFile(path.join(__dirname, './data/products.json'));
    const userMap = new Map(readJsonFile(path.join(__dirname, './data/users.json')).map(u => [u._id, u]));

    cart.items = cart.items.map(item => {
      if (item.product && item.product.name) return item; // already has product data
      const product = products.find(p => p._id === item.productId);
      if (product) {
        const supplier = userMap.get(product.userId);
        return {
          ...item,
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            images: product.images,
            stock: product.stock
          }
        };
      }
      return item;
    });

    cart.total = cart.items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * (item.quantity || 1));
    }, 0);

    res.json({ success: true, cart });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
});

app.post('/api/cart/add', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const result = await withLock(() => {
      const carts = readJsonFile(getCartFilePath());
      const products = readJsonFile(path.join(__dirname, './data/products.json'));
      const product = products.find(p => p._id === productId);

      if (!product) {
        throw { status: 404, message: 'Product not found' };
      }

      // Check stock availability
      const available = product.available_stock !== undefined ? product.available_stock : product.stock || 0;
      if (available < qty) {
        throw { status: 409, message: `Only ${available} units available` };
      }

      let cart = carts.find(c => c.userId === req.user._id);
      if (!cart) {
        cart = { _id: Date.now().toString() + Math.random().toString(36).slice(2, 6), userId: req.user._id, items: [], total: 0, version: 0 };
        carts.push(cart);
      }

      const existingItem = cart.items.find(item => item.productId === productId);
      if (existingItem) {
        const newQty = existingItem.quantity + qty;
        if (newQty > available) {
          throw { status: 409, message: `Cannot add ${qty} more. Only ${available - existingItem.quantity} additional units available.` };
        }
        existingItem.quantity = newQty;
        // Update price snapshot to current price
        existingItem.product.price = product.price;
      } else {
        cart.items.push({
          productId,
          quantity: qty,
          addedAt: new Date().toISOString(),
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            images: product.images,
            stock: product.stock
          }
        });
      }

      cart.version = (cart.version || 0) + 1;
      cart.total = cart.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);

      writeJsonFile(getCartFilePath(), carts);
      return { cart };
    });

    res.json({ success: true, cart: result.cart });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Error adding to cart' });
  }
});

app.put('/api/cart/update/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, cartVersion } = req.body;

    const result = await withLock(() => {
      const carts = readJsonFile(getCartFilePath());
      const cart = carts.find(c => c.userId === req.user._id);

      if (!cart) {
        throw { status: 404, message: 'Cart not found' };
      }

      // Optimistic concurrency: check cart version
      if (cartVersion !== undefined && cart.version !== undefined && cartVersion !== cart.version) {
        throw { status: 409, message: 'Cart has been modified by another session. Please refresh.' };
      }

      const item = cart.items.find(item => item.productId === productId);
      if (!item) {
        throw { status: 404, message: 'Item not found in cart' };
      }

      if (quantity <= 0) {
        cart.items = cart.items.filter(item => item.productId !== productId);
      } else {
        // Validate against stock
        const products = readJsonFile(path.join(__dirname, './data/products.json'));
        const product = products.find(p => p._id === productId);
        const available = product ? (product.available_stock !== undefined ? product.available_stock : product.stock || 0) : 0;
        if (quantity > available) {
          throw { status: 409, message: `Only ${available} units available` };
        }
        item.quantity = quantity;
      }

      cart.version = (cart.version || 0) + 1;
      cart.total = cart.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);

      writeJsonFile(getCartFilePath(), carts);
      return { cart };
    });

    res.json({ success: true, cart: result.cart });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Error updating cart' });
  }
});

app.delete('/api/cart/remove/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await withLock(() => {
      const carts = readJsonFile(getCartFilePath());
      const cart = carts.find(c => c.userId === req.user._id);

      if (!cart) {
        throw { status: 404, message: 'Cart not found' };
      }

      cart.items = cart.items.filter(item => item.productId !== productId);
      cart.version = (cart.version || 0) + 1;
      cart.total = cart.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);

      writeJsonFile(getCartFilePath(), carts);
      return { cart };
    });

    res.json({ success: true, cart: result.cart });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Error removing from cart' });
  }
});

app.post('/api/cart/checkout', authMiddleware, async (req, res) => {
  try {
    const { paymentMethod, shippingAddress, idempotencyKey } = req.body;

    const result = await withLock(() => {
      const carts = readJsonFile(getCartFilePath());
      const cart = carts.find(c => c.userId === req.user._id);

      if (!cart || cart.items.length === 0) {
        throw { status: 400, message: 'Cart is empty' };
      }

      // Idempotency: check if this checkout was already processed
      const orders = readJsonFile(path.join(__dirname, './data/orders.json'));
      if (idempotencyKey) {
        const existing = orders.find(o => o.idempotency_key === idempotencyKey);
        if (existing) {
          return { order: existing, idempotent: true };
        }
      }

      // Validate all products are still active and have sufficient stock
      const products = readJsonFile(path.join(__dirname, './data/products.json'));
      for (const item of cart.items) {
        const product = products.find(p => p._id === item.productId);
        if (!product) {
          throw { status: 400, message: `Product no longer exists: ${item.product?.name || item.productId}` };
        }
        if (product.status && product.status !== 'active') {
          throw { status: 400, message: `Product is no longer available: ${product.name}` };
        }
        const available = product.available_stock !== undefined ? product.available_stock : product.stock || 0;
        if (available < item.quantity) {
          throw { status: 409, message: `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${item.quantity}` };
        }
        // Use current product price (fixes stale pricing)
        if (item.product) {
          item.product.price = product.price;
        }
      }

      // Decrement product stock + increment salesCount + track sellers per item
      const mySellerId = req.user._id
      cart.items.forEach(item => {
        const product = products.find(p => p._id === item.productId);
        if (product) {
          const stockVal = product.available_stock !== undefined ? product.available_stock : product.stock;
          const newStock = Math.max(0, stockVal - item.quantity);
          if (product.available_stock !== undefined) {
            product.available_stock = newStock;
          }
          product.stock = newStock;
          // Track total units sold per product (used for 'featured = top sold')
          product.salesCount = (product.salesCount || 0) + item.quantity;
        }
      });
      writeJsonFile(path.join(__dirname, './data/products.json'), products);

      // Build order items with sellerId and resolved buyer info
      const orderItems = cart.items.map(item => {
        const product = products.find(p => p._id === item.productId);
        return {
          product: { _id: item.product?._id || item.productId, name: item.product?.name || 'Product' },
          quantity: item.quantity,
          price: item.product?.price || 0,
          sellerId: product?.userId || product?.supplierId || null,
        };
      });

      // Create order with collision-safe ID
      const buyerUser = readJsonFile(path.join(__dirname, './data/users.json')).find(u => u._id === req.user._id) || {};
      const order = {
        _id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        userId: req.user._id,  // the BUYER
        buyerName: buyerUser.name || '',
        buyerEmail: buyerUser.email || '',
        items: orderItems,
        totalAmount: cart.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0),
        status: 'pending',
        paymentMethod: paymentMethod || 'cod',
        shippingAddress: shippingAddress || {},
        createdAt: new Date().toISOString(),
        idempotency_key: idempotencyKey || null
      };

      orders.push(order);
      writeJsonFile(path.join(__dirname, './data/orders.json'), orders);

      // Notify sellers that they have a new order
      const notifications = readJsonFile(path.join(__dirname, './data/notifications.json'));
      const notified = new Set();
      orderItems.forEach(item => {
        if (item.sellerId && !notified.has(item.sellerId)) {
          notified.add(item.sellerId);
          notifications.push({
            _id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            userId: item.sellerId,
            title: 'New order received',
            message: `You have a new order from ${buyerUser.name || 'a buyer'} for ${item.product.name}.`,
            type: 'order_placed',
            read: false,
            archived: false,
            createdAt: new Date().toISOString(),
            metadata: { orderId: order._id, productId: item.product._id, buyerId: req.user._id, buyerName: req.user.name || '' },
          });
        }
      });
      if (notified.size > 0) writeJsonFile(path.join(__dirname, './data/notifications.json'), notifications);

      // Clear cart
      cart.items = [];
      cart.total = 0;
      cart.version = (cart.version || 0) + 1;
      writeJsonFile(getCartFilePath(), carts);

      return { order, idempotent: false };
    });

    res.json({ success: true, order: result.order, idempotent: result.idempotent || false });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Error during checkout' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize storage FIRST — pre-loads products.json into cache synchronously
    // This ensures products are available from second 0, even before MongoDB connects
    initStorage();

    // Connect to MongoDB (don't block server start — data is already in cache from files)
    connectMongoDB().then(connected => {
      if (connected) console.log('📦 MongoDB connected in background');
    });

    // Migrate product schema to inventory model (total_stock, available_stock, reserved_stock, sold)
    inventory.migrateProducts();
    console.log('[inventory] Product schema migrated');

    // Start background reservation expiration job (runs every 60s)
    inventory.startExpirationJob(60000);
    console.log('[inventory] Expiration job started (60s interval)');

    // Start Express server
    console.log('Starting Express server...');
    const server = await new Promise((resolve, reject) => {
      const srv = app.listen(PORT, '0.0.0.0')
        .once('error', (err) => {
          console.error('Server startup error:', err);
          if (err.code === 'EADDRINUSE') {
            console.error(`
=================================================
ERROR: Port ${PORT} is already in use
Please stop any other server using port ${PORT} first
You can use these commands to find and stop the process:
  netstat -ano | findstr :${PORT}
  taskkill /PID <PID> /F
=================================================`);
            process.exit(1);
          } else {
            reject(err);
          }
        })
        .once('listening', () => {
          console.log('Server is listening...');
          resolve(srv);
        });
    });

    console.log(`
=========================================
🚀 Backend Server Running
-----------------------------------------
• Port: ${PORT}
• URL: http://localhost:${PORT}
• Cache: Pre-loaded from files (instant)
• MongoDB: ${mongoDb ? 'Connected' : 'Connecting in background...'}
=========================================`);

    // Graceful shutdown
    const shutdown = async () => {
      try {
        console.log('\nShutting down...');
        await server.close();
        process.exit(0);
      } catch (err) {
        console.error('Shutdown error:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return server;
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

startServer();
