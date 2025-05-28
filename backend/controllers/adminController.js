const db = require("../config/database")

const adminController = {
  // Get dashboard statistics - FIXED VERSION
  getDashboardStats: async (req, res) => {
    try {
      console.log("Fetching dashboard statistics...")

      // Get verified drivers count
      const [verifiedDriversResult] = await db.query("SELECT COUNT(*) as total FROM drivers WHERE license_verified = 1")
      const verifiedDrivers = verifiedDriversResult[0].total

      // Get pending verification drivers count
      const [pendingDriversResult] = await db.query("SELECT COUNT(*) as total FROM drivers WHERE license_verified = 0")
      const pendingDrivers = pendingDriversResult[0].total

      // Get total users count
      const [usersResult] = await db.query("SELECT COUNT(*) as total FROM users")
      const totalUsers = usersResult[0].total

      // Get total completed rides
      const [completedRidesResult] = await db.query('SELECT COUNT(*) as total FROM rides WHERE status = "completed"')
      const completedRides = completedRidesResult[0].total

      // Get total earnings
      const [earningsResult] = await db.query(
        'SELECT SUM(fare) as total FROM rides WHERE status = "completed" AND payment_status = "paid"',
      )
      const totalEarnings = earningsResult[0].total || 0

      // Get recent rides - FIXED to use correct column names
      const [recentRides] = await db.query(
        `SELECT r.id, r.pickup_location, r.dropoff_location, 
         r.fare, r.status, r.payment_status, r.created_at,
         u.username as user_name, d.username as driver_name
         FROM rides r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN drivers d ON r.driver_id = d.id
         ORDER BY r.created_at DESC LIMIT 10`,
      )

      console.log("Dashboard stats fetched successfully:", {
        verifiedDrivers,
        pendingDrivers,
        totalUsers,
        completedRides,
        totalEarnings: Number.parseFloat(totalEarnings),
        recentRidesCount: recentRides.length,
      })

      return res.status(200).json({
        success: true,
        stats: {
          verifiedDrivers,
          pendingDrivers,
          totalUsers,
          completedRides,
          totalEarnings: Number.parseFloat(totalEarnings),
          recentRides,
        },
      })
    } catch (error) {
      console.error("Get dashboard stats error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching dashboard statistics",
        error: error.message,
      })
    }
  },

  // Get pending driver verifications
  getPendingDrivers: async (req, res) => {
    try {
      const [drivers] = await db.query(
        `SELECT id, username, email, phone_number, driver_license, vehicle_model, 
         vehicle_color, vehicle_plate, vehicle_image, years_of_experience, location, created_at
         FROM drivers
         WHERE license_verified = 0
         ORDER BY created_at DESC`,
      )

      return res.status(200).json({
        success: true,
        drivers,
      })
    } catch (error) {
      console.error("Get pending drivers error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching pending drivers",
        error: error.message,
      })
    }
  },

  // Approve or reject driver verification
  updateDriverVerification: async (req, res) => {
    try {
      const { driverId, approved } = req.body

      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: "Driver ID is required",
        })
      }

      // Update driver verification status
      await db.query(
        "UPDATE drivers SET license_verified = ? WHERE id = ?",
        [approved ? 1 : 2, driverId], // 1 = verified, 2 = rejected
      )

      return res.status(200).json({
        success: true,
        message: approved ? "Driver approved successfully" : "Driver rejected successfully",
      })
    } catch (error) {
      console.error("Update driver verification error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error updating driver verification",
        error: error.message,
      })
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const [users] = await db.query(
        `SELECT id, username, email, phone_number, created_at, is_active
         FROM users
         ORDER BY created_at DESC`,
      )

      return res.status(200).json({
        success: true,
        users,
      })
    } catch (error) {
      console.error("Get all users error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching users",
        error: error.message,
      })
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const userId = req.params.id

      const [users] = await db.query(
        `SELECT id, username, email, phone_number, created_at, is_active
         FROM users
         WHERE id = ?`,
        [userId],
      )

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      return res.status(200).json({
        success: true,
        user: users[0],
      })
    } catch (error) {
      console.error("Get user by ID error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching user",
        error: error.message,
      })
    }
  },

  // Create a new user
  createUser: async (req, res) => {
    try {
      const { username, email, phone_number, password } = req.body

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Username, email, and password are required",
        })
      }

      // Check if user already exists in any table
      const [existingUsers] = await db.query("SELECT email FROM users WHERE email = ? OR username = ?", [
        email,
        username,
      ])
      const [existingDrivers] = await db.query("SELECT email FROM drivers WHERE email = ? OR username = ?", [
        email,
        username,
      ])

      // Check admins table if it exists
      let existingAdmins = []
      try {
        const [adminCheck] = await db.query("SELECT email FROM admins WHERE email = ? OR username = ?", [
          email,
          username,
        ])
        existingAdmins = adminCheck
      } catch (adminError) {
        console.log("Admins table doesn't exist, skipping admin check")
      }

      if (existingUsers.length > 0 || existingDrivers.length > 0 || existingAdmins.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User with this email or username already exists",
        })
      }

      // Hash password
      const bcrypt = require("bcrypt")
      const hashedPassword = await bcrypt.hash(password, 10)

      // Insert new user
      const [result] = await db.query(
        "INSERT INTO users (username, email, phone_number, password) VALUES (?, ?, ?, ?)",
        [username, email, phone_number || null, hashedPassword],
      )

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        userId: result.insertId,
      })
    } catch (error) {
      console.error("Create user error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error creating user",
        error: error.message,
      })
    }
  },

  // Update a user
  updateUser: async (req, res) => {
    try {
      const userId = req.params.id
      const { username, email, phone_number, password } = req.body

      // Check if user exists
      const [existingUsers] = await db.query("SELECT id FROM users WHERE id = ?", [userId])

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Build update query dynamically
      const updateFields = []
      const queryParams = []

      if (username) {
        updateFields.push("username = ?")
        queryParams.push(username)
      }

      if (email) {
        updateFields.push("email = ?")
        queryParams.push(email)
      }

      if (phone_number !== undefined) {
        updateFields.push("phone_number = ?")
        queryParams.push(phone_number)
      }

      if (password) {
        const bcrypt = require("bcrypt")
        const hashedPassword = await bcrypt.hash(password, 10)
        updateFields.push("password = ?")
        queryParams.push(hashedPassword)
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        })
      }

      queryParams.push(userId)

      await db.query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, queryParams)

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
      })
    } catch (error) {
      console.error("Update user error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error updating user",
        error: error.message,
      })
    }
  },

  // Delete a user
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id

      // Check if user exists
      const [existingUsers] = await db.query("SELECT id FROM users WHERE id = ?", [userId])

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Delete user (rides will be handled by foreign key constraints)
      await db.query("DELETE FROM users WHERE id = ?", [userId])

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      })
    } catch (error) {
      console.error("Delete user error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error deleting user",
        error: error.message,
      })
    }
  },

  // Get all drivers
  getAllDrivers: async (req, res) => {
    try {
      const [drivers] = await db.query(
        `SELECT id, username, email, phone_number, driver_license, vehicle_model, 
         vehicle_color, vehicle_plate, vehicle_image, years_of_experience, 
         license_verified, available, is_active, location, created_at
         FROM drivers
         ORDER BY created_at DESC`,
      )

      return res.status(200).json({
        success: true,
        drivers,
      })
    } catch (error) {
      console.error("Get all drivers error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching drivers",
        error: error.message,
      })
    }
  },

  // Get driver by ID
  getDriverById: async (req, res) => {
    try {
      const driverId = req.params.id

      const [drivers] = await db.query(
        `SELECT id, username, email, phone_number, driver_license, vehicle_model, 
         vehicle_color, vehicle_plate, vehicle_image, years_of_experience, 
         license_verified, available, is_active, location, created_at
         FROM drivers
         WHERE id = ?`,
        [driverId],
      )

      if (drivers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        })
      }

      return res.status(200).json({
        success: true,
        driver: drivers[0],
      })
    } catch (error) {
      console.error("Get driver by ID error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching driver",
        error: error.message,
      })
    }
  },

  // Create a new driver
  createDriver: async (req, res) => {
    try {
      const {
        username,
        email,
        phone_number,
        password,
        location,
        vehicle_model,
        vehicle_color,
        vehicle_plate,
        driver_license,
        vehicle_image,
        years_of_experience,
        license_verified,
      } = req.body

      if (
        !username ||
        !email ||
        !password ||
        !driver_license ||
        !vehicle_model ||
        !vehicle_color ||
        !vehicle_plate ||
        !location
      ) {
        return res.status(400).json({
          success: false,
          message: "All required fields must be provided including location",
        })
      }

      // Check if email/username/license already exists
      const [existingUsers] = await db.query("SELECT email FROM users WHERE email = ? OR username = ?", [
        email,
        username,
      ])
      const [existingDrivers] = await db.query(
        "SELECT email FROM drivers WHERE email = ? OR username = ? OR driver_license = ?",
        [email, username, driver_license],
      )

      // Check admins table if it exists
      let existingAdmins = []
      try {
        const [adminCheck] = await db.query("SELECT email FROM admins WHERE email = ? OR username = ?", [
          email,
          username,
        ])
        existingAdmins = adminCheck
      } catch (adminError) {
        console.log("Admins table doesn't exist, skipping admin check")
      }

      if (existingUsers.length > 0 || existingDrivers.length > 0 || existingAdmins.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email, username, or driver license already exists",
        })
      }

      // Hash password
      const bcrypt = require("bcrypt")
      const hashedPassword = await bcrypt.hash(password, 10)

      // Insert driver
      const [result] = await db.query(
        `INSERT INTO drivers (
          username, email, phone_number, password, driver_license, 
          vehicle_model, vehicle_color, vehicle_plate, vehicle_image, 
          years_of_experience, license_verified, available, location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          username,
          email,
          phone_number || null,
          hashedPassword,
          driver_license,
          vehicle_model,
          vehicle_color,
          vehicle_plate,
          vehicle_image,
          years_of_experience || 0,
          license_verified || 0,
          location,
        ],
      )

      return res.status(201).json({
        success: true,
        message: "Driver created successfully",
        driverId: result.insertId,
      })
    } catch (error) {
      console.error("Create driver error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error creating driver",
        error: error.message,
      })
    }
  },

  // Update a driver
  updateDriver: async (req, res) => {
    try {
      const driverId = req.params.id
      const {
        username,
        email,
        phone_number,
        password,
        location,
        vehicle_model,
        vehicle_color,
        vehicle_plate,
        driver_license,
        vehicle_image,
        years_of_experience,
        license_verified,
        available,
      } = req.body

      // Check if driver exists
      const [drivers] = await db.query("SELECT id FROM drivers WHERE id = ?", [driverId])

      if (drivers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        })
      }

      // Build update query dynamically
      const updateFields = []
      const queryParams = []

      if (username) {
        updateFields.push("username = ?")
        queryParams.push(username)
      }

      if (email) {
        updateFields.push("email = ?")
        queryParams.push(email)
      }

      if (phone_number !== undefined) {
        updateFields.push("phone_number = ?")
        queryParams.push(phone_number)
      }

      if (password) {
        const bcrypt = require("bcrypt")
        const hashedPassword = await bcrypt.hash(password, 10)
        updateFields.push("password = ?")
        queryParams.push(hashedPassword)
      }

      if (location) {
        updateFields.push("location = ?")
        queryParams.push(location)
      }

      if (vehicle_model) {
        updateFields.push("vehicle_model = ?")
        queryParams.push(vehicle_model)
      }

      if (vehicle_color) {
        updateFields.push("vehicle_color = ?")
        queryParams.push(vehicle_color)
      }

      if (vehicle_plate) {
        updateFields.push("vehicle_plate = ?")
        queryParams.push(vehicle_plate)
      }

      if (driver_license) {
        updateFields.push("driver_license = ?")
        queryParams.push(driver_license)
      }

      if (vehicle_image !== undefined) {
        updateFields.push("vehicle_image = ?")
        queryParams.push(vehicle_image)
      }

      if (years_of_experience !== undefined) {
        updateFields.push("years_of_experience = ?")
        queryParams.push(years_of_experience)
      }

      if (license_verified !== undefined) {
        updateFields.push("license_verified = ?")
        queryParams.push(license_verified)
      }

      if (available !== undefined) {
        updateFields.push("available = ?")
        queryParams.push(available)
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        })
      }

      queryParams.push(driverId)
      await db.query(`UPDATE drivers SET ${updateFields.join(", ")} WHERE id = ?`, queryParams)

      return res.status(200).json({
        success: true,
        message: "Driver updated successfully",
      })
    } catch (error) {
      console.error("Update driver error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error updating driver",
        error: error.message,
      })
    }
  },

  // Delete a driver
  deleteDriver: async (req, res) => {
    try {
      const driverId = req.params.id

      // Check if driver exists
      const [drivers] = await db.query("SELECT id FROM drivers WHERE id = ?", [driverId])

      if (drivers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        })
      }

      // Delete driver (rides will be handled by foreign key constraints)
      await db.query("DELETE FROM drivers WHERE id = ?", [driverId])

      return res.status(200).json({
        success: true,
        message: "Driver deleted successfully",
      })
    } catch (error) {
      console.error("Delete driver error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error deleting driver",
        error: error.message,
      })
    }
  },

  // Get all rides - FIXED to use correct column names
  getAllRides: async (req, res) => {
    try {
      const [rides] = await db.query(
        `SELECT r.id, r.pickup_location, r.dropoff_location, 
         r.fare, r.status, r.payment_status, r.created_at, r.completed_at,
         u.username as user_name, d.username as driver_name
         FROM rides r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN drivers d ON r.driver_id = d.id
         ORDER BY r.created_at DESC`,
      )

      return res.status(200).json({
        success: true,
        rides,
      })
    } catch (error) {
      console.error("Get all rides error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching rides",
        error: error.message,
      })
    }
  },
}

module.exports = adminController
