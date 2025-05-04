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

    // Updated SQL query to properly join users and drivers tables
    // This ensures we get all the necessary driver information
    const [drivers] = await db.query(
      `SELECT  
        u.id, u.username, u.email, u.latitude, u.longitude,  
        d.id AS driver_id, d.user_id, d.driver_license, 
        d.vehicle_model, d.vehicle_color, d.vehicle_plate, d.vehicle_image,
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

    console.log("Found drivers:", drivers.length);
    if (drivers.length > 0) {
      console.log("Sample driver data:", drivers[0]);
    }

    // If no drivers found, return empty array but with success true
    if (drivers.length === 0) {
      return res.status(200).json({
        success: true,
        drivers: []
      });
    }

    // Add fare estimates to each driver
    const driversWithFares = drivers.map(driver => {
      // Calculate a fare based on distance (this is a simple example)
      const baseFare = 2.50;
      const perKmRate = 1.25;
      const fare = (baseFare + (driver.distance * perKmRate)).toFixed(2);
      
      return {
        ...driver,
        fare
      };
    });

    return res.status(200).json({
      success: true,
      drivers: driversWithFares,
    })
  } catch (error) {
    console.error("Find nearby drivers error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error finding nearby drivers",
    })
  }
},

// Add this function to rideController.js
createRide: async (req, res) => {
  try {
    const { 
      driverId, 
      pickup_latitude, 
      pickup_longitude, 
      dropoff_latitude, 
      dropoff_longitude, 
      fare, 
      payment_status = "pending",
      status = "requested" 
    } = req.body;

    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.session.user.id;

    // Start a transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Check if driver is still available
      const [driverStatus] = await connection.query(
        `SELECT d.available, u.id
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         WHERE u.id = ? AND d.available = 1 AND d.license_verified = 1`,
        [driverId],
      );

      if (driverStatus.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Driver is no longer available",
        });
      }

      // Create ride
      const [rideResult] = await connection.query(
        `INSERT INTO rides (
          user_id, driver_id, pickup_latitude, pickup_longitude,
          dropoff_latitude, dropoff_longitude, fare, payment_status, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          driverId,
          pickup_latitude,
          pickup_longitude,
          dropoff_latitude,
          dropoff_longitude,
          fare,
          payment_status,
          status
        ],
      );

      // Update driver availability if ride is confirmed
      if (status !== "cancelled") {
        await connection.query(
          `UPDATE drivers d
           JOIN users u ON d.user_id = u.id
           SET d.available = 0
           WHERE u.id = ?`,
          [driverId],
        );
      }

      await connection.commit();

      // Get the created ride
      const [rides] = await db.query(
        `SELECT r.*, 
          u_driver.username as driver_name, 
          d.vehicle_model, d.vehicle_color, d.vehicle_plate,
          u_rider.username as rider_name
        FROM rides r
        JOIN users u_driver ON r.driver_id = u_driver.id
        JOIN users u_rider ON r.user_id = u_rider.id
        JOIN drivers d ON u_driver.id = d.user_id
        WHERE r.id = ?`,
        [rideResult.insertId],
      );

      return res.status(201).json({
        success: true,
        message: "Ride created successfully",
        ride: rides[0],
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Create ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error creating ride",
    });
  }
},

// Update the getAllAvailableDrivers function to add random coordinates if needed
// Update the getAllAvailableDrivers function to properly join user and driver data

getAllAvailableDrivers: async (req, res) => {
  try {
    // Get user's location from session if available
    let userLatitude = null;
    let userLongitude = null;
    
    if (req.session && req.session.user) {
      const [userLocation] = await db.query(
        "SELECT latitude, longitude FROM users WHERE id = ?",
        [req.session.user.id]
      );
      
      if (userLocation.length > 0 && userLocation[0].latitude && userLocation[0].longitude) {
        userLatitude = userLocation[0].latitude;
        userLongitude = userLocation[0].longitude;
      }
    }
    
    // Get all drivers who are marked as available with proper join
    const [drivers] = await db.query(
      `SELECT 
        u.id, u.username, u.email, u.phone_number, u.latitude, u.longitude,
        d.id AS driver_id, d.user_id, d.driver_license, 
        d.vehicle_model, d.vehicle_color, d.vehicle_plate, d.vehicle_image
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.available = 1 AND d.license_verified = 1
       LIMIT 20`
    );
    
    console.log("Found available drivers:", drivers.length);
    if (drivers.length > 0) {
      console.log("Sample driver data:", drivers[0]);
    }
    
    // If no drivers found, return empty array
    if (drivers.length === 0) {
      return res.status(200).json({
        success: true,
        drivers: []
      });
    }
    
    // Process drivers to ensure they have coordinates
    const processedDrivers = drivers.map(driver => {
      // If driver has no coordinates but user does, generate random nearby coordinates
      if ((!driver.latitude || !driver.longitude) && userLatitude && userLongitude) {
        // Generate random offset between -0.01 and 0.01 (roughly 1km)
        const latOffset = (Math.random() * 0.02 - 0.01);
        const lngOffset = (Math.random() * 0.02 - 0.01);
        
        return {
          ...driver,
          latitude: parseFloat(userLatitude) + latOffset,
          longitude: parseFloat(userLongitude) + lngOffset,
          // Add a random distance between 0.5 and 3.5 km
          distance: (Math.random() * 3 + 0.5).toFixed(1)
        };
      }
      
      // If driver has coordinates, calculate distance from user if possible
      if (driver.latitude && driver.longitude && userLatitude && userLongitude) {
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (driver.latitude - userLatitude) * Math.PI / 180;
        const dLon = (driver.longitude - userLongitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(userLatitude * Math.PI / 180) * Math.cos(driver.latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km
        
        return {
          ...driver,
          distance: distance.toFixed(1)
        };
      }
      
      // If no coordinates available, just return driver with default distance
      return {
        ...driver,
        distance: "1.0" // Default distance
      };
    });
    
    // Add fare estimates to each driver
    const driversWithFares = processedDrivers.map(driver => {
      // Calculate a fare based on distance (this is a simple example)
      const baseFare = 2.50;
      const perKmRate = 1.25;
      const distance = parseFloat(driver.distance);
      const fare = (baseFare + (distance * perKmRate)).toFixed(2);
      
      return {
        ...driver,
        fare
      };
    });
    
    return res.status(200).json({
      success: true,
      drivers: driversWithFares
    });
  } catch (error) {
    console.error("Get all available drivers error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching available drivers"
    });
  }
},

  // Calculate fare for a ride
calculateFare: async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation } = req.body;

    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (dropoffLocation.latitude - pickupLocation.latitude) * Math.PI / 180;
    const dLon = (dropoffLocation.longitude - pickupLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickupLocation.latitude * Math.PI / 180) * Math.cos(dropoffLocation.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km

    // Calculate fare based on distance
    // Base fare + per km rate
    const baseFare = 2.50;
    const perKmRate = 1.25;
    const fare = baseFare + (distance * perKmRate);

    return res.status(200).json({
      success: true,
      distance: distance,
      fare: parseFloat(fare.toFixed(2)),
      currency: "USD",
      breakdown: {
        baseFare: baseFare,
        distanceFare: parseFloat((distance * perKmRate).toFixed(2))
      }
    });
  } catch (error) {
    console.error("Calculate fare error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error calculating fare",
    });
  }
},

// Get all available drivers
getAllAvailableDrivers: async (req, res) => {
  try {
    // Get all drivers who are marked as available
    const [drivers] = await db.query(
      `SELECT d.*, u.id, u.username, u.email, u.phone_number, u.latitude, u.longitude
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.available = 1 AND d.license_verified = 1
       LIMIT 10`
    );
    
    // If no drivers found, return empty array
    if (drivers.length === 0) {
      return res.status(200).json({
        success: true,
        drivers: []
      });
    }
    
    return res.status(200).json({
      success: true,
      drivers: drivers
    });
  } catch (error) {
    console.error("Get all available drivers error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching available drivers"
    });
  }
},

  // Request a ride
// Update the requestRide function in rideController.js

requestRide: async (req, res) => {
  try {
    const { driverId, pickupLocation, dropoffLocation, fare } = req.body

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
      // First determine if driverId is a user_id or a driver table id
      let driverQuery = `
        SELECT d.available, u.id, d.id AS driver_table_id
        FROM drivers d
        JOIN users u ON d.user_id = u.id
        WHERE `;
      
      let queryParams = [];
      
      // If driverId is numeric, it could be either a user_id or a driver table id
      if (!isNaN(driverId)) {
        driverQuery += `(u.id = ? OR d.id = ?) AND d.available = 1 AND d.license_verified = 1`;
        queryParams = [driverId, driverId];
      } else {
        // If driverId is not numeric, it's likely a string ID from a mock driver
        driverQuery += `d.available = 1 AND d.license_verified = 1 LIMIT 1`;
        queryParams = [];
      }
      
      const [driverStatus] = await connection.query(driverQuery, queryParams);

      if (driverStatus.length === 0) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: "Driver is no longer available",
        })
      }

      // Get the actual driver user ID
      const actualDriverId = driverStatus[0].id;

      // Create ride request
      const [rideResult] = await connection.query(
        `INSERT INTO rides (
          user_id, driver_id, pickup_latitude, pickup_longitude,
          dropoff_latitude, dropoff_longitude, fare, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', NOW())`,
        [
          userId,
          actualDriverId,
          pickupLocation.latitude,
          pickupLocation.longitude,
          dropoffLocation.latitude,
          dropoffLocation.longitude,
          fare || 0
        ],
      )

      // Update driver availability
      await connection.query(
        `UPDATE drivers d
         JOIN users u ON d.user_id = u.id
         SET d.available = 0
         WHERE u.id = ?`,
        [actualDriverId],
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
          u_driver.longitude as driver_longitude,
          u_rider.username as rider_name
        FROM rides r
        JOIN users u_driver ON r.driver_id = u_driver.id
        JOIN users u_rider ON r.user_id = u_rider.id
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

  // Update ride status (for drivers)
  updateRideStatus: async (req, res) => {
    try {
      const { rideId, status } = req.body;

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userId = req.session.user.id;

      // Verify this driver is assigned to this ride
      const [rides] = await db.query(
        "SELECT * FROM rides WHERE id = ? AND driver_id = ?",
        [rideId, userId]
      );

      if (rides.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this ride",
        });
      }

      // Valid status transitions
      const validStatuses = ['accepted', 'arrived', 'in_progress', 'completed', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      // Update ride status
      await db.query(
        "UPDATE rides SET status = ? WHERE id = ?",
        [status, rideId]
      );

      // If ride is completed, make driver available again
      if (status === 'completed' || status === 'cancelled') {
        await db.query(
          "UPDATE drivers SET available = 1 WHERE user_id = ?",
          [userId]
        );
      }

      return res.status(200).json({
        success: true,
        message: "Ride status updated successfully",
      });
    } catch (error) {
      console.error("Update ride status error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error updating ride status",
      });
    }
  },

  // Get ride history for a user
  getRideHistory: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userId = req.session.user.id;
      const { role } = req.session.user;
      const { limit = 10, offset = 0 } = req.query;

      let query;
      let params;

      if (role === 'driver') {
        // Get rides where user is the driver
        query = `
          SELECT r.*, 
            u.username as rider_name,
            DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i') as formatted_date
          FROM rides r
          JOIN users u ON r.user_id = u.id
          WHERE r.driver_id = ?
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?
        `;
        params = [userId, parseInt(limit), parseInt(offset)];
      } else {
        // Get rides where user is the rider
        query = `
          SELECT r.*, 
            u.username as driver_name,
            d.vehicle_model, d.vehicle_color, d.vehicle_plate,
            DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i') as formatted_date
          FROM rides r
          JOIN users u ON r.driver_id = u.id
          JOIN drivers d ON u.id = d.user_id
          WHERE r.user_id = ?
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?
        `;
        params = [userId, parseInt(limit), parseInt(offset)];
      }

      const [rides] = await db.query(query, params);

      return res.status(200).json({
        success: true,
        rides: rides,
      });
    } catch (error) {
      console.error("Get ride history error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error fetching ride history",
      });
    }
  }
}

module.exports = rideController