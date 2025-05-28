const db = require("../config/database")

const rideController = {
  // Updated to use text-based location instead of coordinates
  getNearbyDrivers: async (req, res) => {
    try {
      const { location } = req.body

      if (!location || location.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Location is required",
        })
      }

      console.log(`Searching for drivers in location: ${location}`)

      // Query to find available drivers in the same or similar location
      const query = `
        SELECT 
          d.id,
          d.username,
          d.email,
          d.phone_number,
          d.location,
          d.vehicle_model,
          d.vehicle_color,
          d.vehicle_plate,
          d.driver_license,
          d.years_of_experience,
          d.license_verified,
          d.available,
          d.vehicle_image
        FROM drivers d
        WHERE d.license_verified = 1 
          AND d.available = 1
          AND d.is_active = 1
          AND d.location LIKE ?
        ORDER BY d.created_at DESC
        LIMIT 20
      `

      const [drivers] = await db.execute(query, [`%${location.trim()}%`])

      console.log(`Found ${drivers.length} drivers in location: ${location}`)

      res.json({
        success: true,
        drivers: drivers,
        message: `Found ${drivers.length} drivers in ${location}`,
      })
    } catch (error) {
      console.error("Error finding nearby drivers:", error)
      res.status(500).json({
        success: false,
        message: "Failed to find nearby drivers",
        error: error.message,
      })
    }
  },

  // Updated to use text-based location
  getAllAvailableDrivers: async (req, res) => {
    try {
      console.log("Fetching all available drivers...")

      const query = `
        SELECT 
          d.id,
          d.username,
          d.email,
          d.phone_number,
          d.location,
          d.vehicle_model,
          d.vehicle_color,
          d.vehicle_plate,
          d.driver_license,
          d.years_of_experience,
          d.license_verified,
          d.available,
          d.vehicle_image,
          d.created_at
        FROM drivers d
        WHERE d.license_verified = 1 
          AND d.available = 1
          AND d.is_active = 1
        ORDER BY d.location, d.created_at DESC
        LIMIT 50
      `

      const [drivers] = await db.execute(query)

      console.log(`Found ${drivers.length} available drivers`)

      res.json({
        success: true,
        drivers: drivers,
        message: `Found ${drivers.length} available drivers`,
      })
    } catch (error) {
      console.error("Error fetching available drivers:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch available drivers",
        error: error.message,
      })
    }
  },

  // Updated to use text-based location
  requestRide: async (req, res) => {
    try {
      const { driverId, pickupLocation, dropoffLocation, fare } = req.body
      const userId = req.session.user.id

      if (!driverId || !pickupLocation || !dropoffLocation || !fare) {
        return res.status(400).json({
          success: false,
          message: "Driver ID, pickup location, dropoff location, and fare are required",
        })
      }

      console.log("Creating ride request:", {
        userId,
        driverId,
        pickupLocation,
        dropoffLocation,
        fare,
      })

      // Check if driver exists and is available
      const [driverCheck] = await db.execute(
        `SELECT id, username, available, location
         FROM drivers 
         WHERE id = ? AND is_active = 1`,
        [driverId],
      )

      if (driverCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        })
      }

      if (driverCheck[0].available !== 1) {
        return res.status(400).json({
          success: false,
          message: "Driver is not available",
        })
      }

      // Create the ride with text-based locations
      const [result] = await db.execute(
        `INSERT INTO rides (
          user_id, driver_id, pickup_location, dropoff_location, 
          fare, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, 'requested', 'pending')`,
        [
          userId,
          driverId,
          pickupLocation,
          dropoffLocation,
          fare,
        ],
      )

      const rideId = result.insertId

      // Update driver availability
      await db.execute("UPDATE drivers SET available = 0 WHERE id = ?", [driverId])

      console.log("Ride created successfully with ID:", rideId)

      res.json({
        success: true,
        rideId: rideId,
        message: "Ride requested successfully",
      })
    } catch (error) {
      console.error("Error requesting ride:", error)
      res.status(500).json({
        success: false,
        message: "Failed to request ride",
        error: error.message,
      })
    }
  },

  // Updated to use text-based location
  getRideDetails: async (req, res) => {
    try {
      const { rideId } = req.params
      const userId = req.session.user.id

      console.log("Fetching ride details for ride ID:", rideId)

      const query = `
        SELECT 
          r.*,
          u.username as user_name,
          d.username as driver_name,
          d.vehicle_model,
          d.vehicle_color,
          d.vehicle_plate,
          d.location as driver_location
        FROM rides r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN drivers d ON r.driver_id = d.id
        WHERE r.id = ? AND (r.user_id = ? OR r.driver_id = ?)
      `

      const [rides] = await db.execute(query, [rideId, userId, userId])

      if (rides.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Ride not found",
        })
      }

      res.json({
        success: true,
        ride: rides[0],
      })
    } catch (error) {
      console.error("Error fetching ride details:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch ride details",
        error: error.message,
      })
    }
  },

  // Updated to use text-based location
  getRideHistory: async (req, res) => {
    try {
      const userId = req.session.user.id
      const userType = req.session.user.userType // Changed from role to userType to match auth middleware

      console.log("Fetching ride history for user:", userId, "type:", userType)

      let query
      if (userType === "driver") {
        // User is a driver, get rides where they are the driver
        query = `
          SELECT 
            r.*,
            u.username as user_name
          FROM rides r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.driver_id = ?
          ORDER BY r.created_at DESC
          LIMIT 50
        `
      } else {
        // User is a regular user, get rides where they are the user
        query = `
          SELECT 
            r.*,
            d.username as driver_name,
            d.vehicle_model,
            d.vehicle_color,
            d.vehicle_plate,
            d.location as driver_location
          FROM rides r
          LEFT JOIN drivers d ON r.driver_id = d.id
          WHERE r.user_id = ?
          ORDER BY r.created_at DESC
          LIMIT 50
        `
      }

      const [rides] = await db.execute(query, [userId])

      res.json({
        success: true,
        rides: rides,
      })
    } catch (error) {
      console.error("Error fetching ride history:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch ride history",
        error: error.message,
      })
    }
  },

  // Updated to use fixed fare calculation instead of distance-based
  calculateFare: async (req, res) => {
    try {
      const { pickupLocation, dropoffLocation } = req.body

      if (!pickupLocation || !dropoffLocation) {
        return res.status(400).json({
          success: false,
          message: "Pickup and dropoff locations are required",
        })
      }

      // Since we no longer have coordinates, we'll use a simplified fare calculation
      // based on a fixed base fare plus a random factor to simulate distance
      
      const baseFare = 5.0
      
      // Generate a random "distance" factor between 1-10 km
      // In a real app, you might use a geocoding API to calculate actual distance
      const estimatedDistance = Math.random() * 9 + 1
      
      const ratePerKm = 2.5
      const distanceFare = estimatedDistance * ratePerKm
      const totalFare = baseFare + distanceFare

      console.log(`Calculated fare: Estimated distance ~${estimatedDistance.toFixed(2)}km, Fare $${totalFare.toFixed(2)}`)

      res.json({
        success: true,
        estimatedDistance: estimatedDistance,
        fare: parseFloat(totalFare.toFixed(2)),
        breakdown: {
          baseFare: baseFare,
          distanceFare: parseFloat(distanceFare.toFixed(2)),
          ratePerKm: ratePerKm,
        },
      })
    } catch (error) {
      console.error("Error calculating fare:", error)
      res.status(500).json({
        success: false,
        message: "Failed to calculate fare",
        error: error.message,
      })
    }
  },
}

module.exports = rideController