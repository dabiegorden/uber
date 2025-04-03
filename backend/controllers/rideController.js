const db = require("../config/database")

const rideController = {
  // Find available drivers near a location
  findNearbyDrivers: async (req, res) => {
    try {
      const { latitude, longitude, radius = 5 } = req.body // radius in kilometers

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      // SQL query using the Haversine formula to calculate distance
      // This query finds drivers who are available and have verified licenses
      const [drivers] = await db.query(
        `SELECT 
          u.id, u.username, u.latitude, u.longitude, 
          d.vehicle_model, d.vehicle_color, d.vehicle_plate,
          (
            6371 * acos(
              cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + 
              sin(radians(?)) * sin(radians(u.latitude))
            )
          ) AS distance
        FROM 
          users u
        JOIN 
          drivers d ON u.id = d.user_id
        WHERE 
          d.license_verified = 1 AND 
          d.available = 1 AND
          u.latitude IS NOT NULL AND 
          u.longitude IS NOT NULL
        HAVING 
          distance < ?
        ORDER BY 
          distance
        LIMIT 10`,
        [latitude, longitude, latitude, radius],
      )

      return res.status(200).json({
        success: true,
        drivers: drivers,
      })
    } catch (error) {
      console.error("Find nearby drivers error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error finding nearby drivers",
      })
    }
  },

  // Request a ride
  requestRide: async (req, res) => {
    try {
      const { driverId, pickupLocation, dropoffLocation } = req.body

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      const userId = req.session.user.id

      // Start a transaction
      const connection = await db.getConnection()
      try {
        await connection.beginTransaction()

        // Check if driver is still available
        const [driverStatus] = await connection.query(
          `SELECT d.available, u.id
           FROM drivers d
           JOIN users u ON d.user_id = u.id
           WHERE u.id = ? AND d.available = 1 AND d.license_verified = 1`,
          [driverId],
        )

        if (driverStatus.length === 0) {
          await connection.rollback()
          return res.status(400).json({
            success: false,
            message: "Driver is no longer available",
          })
        }

        // Create ride request
        const [rideResult] = await connection.query(
          `INSERT INTO rides (
            user_id, driver_id, pickup_latitude, pickup_longitude,
            dropoff_latitude, dropoff_longitude, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'requested', NOW())`,
          [
            userId,
            driverId,
            pickupLocation.latitude,
            pickupLocation.longitude,
            dropoffLocation.latitude,
            dropoffLocation.longitude,
          ],
        )

        // Update driver availability
        await connection.query(
          `UPDATE drivers d
           JOIN users u ON d.user_id = u.id
           SET d.available = 0
           WHERE u.id = ?`,
          [driverId],
        )

        await connection.commit()

        return res.status(201).json({
          success: true,
          message: "Ride requested successfully",
          rideId: rideResult.insertId,
        })
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error("Request ride error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error requesting ride",
      })
    }
  },

  // Get ride status
  getRideStatus: async (req, res) => {
    try {
      const { rideId } = req.params

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      const userId = req.session.user.id

      const [rides] = await db.query(
        `SELECT r.*, 
          u_driver.username as driver_name, 
          d.vehicle_model, d.vehicle_color, d.vehicle_plate,
          u_driver.latitude as driver_latitude, 
          u_driver.longitude as driver_longitude
        FROM rides r
        JOIN users u_driver ON r.driver_id = u_driver.id
        JOIN drivers d ON u_driver.id = d.user_id
        WHERE r.id = ? AND (r.user_id = ? OR r.driver_id = ?)`,
        [rideId, userId, userId],
      )

      if (rides.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Ride not found",
        })
      }

      return res.status(200).json({
        success: true,
        ride: rides[0],
      })
    } catch (error) {
      console.error("Get ride status error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching ride",
      })
    }
  },

  // For drivers to update their availability
  updateAvailability: async (req, res) => {
    try {
      const { available } = req.body

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      const userId = req.session.user.id

      // Check if user is a driver
      const [drivers] = await db.query("SELECT * FROM drivers WHERE user_id = ?", [userId])

      if (drivers.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Only drivers can update availability",
        })
      }

      // Update availability
      await db.query("UPDATE drivers SET available = ? WHERE user_id = ?", [available ? 1 : 0, userId])

      return res.status(200).json({
        success: true,
        message: "Availability updated successfully",
      })
    } catch (error) {
      console.error("Update availability error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error updating availability",
      })
    }
  },
}

module.exports = rideController

