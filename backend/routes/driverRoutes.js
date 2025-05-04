// Update routes/driverRoutes.js to handle file uploads

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Get driver earnings
router.get('/earnings', isAuthenticated, driverController.getEarnings);

// Get driver by ID
router.get('/:id', isAuthenticated, driverController.getDriverById);

// Update driver profile (including vehicle image)
router.put('/profile', isAuthenticated, (req, res, next) => {
  // Get the upload middleware from app.locals
  const upload = req.app.locals.upload;
  
  // Use single file upload for vehicle image
  upload.single('vehicleImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, driverController.updateDriverProfile);

// Update driver availability
router.post('/availability', isAuthenticated, driverController.updateAvailability);
router.get('/recent-rides', isAuthenticated, driverController.getRecentRides);

module.exports = router;