const express = require("express")
const router = express.Router()
const driverController = require("../controllers/driverController")
const { isAuthenticated, isDriver } = require("../middleware/authMiddleware")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Configure multer for vehicle image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/vehicles"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `vehicle-${Date.now()}${path.extname(file.originalname)}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Not an image! Please upload only images."), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
})

// Apply authentication middleware to all routes
router.use(isAuthenticated)

// Driver-specific routes that require driver role
router.use(isDriver)

// Get recent rides for driver
router.get("/recent-rides", driverController.getRecentRides)

// Get driver earnings
router.get("/earnings", driverController.getEarnings)

// Update driver availability
router.post("/availability", driverController.updateAvailability)

// Update driver profile with vehicle image
router.put("/profile", upload.single("vehicle_image"), driverController.updateDriverProfile)

module.exports = router
