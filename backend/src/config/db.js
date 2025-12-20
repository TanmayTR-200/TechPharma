require('dotenv').config();

const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/techpharma',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  },
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development'
  }
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

module.exports = config;