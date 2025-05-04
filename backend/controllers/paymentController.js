// Update controllers/paymentController.js

const dotenv = require('dotenv');
dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');

const paymentController = {
  // Create a payment intent for a ride
  createPaymentIntent: async (req, res) => {
    try {
      const { rideId, amount } = req.body;

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.session.user.id;

      // Verify the ride belongs to this user
      const [rides] = await db.query(
        'SELECT * FROM rides WHERE id = ? AND user_id = ?',
        [rideId, userId]
      );

      if (rides.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found or not authorized'
        });
      }

      // Create a payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          rideId: rideId,
          userId: userId
        }
      });

      // Update ride with payment intent ID
      await db.query(
        'UPDATE rides SET payment_intent_id = ? WHERE id = ?',
        [paymentIntent.id, rideId]
      );

      return res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error('Payment intent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error creating payment'
      });
    }
  },

  // Confirm payment was completed
  confirmPayment: async (req, res) => {
    try {
      const { rideId, paymentIntentId } = req.body;

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify the payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: 'Payment has not been completed'
        });
      }

      // Get ride details to record driver earnings
      const [rides] = await db.query(
        'SELECT * FROM rides WHERE id = ? AND payment_intent_id = ?',
        [rideId, paymentIntentId]
      );

      if (rides.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }

      const ride = rides[0];

      // Start a transaction
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Update ride status to paid
        await connection.query(
          'UPDATE rides SET payment_status = "paid", status = "completed" WHERE id = ? AND payment_intent_id = ?',
          [rideId, paymentIntentId]
        );

        // Record driver earnings
        await connection.query(
          'INSERT INTO driver_earnings (driver_id, ride_id, amount) VALUES (?, ?, ?)',
          [ride.driver_id, rideId, ride.fare]
        );

        // Make driver available again
        await connection.query(
          'UPDATE drivers SET available = 1 WHERE user_id = ?',
          [ride.driver_id]
        );

        await connection.commit();

        return res.status(200).json({
          success: true,
          message: 'Payment confirmed successfully'
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error confirming payment'
      });
    }
  },

  // Get payment methods for a user
  getPaymentMethods: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.session.user.id;

      // Get customer ID from database
      const [users] = await db.query(
        'SELECT stripe_customer_id FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0 || !users[0].stripe_customer_id) {
        return res.status(200).json({
          success: true,
          paymentMethods: []
        });
      }

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: users[0].stripe_customer_id,
        type: 'card'
      });

      return res.status(200).json({
        success: true,
        paymentMethods: paymentMethods.data
      });
    } catch (error) {
      console.error('Get payment methods error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching payment methods'
      });
    }
  },

  // Add a payment method for a user
  addPaymentMethod: async (req, res) => {
    try {
      const { paymentMethodId } = req.body;

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.session.user.id;

      // Get or create customer in Stripe
      let customerId;
      const [users] = await db.query(
        'SELECT stripe_customer_id FROM users WHERE id = ?',
        [userId]
      );

      if (users.length > 0 && users[0].stripe_customer_id) {
        customerId = users[0].stripe_customer_id;
      } else {
        // Get user details to create customer
        const [userDetails] = await db.query(
          'SELECT email, username FROM users WHERE id = ?',
          [userId]
        );

        // Create customer in Stripe
        const customer = await stripe.customers.create({
          email: userDetails[0].email,
          name: userDetails[0].username
        });

        customerId = customer.id;

        // Save customer ID to database
        await db.query(
          'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
          [customerId, userId]
        );
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      return res.status(200).json({
        success: true,
        message: 'Payment method added successfully'
      });
    } catch (error) {
      console.error('Add payment method error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error adding payment method'
      });
    }
  }
};

module.exports = paymentController;