const express = require("express")
const router = express.Router()
const rideController = require("../controllers/rideController")

// Route to find nearby drivers
router.post("/nearby-drivers", rideController.findNearbyDrivers)

// Route to request a ride
router.post("/request", rideController.requestRide)

// Route to get ride status
router.get("/:rideId", rideController.getRideStatus)

// Route for drivers to update their availability
router.post("/update-availability", rideController.updateAvailability)

module.exports = router

