const authMiddleware = {
  // Check if user is authenticated
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  },
  
  // Check if user is an admin
  isAdmin: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.userType === 'admin') {
      return next();
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  },

  // Check if user is a driver
  isDriver: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.userType === 'driver') {
      return next();
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Driver access required' 
    });
  }
};

module.exports = authMiddleware;