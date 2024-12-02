const express = require('express');
const authRoutes = require('./auth');
const questionRoutes = require('./question');
const leadsRoutes = require('./leads');
const campaignRoutes = require('./campaign');
const userRoutes = require('./user');
const clientRoutes = require('./client');
const dashboardRoutes = require('./dashboard');
const vendorLeadsRoutes = require('./vendor-leads');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use('/auth', authRoutes);

// Protected routes (requires token verification)
router.use('/question', authMiddleware, questionRoutes);
router.use('/lead', authMiddleware, leadsRoutes);
router.use('/campaign', authMiddleware, campaignRoutes);
router.use('/user', authMiddleware, userRoutes);
router.use('/client', authMiddleware, clientRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);

router.use('/vendor', vendorLeadsRoutes);

module.exports = router;
