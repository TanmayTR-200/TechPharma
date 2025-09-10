const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const supplierRoutes = require('./suppliers');
const cartRoutes = require('./cart');

const orderRoutes = require('./orders');
const messageRoutes = require('./messages');
const dashboardRoutes = require('./dashboard');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/orders', orderRoutes);
router.use('/cart', cartRoutes);

router.use('/messages', messageRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
