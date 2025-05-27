const db = require("../config/database")

const rideController = {
  // Get nearby drivers
  getNearbyDrivers: async (req, res) => {
    try {
      const { latitude, longitude, radius = 10 } = req.body

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        })
      }

      console.log(`Searching for drivers within ${radius}km of coordinates: ${latitude}, ${longitude}`)

      // Query to find nearby available drivers using Haversine formula
      const query = `
        SELECT 
          d.id,
          d.username,
          d.email,
          d.phone_number,
          d.latitude,
          d.longitude,
          d.vehicle_model,
          d.vehicle_color,
          d.vehicle_plate,
          d.driver_license,
          d.years_of_experience,
          d.license_verified,
          d.available,
          d.vehicle_image,
          (
            6371 * acos(
              cos(radians(?)) * cos(radians(d.latitude)) * 
              cos(radians(d.longitude) - radians(?)) + 
              sin(radians(?)) * sin(radians(d.latitude))
            )
          ) AS distance
        FROM drivers d
        WHERE d.license_verified = 1 
          AND d.available = 1
          AND d.is_active = 1
          AND d.latitude IS NOT NULL 
          AND d.longitude IS NOT NULL
        HAVING distance <= ?
        ORDER BY distance ASC
        LIMIT 20
      `

      const [drivers] = await db.execute(query, [latitude, longitude, latitude, radius])

      console.log(`Found ${drivers.length} nearby drivers`)

      res.json({
        success: true,
        drivers: drivers,
        message: `Found ${drivers.length} drivers within ${radius}km`,
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

  // Get all available drivers
  getAllAvailableDrivers: async (req, res) => {
    try {
      console.log("Fetching all available drivers...")

      const query = `
        SELECT 
          d.id,
          d.username,
          d.email,
          d.phone_number,
          d.latitude,
          d.longitude,
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
        ORDER BY d.created_at DESC
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

  // Request a ride
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
        `SELECT id, username, available 
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

      // Create the ride
      const [result] = await db.execute(
        `INSERT INTO rides (
          user_id, driver_id, pickup_latitude, pickup_longitude, 
          dropoff_latitude, dropoff_longitude, fare, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', 'pending')`,
        [
          userId,
          driverId,
          pickupLocation.latitude,
          pickupLocation.longitude,
          dropoffLocation.latitude,
          dropoffLocation.longitude,
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

  // Get ride details
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
          d.vehicle_plate
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

  // Get user's ride history
  getRideHistory: async (req, res) => {
    try {
      const userId = req.session.user.id
      const userRole = req.session.user.role

      console.log("Fetching ride history for user:", userId, "role:", userRole)

      let query
      if (userRole === "driver") {
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
            d.vehicle_plate
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

  // Calculate fare for a ride
  calculateFare: async (req, res) => {
    try {
      const { pickupLocation, dropoffLocation } = req.body

      if (!pickupLocation || !dropoffLocation) {
        return res.status(400).json({
          success: false,
          message: "Pickup and dropoff locations are required",
        })
      }

      // Calculate distance using Haversine formula
      const R = 6371 // Radius of the Earth in kilometers
      const dLat = ((dropoffLocation.latitude - pickupLocation.latitude) * Math.PI) / 180
      const dLon = ((dropoffLocation.longitude - pickupLocation.longitude) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((pickupLocation.latitude * Math.PI) / 180) *
          Math.cos((dropoffLocation.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c // Distance in kilometers

      // Calculate fare
      const baseFare = 5.0
      const ratePerKm = 2.5
      const distanceFare = distance * ratePerKm
      const totalFare = baseFare + distanceFare

      console.log(`Calculated fare: Distance ${distance.toFixed(2)}km, Fare $${totalFare.toFixed(2)}`)

      res.json({
        success: true,
        distance: distance,
        fare: totalFare,
        breakdown: {
          baseFare: baseFare,
          distanceFare: distanceFare,
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
