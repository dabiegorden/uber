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

// Admin routes
router.get('/admin/dashboard', isAuthenticated, isAdmin, (req, res) => {
  res.json({ message: 'Admin dashboard access granted' });
});

module.exports = router;