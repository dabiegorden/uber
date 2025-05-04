const bcrypt = require('bcrypt');
const db = require("../config/database");

const authController = {
  // Register a new user
register: async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      phone_number, 
      // Driver-specific fields
      is_driver,
      driver_license,
      vehicle_model,
      vehicle_color,
      vehicle_plate,
      years_of_experience
    } = req.body;
    
    // Check if required fields are present
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide username, email, and password' 
      });
    }
    
    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }
    
    // If registering as a driver, validate additional fields
    if (is_driver) {
      if (!driver_license || !vehicle_model || !vehicle_color || !vehicle_plate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide all driver registration details' 
        });
      }
      
      // Check if driver license is already registered
      const [existingDrivers] = await db.query(
        'SELECT * FROM drivers WHERE driver_license = ?',
        [driver_license]
      );
      
      if (existingDrivers.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Driver license already registered' 
        });
      }
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Get vehicle image path if uploaded
    const vehicleImagePath = req.file ? `/uploads/vehicles/${req.file.filename}` : null;
    
    // Start a transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Insert new user
      const [userResult] = await connection.query(
        'INSERT INTO users (username, email, password, phone_number, role, is_driver) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, hashedPassword, phone_number || null, is_driver ? 'driver' : 'user', is_driver]
      );
      
      // If driver, insert into drivers table
      if (is_driver) {
        await connection.query(
          'INSERT INTO drivers (user_id, driver_license, vehicle_model, vehicle_color, vehicle_plate, years_of_experience, vehicle_image) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userResult.insertId, driver_license, vehicle_model, vehicle_color, vehicle_plate, years_of_experience || null, vehicleImagePath]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: userResult.insertId,
        userType: is_driver ? 'driver' : 'user'
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
},
  
  // User login
// Update controllers/authController.js - login function

login: async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if required fields are present
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }
    
    // Find user by email
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const user = users[0];
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Check if user is active
    if (user.is_active === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been deactivated' 
      });
    }
    
    // Set user session
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    // Set user_id for the session store
    req.session.user_id = user.id;
    
    // Determine the appropriate redirect route based on user role
    let redirectRoute = '/map'; // Default route for regular users
    if (user.role === 'admin') {
      redirectRoute = '/admin';
    } else if (user.role === 'driver') {
      redirectRoute = '/driver-dashboard';
    }
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        redirectRoute: redirectRoute
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
},
  
  // User logout
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error logging out' 
        });
      }
      
      res.clearCookie('connect.sid');
      return res.status(200).json({ 
        success: true, 
        message: 'Logged out successfully' 
      });
    });
  },
  
  // Get user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      
      const [users] = await db.query(
        'SELECT id, username, email, phone_number, profile_picture, role, created_at, latitude, longitude, last_location_update FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      return res.status(200).json({
        success: true,
        user: users[0]
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error fetching profile' 
      });
    }
  },
  
  // Update user location
  updateLocation: async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userId = req.session.user.id;
      
      // Update user location in database
      await db.query(
        'UPDATE users SET latitude = ?, longitude = ?, last_location_update = NOW() WHERE id = ?',
        [latitude, longitude, userId]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error) {
      console.error('Update location error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating location'
      });
    }
  },

  // Get users list for admin
  getUsersList: async (req, res) => {
    try {
      const [users] = await db.query(
        'SELECT id, username, email, phone_number, role, created_at FROM users WHERE role != "admin"'
      );
      
      return res.status(200).json({
        success: true,
        users: users
      });
    } catch (error) {
      console.error('Get users list error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error fetching users' 
      });
    }
  },
  
  // Update user status (active/inactive)
  updateUserStatus: async (req, res) => {
    try {
      const { userId, status } = req.body;
      
      await db.query(
        'UPDATE users SET is_active = ? WHERE id = ? AND role != "admin"',
        [status, userId]
      );
      
      return res.status(200).json({
        success: true,
        message: 'User status updated successfully'
      });
    } catch (error) {
      console.error('Update user status error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error updating user status' 
      });
    }
  },

  // Get driver profile
getDriverProfile: async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const [drivers] = await db.query(
      `SELECT d.*, u.username, u.email, u.phone_number 
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.user_id = ?`,
      [userId]
    );
    
    if (drivers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver profile not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      driver: drivers[0]
    });
  } catch (error) {
    console.error('Get driver profile error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error fetching driver profile' 
    });
  }
},

// Get list of drivers for admin
getDriversList: async (req, res) => {
  try {
    const [drivers] = await db.query(
      `SELECT d.*, u.username, u.email, u.phone_number 
       FROM drivers d
       JOIN users u ON d.user_id = u.id`
    );
    
    return res.status(200).json({
      success: true,
      drivers: drivers
    });
  } catch (error) {
    console.error('Get drivers list error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error fetching drivers' 
    });
  }
},

// Verify driver by admin
verifyDriver: async (req, res) => {
  try {
    const { driverId, isVerified } = req.body;
    
    await db.query(
      'UPDATE drivers SET license_verified = ? WHERE id = ?',
      [isVerified, driverId]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Driver verification status updated'
    });
  } catch (error) {
    console.error('Verify driver error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error verifying driver' 
    });
  }
}
};


module.exports = authController;