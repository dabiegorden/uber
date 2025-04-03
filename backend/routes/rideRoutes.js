const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Find nearby drivers
router.post('/nearby-drivers', isAuthenticated, rideController.findNearbyDrivers);

// Request a ride
router.post('/request', isAuthenticated, rideController.requestRide);

// Get ride status
router.get('/:rideId', isAuthenticated, rideController.getRideStatus);

// Update driver availability
router.put('/availability', isAuthenticated, rideController.updateAvailability);

module.exports = router;