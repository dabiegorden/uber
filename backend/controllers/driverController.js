// Create a new file: controllers/driverController.js

const db = require("../config/database");
const fs = require('fs');
const path = require('path');

const driverController = {
// Add this to your controllers/driverController.js
getRecentRides: async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = req.session.user.id;

    // Check if user is a driver
    const [drivers] = await db.query(
      "SELECT * FROM drivers WHERE user_id = ?",
      [userId]
    );

    if (drivers.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only drivers can access ride history"
      });
    }

    // Get recent rides for this driver
    const [rides] = await db.query(
      `SELECT r.*, 
        u.username as user_name,
        DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i') as formatted_date
      FROM rides r
      JOIN users u ON r.user_id = u.id
      WHERE r.driver_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      rides: rides
    });
  } catch (error) {
    console.error("Get recent rides error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching recent rides"
    });
  }
},

  // Get driver earnings
  getEarnings: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userId = req.session.user.id;

      // Check if user is a driver
      const [drivers] = await db.query(
        "SELECT * FROM drivers WHERE user_id = ?",
        [userId]
      );

      if (drivers.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Only drivers can access earnings"
        });
      }

      // Get today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [todayEarnings] = await db.query(
        `SELECT COALESCE(SUM(fare), 0) as total FROM rides 
         WHERE driver_id = ? AND status = 'completed' AND payment_status = 'paid'
         AND created_at >= ?`,
        [userId, today]
      );

      // Get this week's earnings
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const [weekEarnings] = await db.query(
        `SELECT COALESCE(SUM(fare), 0) as total FROM rides 
         WHERE driver_id = ? AND status = 'completed' AND payment_status = 'paid'
         AND created_at >= ?`,
        [userId, startOfWeek]
      );

      // Get this month's earnings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const [monthEarnings] = await db.query(
        `SELECT COALESCE(SUM(fare), 0) as total FROM rides 
         WHERE driver_id = ? AND status = 'completed' AND payment_status = 'paid'
         AND created_at >= ?`,
        [userId, startOfMonth]
      );

      // Get total earnings
      const [totalEarnings] = await db.query(
        `SELECT COALESCE(SUM(fare), 0) as total FROM rides 
         WHERE driver_id = ? AND status = 'completed' AND payment_status = 'paid'`,
        [userId]
      );

      // Get recent payments
      const [recentPayments] = await db.query(
        `SELECT r.id as ride_id, r.fare as amount, r.created_at
         FROM rides r
         WHERE r.driver_id = ? AND r.status = 'completed' AND r.payment_status = 'paid'
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        earnings: {
          today: parseFloat(todayEarnings[0].total) || 0,
          thisWeek: parseFloat(weekEarnings[0].total) || 0,
          thisMonth: parseFloat(monthEarnings[0].total) || 0,
          total: parseFloat(totalEarnings[0].total) || 0
        },
        recentPayments: recentPayments
      });
    } catch (error) {
      console.error("Get earnings error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error fetching earnings"
      });
    }
  },

  // Get driver by ID
  getDriverById: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }
      
      // Get driver details
      const [drivers] = await db.query(
        `SELECT d.*, u.username, u.email, u.phone_number, u.latitude, u.longitude  
         FROM drivers d 
         JOIN users u ON d.user_id = u.id 
         WHERE u.id = ?`,
        [id]
      );
      
      if (drivers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver not found"
        });
      }
      
      return res.status(200).json({
        success: true,
        driver: drivers[0]
      });
    } catch (error) {
      console.error("Get driver error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error fetching driver"
      });
    }
  },

  // Update driver profile
  updateDriverProfile: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userId = req.session.user.id;

      // Check if user is a driver
      const [drivers] = await db.query(
        "SELECT * FROM drivers WHERE user_id = ?",
        [userId]
      );

      if (drivers.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Only drivers can update driver profile"
        });
      }

      // Handle file upload if present
      if (req.file) {
        // Delete old image if exists
        if (drivers[0].vehicle_image) {
          const oldImagePath = path.join(__dirname, '..', drivers[0].vehicle_image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        // Update vehicle image
        await db.query(
          "UPDATE drivers SET vehicle_image = ? WHERE user_id = ?",
          [`/uploads/vehicles/${req.file.filename}`, userId]
        );
      }

      // Update other driver details if provided
      const { vehicle_model, vehicle_color, vehicle_plate } = req.body;
      if (vehicle_model || vehicle_color || vehicle_plate) {
        let updateQuery = "UPDATE drivers SET ";
        const updateValues = [];
        const updateFields = [];

        if (vehicle_model) {
          updateFields.push("vehicle_model = ?");
          updateValues.push(vehicle_model);
        }

        if (vehicle_color) {
          updateFields.push("vehicle_color = ?");
          updateValues.push(vehicle_color);
        }

        if (vehicle_plate) {
          updateFields.push("vehicle_plate = ?");
          updateValues.push(vehicle_plate);
        }

        updateQuery += updateFields.join(", ") + " WHERE user_id = ?";
        updateValues.push(userId);

        await db.query(updateQuery, updateValues);
      }

      return res.status(200).json({
        success: true,
        message: "Driver profile updated successfully"
      });
    } catch (error) {
      console.error("Update driver profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error updating driver profile"
      });
    }
  },

  // Update driver availability
  updateAvailability: async (req, res) => {
    try {
      const { available } = req.body;

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userId = req.session.user.id;

      // Check if user is a driver
      const [drivers] = await db.query(
        "SELECT * FROM drivers WHERE user_id = ?",
        [userId]
      );

      if (drivers.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Only drivers can update availability"
        });
      }

      // Update availability
      await db.query(
        "UPDATE drivers SET available = ? WHERE user_id = ?",
        [available ? 1 : 0, userId]
      );

      return res.status(200).json({
        success: true,
        message: "Availability updated successfully"
      });
    } catch (error) {
      console.error("Update availability error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error updating availability"
      });
    }
  }
};

module.exports = driverController;