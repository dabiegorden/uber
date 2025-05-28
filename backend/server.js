const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const db = require("./config/database")
const sessionConfig = require("./config/session")
const authRoutes = require("./routes/auth")
const rideRoutes = require("./routes/rideRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const adminRoutes = require("./routes/adminRoutes")
const driverRoutes = require("./routes/driverRoutes")
const errorHandler = require("./middleware/errorHandler") // Add error handler
const dotenv = require("dotenv")
const authController = require("./controllers/authController")
const bcrypt = require("bcrypt")
dotenv.config()

const app = express()

// Configure multer for file uploads
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

// Make upload available globally
app.locals.upload = upload

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Session configuration
app.use(sessionConfig(db))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/rides", rideRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/drivers", driverRoutes)

// Update user location
app.post("/api/update-location", (req, res) => {
  authController.updateLocation(req, res)
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Enhanced error handling middleware - MUST be last
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

// Start server
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = app
