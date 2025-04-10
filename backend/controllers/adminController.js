const db = require("../config/database");

const adminController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Get total rides
      const [ridesResult] = await db.query('SELECT COUNT(*) as total FROM rides');
      
      // Get active drivers
      const [driversResult] = await db.query(
        'SELECT COUNT(*) as total FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.license_verified = 1 AND u.is_active = 1'
      );
      
      // Get total users (excluding admins)
      const [usersResult] = await db.query(
        'SELECT COUNT(*) as total FROM users WHERE role != "admin"'
      );
      
      // Get total revenue
      const [revenueResult] = await db.query(
        'SELECT SUM(fare) as total FROM rides WHERE status = "completed" AND payment_status = "paid"'
      );

      return res.status(200).json({
        success: true,
        stats: {
          totalRides: ridesResult[0].total,
          activeDrivers: driversResult[0].total,
          totalUsers: usersResult[0].total,
          revenue: revenueResult[0].total || 0
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching dashboard statistics'
      });
    }
  },

  // Get recent rides
  getRecentRides: async (req, res) => {
    try {
      if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const [rides] = await db.query(
        `SELECT r.*, 
          u_rider.username as rider_name, 
          u_driver.username as driver_name
        FROM rides r
        JOIN users u_rider ON r.user_id = u_rider.id
        JOIN users u_driver ON r.driver_id = u_driver.id
        ORDER BY r.created_at DESC
        LIMIT 10`
      );

      return res.status(200).json({
        success: true,
        rides: rides
      });
    } catch (error) {
      console.error('Get recent rides error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching recent rides'
      });
    }
  },

  // Get all rides with pagination
  getAllRides: async (req, res) => {
    try {
      if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Get rides with pagination
      const [rides] = await db.query(
        `SELECT r.*, 
          u_rider.username as rider_name, 
          u_driver.username as driver_name
        FROM rides r
        JOIN users u_rider ON r.user_id = u_rider.id
        JOIN users u_driver ON r.driver_id = u_driver.id
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      // Get total count for pagination
      const [countResult] = await db.query('SELECT COUNT(*) as total FROM rides');

      return res.status(200).json({
        success: true,
        rides: rides,
        pagination: {
          total: countResult[0].total,
          page,
          limit,
          pages: Math.ceil(countResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Get all rides error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching rides'
      });
    }
  }
};

module.exports = adminController;