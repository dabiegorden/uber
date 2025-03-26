const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Protected routes
router.get('/profile', isAuthenticated, authController.getProfile);
router.get('/driver-profile', isAuthenticated, authController.getDriverProfile);

// Admin routes
router.get('/users', isAuthenticated, isAdmin, authController.getUsersList);
router.get('/drivers', isAuthenticated, isAdmin, authController.getDriversList);
router.put('/users/status', isAuthenticated, isAdmin, authController.updateUserStatus);
router.put('/drivers/verify', isAuthenticated, isAdmin, authController.verifyDriver);

module.exports = router;