const express = require("express")
const router = express.Router()
const rideController = require("../controllers/rideController")
const { isAuthenticated } = require('../middleware/authMiddleware');

// Route to find nearby drivers
router.post("/nearby-drivers", isAuthenticated, rideController.findNearbyDrivers)

// Route to calculate fare
router.post("/calculate-fare", isAuthenticated, rideController.calculateFare)

// Route to request a ride
router.post("/request", isAuthenticated, rideController.requestRide)

// Route to get ride status
router.get("/:rideId", isAuthenticated, rideController.getRideStatus)

// Route for drivers to update their availability
router.post("/update-availability", isAuthenticated, rideController.updateAvailability)

// Route for drivers to update ride status
router.post("/update-status", isAuthenticated, rideController.updateRideStatus)

// Route to get ride history
router.get("/history/list", isAuthenticated, rideController.getRideHistory)
// Get all available drivers
router.get('/all-available-drivers', isAuthenticated, rideController.getAllAvailableDrivers);
// Add this to rideRoutes.js
router.post("/create", isAuthenticated, rideController.createRide)

module.exports = router