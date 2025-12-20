const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  name: { type: String, trim: true },
  address: { type: String, trim: true },
  gst: { type: String, trim: true },
  phone: { type: String, trim: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  // Keep password hidden by default from queries:
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['buyer', 'supplier', 'admin'],
    default: 'buyer'
  },
  company: {
    type: companySchema,
    default: {}
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: { type: String, select: false },
    expiresAt: { type: Date, select: false },
    attempts: { type: Number, default: 0 },
    lastSent: { type: Date }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
