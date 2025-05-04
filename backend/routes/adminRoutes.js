// Updated routes/adminRoutes.js

const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware")

// Apply admin middleware to all routes
router.use(isAuthenticated, isAdmin)

// Dashboard statistics
router.get("/dashboard-stats", adminController.getDashboardStats)

// User CRUD operations
router.get("/users", adminController.getAllUsers)
router.get("/users/:id", adminController.getUserById)
router.post("/users", adminController.createUser)
router.put("/users/:id", adminController.updateUser)
router.delete("/users/:id", adminController.deleteUser)

// Driver CRUD operations
router.get("/drivers", adminController.getAllDrivers)
router.get("/drivers/:id", adminController.getDriverById)
router.post("/drivers", adminController.createDriver)
router.put("/drivers/:id", adminController.updateDriver)
router.delete("/drivers/:id", adminController.deleteDriver)

// Pending driver verifications
router.get("/pending-drivers", adminController.getPendingDrivers)

// Update driver verification status
router.post("/verify-driver", adminController.updateDriverVerification)

// Get all rides
router.get("/rides", adminController.getAllRides)

module.exports = router