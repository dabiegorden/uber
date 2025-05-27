const bcrypt = require("bcrypt")
const db = require("../config/database")

const authController = {
  // Register a new user (regular user only)
  registerUser: async (req, res) => {
    try {
      const { username, email, password, phone_number } = req.body

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide username, email, and password",
        })
      }

      // Check if email/username exists in any table
      const [existingUsers] = await db.query("SELECT email FROM users WHERE email = ? OR username = ?", [email, username])
      const [existingDrivers] = await db.query("SELECT email FROM drivers WHERE email = ? OR username = ?", [email, username])
      const [existingAdmins] = await db.query("SELECT email FROM admins WHERE email = ? OR username = ?", [email, username])

      if (existingUsers.length > 0 || existingDrivers.length > 0 || existingAdmins.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email or username already in use",
        })
      }

      // Hash password
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Insert new user
      const [userResult] = await db.query(
        "INSERT INTO users (username, email, password, phone_number) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, phone_number || null],
      )

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: userResult.insertId,
        userType: "user",
      })
    } catch (error) {
      console.error("User registration error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error during user registration",
      })
    }
  },

  // Register a new driver
  registerDriver: async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        phone_number,
        driver_license,
        vehicle_model,
        vehicle_color,
        vehicle_plate,
        years_of_experience,
      } = req.body

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide username, email, and password",
        })
      }

      if (!driver_license || !vehicle_model || !vehicle_color || !vehicle_plate) {
        return res.status(400).json({
          success: false,
          message: "Please provide all driver registration details: license, vehicle model, color, and plate",
        })
      }

      // Check if email/username exists in any table
      const [existingUsers] = await db.query("SELECT email FROM users WHERE email = ? OR username = ?", [email, username])
      const [existingDrivers] = await db.query("SELECT email FROM drivers WHERE email = ? OR username = ?", [email, username])
      const [existingAdmins] = await db.query("SELECT email FROM admins WHERE email = ? OR username = ?", [email, username])

      if (existingUsers.length > 0 || existingDrivers.length > 0 || existingAdmins.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email or username already in use",
        })
      }

      // Check if driver license is already registered
      const [existingLicense] = await db.query("SELECT driver_license FROM drivers WHERE driver_license = ?", [driver_license])

      if (existingLicense.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Driver license already registered",
        })
      }

      // Check if vehicle plate is already registered
      const [existingPlate] = await db.query("SELECT vehicle_plate FROM drivers WHERE vehicle_plate = ?", [vehicle_plate])

      if (existingPlate.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Vehicle plate already registered",
        })
      }

      // Hash password
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Get vehicle image path if uploaded
      const vehicleImagePath = req.file ? `/uploads/vehicles/${req.file.filename}` : null

      // Insert driver
      const [driverResult] = await db.query(
        `INSERT INTO drivers (
          username, email, password, phone_number,
          driver_license, vehicle_model, vehicle_color, vehicle_plate, 
          years_of_experience, vehicle_image, license_verified, available
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username,
          email,
          hashedPassword,
          phone_number || null,
          driver_license,
          vehicle_model,
          vehicle_color,
          vehicle_plate,
          years_of_experience || 0,
          vehicleImagePath,
          0, // Not verified initially
          1, // Available by default
        ],
      )

      return res.status(201).json({
        success: true,
        message: "Driver registered successfully. Please wait for license verification.",
        driverId: driverResult.insertId,
        userType: "driver",
      })
    } catch (error) {
      console.error("Driver registration error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error during driver registration",
      })
    }
  },

  // Unified login for all user types
  login: async (req, res) => {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide email and password",
        })
      }

      let user = null
      let userType = null

      // Check in users table
      const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email])
      if (users.length > 0) {
        user = users[0]
        userType = "user"
      }

      // Check in drivers table
      if (!user) {
        const [drivers] = await db.query("SELECT * FROM drivers WHERE email = ?", [email])
        if (drivers.length > 0) {
          user = drivers[0]
          userType = "driver"
        }
      }

      // Check in admins table
      if (!user) {
        const [admins] = await db.query("SELECT * FROM admins WHERE email = ?", [email])
        if (admins.length > 0) {
          user = admins[0]
          userType = "admin"
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        })
      }

      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password)

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        })
      }

      // Check if user is active
      if (user.is_active === 0) {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated",
        })
      }

      // Check if driver is verified
      if (userType === "driver" && user.license_verified === 0) {
        return res.status(403).json({
          success: false,
          message: "Your driver license is pending verification",
        })
      }

      if (userType === "driver" && user.license_verified === 2) {
        return res.status(403).json({
          success: false,
          message: "Your driver license has been rejected",
        })
      }

      // Set user session
      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: userType,
      }

      req.session.user_id = user.id

      // Determine redirect route
      let redirectRoute = "/map"
      if (userType === "admin") {
        redirectRoute = "/admin"
      } else if (userType === "driver") {
        redirectRoute = "/driver-dashboard"
      }

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: userType,
          redirectRoute: redirectRoute,
        },
      })
    } catch (error) {
      console.error("Login error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error during login",
      })
    }
  },

  // Get profile based on user type
  getProfile: async (req, res) => {
    try {
      const userId = req.session.user.id
      const userType = req.session.user.userType

      let table = userType === "driver" ? "drivers" : userType === "admin" ? "admins" : "users"

      const [users] = await db.query(
        `SELECT * FROM ${table} WHERE id = ?`,
        [userId],
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Remove password from response
      const { password, ...userProfile } = users[0]

      return res.status(200).json({
        success: true,
        user: userProfile,
        userType: userType,
      })
    } catch (error) {
      console.error("Get profile error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching profile",
      })
    }
  },

  // Update location
  updateLocation: async (req, res) => {
    try {
      const { latitude, longitude } = req.body

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      const userId = req.session.user.id
      const userType = req.session.user.userType

      let table = userType === "driver" ? "drivers" : "users"

      await db.query(`UPDATE ${table} SET latitude = ?, longitude = ?, last_location_update = NOW() WHERE id = ?`, [
        latitude,
        longitude,
        userId,
      ])

      return res.status(200).json({
        success: true,
        message: "Location updated successfully",
      })
    } catch (error) {
      console.error("Update location error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error updating location",
      })
    }
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error logging out",
        })
      }

      res.clearCookie("connect.sid")
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      })
    })
  },
}

module.exports = authController