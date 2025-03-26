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
    if (req.session && req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
};

module.exports = authMiddleware;