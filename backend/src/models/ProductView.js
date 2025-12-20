const mongoose = require('mongoose');

const productViewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  },
  ip: String,
  userAgent: String
});

// Index for efficient querying
productViewSchema.index({ productId: 1, viewedAt: -1 });
productViewSchema.index({ userId: 1, viewedAt: -1 });

module.exports = mongoose.model('ProductView', productViewSchema);