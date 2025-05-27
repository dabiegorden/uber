const express = require("express")
const router = express.Router()
const rideController = require("../controllers/rideController")
const authMiddleware = require("../middleware/authMiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware.isAuthenticated)

// Driver search routes
router.post("/nearby-drivers", rideController.getNearbyDrivers)
router.get("/all-available-drivers", rideController.getAllAvailableDrivers)

// Ride management routes
router.post("/request", rideController.requestRide)
router.post("/calculate-fare", rideController.calculateFare)
router.get("/history", rideController.getRideHistory)
router.get("/:rideId", rideController.getRideDetails)

module.exports = router
