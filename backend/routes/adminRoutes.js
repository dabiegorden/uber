const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// Admin dashboard stats
router.get('/stats', isAuthenticated, isAdmin, adminController.getDashboardStats);

// Recent rides
router.get('/recent-rides', isAuthenticated, isAdmin, adminController.getRecentRides);

// All rides with pagination
router.get('/rides', isAuthenticated, isAdmin, adminController.getAllRides);

module.exports = router;