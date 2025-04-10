const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/database');
const sessionConfig = require('./config/session');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rideRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Add this line
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const authController = require('./controllers/authController');
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN, 
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(sessionConfig(db));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes); // Add this line

// Update user location
app.post('/api/update-location', (req, res) => {
  authController.updateLocation(req, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

module.exports = app;