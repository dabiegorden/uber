const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Create a payment intent
router.post('/create-payment-intent', isAuthenticated, paymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm-payment', isAuthenticated, paymentController.confirmPayment);

// Get payment methods
router.get('/payment-methods', isAuthenticated, paymentController.getPaymentMethods);

// Add payment method
router.post('/add-payment-method', isAuthenticated, paymentController.addPaymentMethod);

module.exports = router;