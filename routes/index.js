const express = require('express');
const authRoutes = require('./auth');
const questionRoutes = require('./question');
const leadsRoutes = require('./leads');
const campaignRoutes = require('./campaign');
const userRoutes = require('./user');
const clientRoutes = require('./client');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use('/auth', authRoutes);

// Protected routes (requires token verification)
router.use('/question', authMiddleware, questionRoutes);
router.use('/lead', authMiddleware, leadsRoutes);
router.use('/campaign', authMiddleware, campaignRoutes);
router.use('/user', authMiddleware, userRoutes);
router.use('/client', authMiddleware, clientRoutes);

module.exports = router;
