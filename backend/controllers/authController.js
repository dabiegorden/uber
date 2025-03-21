const bcrypt = require('bcrypt');
const db = require("../config/database");

const authController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { username, email, password, phone_number } = req.body;
      
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
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      const [result] = await db.query(
        'INSERT INTO users (username, email, password, phone_number, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, phone_number || null, 'user']
      );
      
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: result.insertId
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error during registration' 
      });
    }
  },
  
  // User login
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
      
      // Set user session
      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
      
      // Set user_id for the session store
      req.session.user_id = user.id;
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
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
        'SELECT id, username, email, phone_number, profile_picture, role, created_at FROM users WHERE id = ?',
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
  }
};

module.exports = authController;