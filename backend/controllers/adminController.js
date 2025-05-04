// Updated controllers/adminController.js

const db = require("../config/database")

const adminController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Get verified drivers count (removed the is_active check)
      const [verifiedDriversResult] = await db.query(
        "SELECT COUNT(*) as total FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.license_verified = 1",
      )
      const verifiedDrivers = verifiedDriversResult[0].total

      // Get pending verification drivers count
      const [pendingDriversResult] = await db.query(
        "SELECT COUNT(*) as total FROM drivers d WHERE d.license_verified = 0",
      )
      const pendingDrivers = pendingDriversResult[0].total

      // Get total users count
      const [usersResult] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = "user"')
      const totalUsers = usersResult[0].total

      // Get total completed rides
      const [completedRidesResult] = await db.query('SELECT COUNT(*) as total FROM rides WHERE status = "completed"')
      const completedRides = completedRidesResult[0].total

      // Get total earnings
      const [earningsResult] = await db.query(
        'SELECT SUM(fare) as total FROM rides WHERE status = "completed" AND payment_status = "paid"',
      )
      const totalEarnings = earningsResult[0].total || 0

      // Get recent rides
      const [recentRides] = await db.query(
        `SELECT r.id, r.pickup_latitude, r.pickup_longitude, r.dropoff_latitude, r.dropoff_longitude, 
         r.fare, r.status, r.payment_status, r.created_at,
         u.username as user_name, d.username as driver_name
         FROM rides r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN users d ON r.driver_id = d.id
         ORDER BY r.created_at DESC LIMIT 10`,
      )

      return res.status(200).json({
        success: true,
        stats: {
          verifiedDrivers,
          pendingDrivers,
          totalUsers,
          completedRides,
          totalEarnings,
          recentRides,
        },
      })
    } catch (error) {
      console.error("Get dashboard stats error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching dashboard statistics",
      })
    }
  },

  // Get pending driver verifications
  getPendingDrivers: async (req, res) => {
    try {
      const [drivers] = await db.query(
        `SELECT d.user_id, d.license_verified, d.vehicle_model, d.vehicle_color, 
         d.vehicle_plate, d.driver_license, d.vehicle_image, d.years_of_experience,
         u.username, u.email, u.phone_number, u.created_at
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         WHERE d.license_verified = 0
         ORDER BY u.created_at DESC`,
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
        "UPDATE drivers SET license_verified = ? WHERE user_id = ?",
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
      })
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const [users] = await db.query(
        `SELECT id, username, email, phone_number, role, created_at 
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
      })
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const userId = req.params.id;
      
      const [users] = await db.query(
        `SELECT id, username, email, phone_number, role, created_at 
         FROM users
         WHERE id = ?`,
        [userId]
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
      })
    }
  },

  // Create a new user
  createUser: async (req, res) => {
    try {
      const { username, email, phone_number, password, role } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Username, email, and password are required",
        })
      }

      // Check if user already exists
      const [existingUsers] = await db.query(
        "SELECT id FROM users WHERE email = ? OR username = ?",
        [email, username]
      )

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User with this email or username already exists",
        })
      }

      // Hash password (assuming you have a bcrypt utility)
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const [result] = await db.query(
        "INSERT INTO users (username, email, phone_number, password, role) VALUES (?, ?, ?, ?, ?)",
        [username, email, phone_number || null, hashedPassword, role || "user"]
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
      })
    }
  },

  // Update a user
  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const { username, email, phone_number, role, password } = req.body;
      
      // Check if user exists
      const [existingUsers] = await db.query(
        "SELECT id FROM users WHERE id = ?",
        [userId]
      )

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Build update query dynamically based on provided fields
      let updateFields = [];
      let queryParams = [];

      if (username) {
        updateFields.push("username = ?");
        queryParams.push(username);
      }

      if (email) {
        updateFields.push("email = ?");
        queryParams.push(email);
      }

      if (phone_number !== undefined) {
        updateFields.push("phone_number = ?");
        queryParams.push(phone_number);
      }

      if (role) {
        updateFields.push("role = ?");
        queryParams.push(role);
      }

      if (password) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push("password = ?");
        queryParams.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        })
      }

      // Add userId to params array
      queryParams.push(userId);

      // Execute update query
      await db.query(
        `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
        queryParams
      )

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
      })
    } catch (error) {
      console.error("Update user error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error updating user",
      })
    }
  },

  // Delete a user
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Check if user exists
      const [existingUsers] = await db.query(
        "SELECT id, role FROM users WHERE id = ?",
        [userId]
      )

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Check if user is a driver
      if (existingUsers[0].role === "driver") {
        // Delete from drivers table first (foreign key constraint)
        await db.query("DELETE FROM drivers WHERE user_id = ?", [userId]);
      }

      // Delete user
      await db.query("DELETE FROM users WHERE id = ?", [userId]);

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      })
    } catch (error) {
      console.error("Delete user error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error deleting user",
      })
    }
  },

  // Get all drivers
  getAllDrivers: async (req, res) => {
    try {
      const [drivers] = await db.query(
        `SELECT d.user_id, d.license_verified, d.vehicle_model, d.vehicle_color, 
         d.vehicle_plate, d.driver_license, d.vehicle_image, d.years_of_experience,
         d.available, u.username, u.email, u.phone_number, u.created_at
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         ORDER BY u.created_at DESC`,
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
      })
    }
  },

  // Get driver by ID
  getDriverById: async (req, res) => {
    try {
      const driverId = req.params.id;
      
      const [drivers] = await db.query(
        `SELECT d.user_id, d.license_verified, d.vehicle_model, d.vehicle_color, 
         d.vehicle_plate, d.driver_license, d.vehicle_image, d.years_of_experience,
         d.available, u.username, u.email, u.phone_number, u.created_at
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         WHERE d.user_id = ?`,
        [driverId]
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
        vehicle_model,
        vehicle_color,
        vehicle_plate,
        driver_license,
        vehicle_image,
        years_of_experience,
        license_verified
      } = req.body;
      
      // Start a transaction
      await db.query("START TRANSACTION");
      
      // Create user account first
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [userResult] = await db.query(
        "INSERT INTO users (username, email, phone_number, password, role) VALUES (?, ?, ?, ?, 'driver')",
        [username, email, phone_number || null, hashedPassword]
      );
      
      const userId = userResult.insertId;
      
      // Create driver record
      await db.query(
        `INSERT INTO drivers 
         (user_id, vehicle_model, vehicle_color, vehicle_plate, driver_license, 
          vehicle_image, years_of_experience, license_verified, available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          userId,
          vehicle_model,
          vehicle_color,
          vehicle_plate,
          driver_license,
          vehicle_image,
          years_of_experience || 0,
          license_verified || 0
        ]
      );
      
      // Commit transaction
      await db.query("COMMIT");
      
      return res.status(201).json({
        success: true,
        message: "Driver created successfully",
        driverId: userId,
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      console.error("Create driver error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error creating driver",
      });
    }
  },

  // Update a driver
  updateDriver: async (req, res) => {
    try {
      const driverId = req.params.id;
      const { 
        username, 
        email, 
        phone_number,
        vehicle_model,
        vehicle_color,
        vehicle_plate,
        driver_license,
        vehicle_image,
        years_of_experience,
        license_verified,
        available,
        password
      } = req.body;
      
      // Start transaction
      await db.query("START TRANSACTION");
      
      // Check if driver exists
      const [drivers] = await db.query(
        "SELECT user_id FROM drivers WHERE user_id = ?",
        [driverId]
      );
      
      if (drivers.length === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }
      
      // Update user information if provided
      if (username || email || phone_number || password) {
        let updateFields = [];
        let queryParams = [];
        
        if (username) {
          updateFields.push("username = ?");
          queryParams.push(username);
        }
        
        if (email) {
          updateFields.push("email = ?");
          queryParams.push(email);
        }
        
        if (phone_number !== undefined) {
          updateFields.push("phone_number = ?");
          queryParams.push(phone_number);
        }
        
        if (password) {
          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash(password, 10);
          updateFields.push("password = ?");
          queryParams.push(hashedPassword);
        }
        
        if (updateFields.length > 0) {
          queryParams.push(driverId);
          await db.query(
            `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
            queryParams
          );
        }
      }
      
      // Update driver information if provided
      if (vehicle_model || vehicle_color || vehicle_plate || driver_license || 
          vehicle_image !== undefined || years_of_experience !== undefined || 
          license_verified !== undefined || available !== undefined) {
        
        let updateFields = [];
        let queryParams = [];
        
        if (vehicle_model) {
          updateFields.push("vehicle_model = ?");
          queryParams.push(vehicle_model);
        }
        
        if (vehicle_color) {
          updateFields.push("vehicle_color = ?");
          queryParams.push(vehicle_color);
        }
        
        if (vehicle_plate) {
          updateFields.push("vehicle_plate = ?");
          queryParams.push(vehicle_plate);
        }
        
        if (driver_license) {
          updateFields.push("driver_license = ?");
          queryParams.push(driver_license);
        }
        
        if (vehicle_image !== undefined) {
          updateFields.push("vehicle_image = ?");
          queryParams.push(vehicle_image);
        }
        
        if (years_of_experience !== undefined) {
          updateFields.push("years_of_experience = ?");
          queryParams.push(years_of_experience);
        }
        
        if (license_verified !== undefined) {
          updateFields.push("license_verified = ?");
          queryParams.push(license_verified);
        }
        
        if (available !== undefined) {
          updateFields.push("available = ?");
          queryParams.push(available);
        }
        
        if (updateFields.length > 0) {
          queryParams.push(driverId);
          await db.query(
            `UPDATE drivers SET ${updateFields.join(", ")} WHERE user_id = ?`,
            queryParams
          );
        }
      }
      
      // Commit transaction
      await db.query("COMMIT");
      
      return res.status(200).json({
        success: true,
        message: "Driver updated successfully",
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      console.error("Update driver error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error updating driver",
      });
    }
  },

  // Delete a driver
  deleteDriver: async (req, res) => {
    try {
      const driverId = req.params.id;
      
      // Start transaction
      await db.query("START TRANSACTION");
      
      // Check if driver exists
      const [drivers] = await db.query(
        "SELECT user_id FROM drivers WHERE user_id = ?",
        [driverId]
      );
      
      if (drivers.length === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }
      
      // Delete driver record first
      await db.query("DELETE FROM drivers WHERE user_id = ?", [driverId]);
      
      // Delete user record
      await db.query("DELETE FROM users WHERE id = ?", [driverId]);
      
      // Commit transaction
      await db.query("COMMIT");
      
      return res.status(200).json({
        success: true,
        message: "Driver deleted successfully",
      });
      
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      console.error("Delete driver error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error deleting driver",
      });
    }
  },

  // Get all rides
  getAllRides: async (req, res) => {
    try {
      const [rides] = await db.query(
        `SELECT r.id, r.pickup_latitude, r.pickup_longitude, r.dropoff_latitude, r.dropoff_longitude, 
         r.fare, r.status, r.payment_status, r.created_at, r.completed_at,
         u.username as user_name, d.username as driver_name
         FROM rides r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN users d ON r.driver_id = d.id
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
      })
    }
  },
}

module.exports = adminController