const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware")

// Public routes - Registration
router.post("/register/user", authController.registerUser)

router.post(
  "/register/driver",
  (req, res, next) => {
    const upload = req.app.locals.upload
    upload.single("vehicleImage")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        })
      }
      next()
    })
  },
  authController.registerDriver,
)

// Unified registration endpoint (for backward compatibility)
router.post(
  "/register",
  (req, res, next) => {
    const upload = req.app.locals.upload
    upload.single("vehicleImage")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        })
      }
      next()
    })
  },
  (req, res) => {
    // Route to appropriate registration based on request data
    if (req.body.driver_license || req.body.vehicle_model) {
      return authController.registerDriver(req, res)
    } else {
      return authController.registerUser(req, res)
    }
  }
)

// Authentication routes
router.post("/login", authController.login)
router.get("/logout", authController.logout)

// Protected routes - Profile management
router.get("/profile", isAuthenticated, authController.getProfile)

// Location update
router.post("/update-location", isAuthenticated, authController.updateLocation)

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth service is running",
    timestamp: new Date().toISOString(),
  })
})

module.exports = router