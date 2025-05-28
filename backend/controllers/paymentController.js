const dotenv = require("dotenv")
dotenv.config()

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const db = require("../config/database")

// Demo mode flag - set to true for development/testing
const DEMO_MODE = process.env.NODE_ENV !== "production" || !process.env.STRIPE_SECRET_KEY

const paymentController = {
  // Create a payment intent for a ride
  createPaymentIntent: async (req, res) => {
    try {
      const { rideId, amount } = req.body

      console.log("Creating payment intent for ride:", rideId, "amount:", amount, "demo mode:", DEMO_MODE)

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      const userId = req.session.user.id

      // Verify the ride belongs to this user
      const [rides] = await db.query("SELECT * FROM rides WHERE id = ? AND user_id = ?", [rideId, userId])

      if (rides.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Ride not found or not authorized",
        })
      }

      let paymentIntent

      if (DEMO_MODE) {
        // Demo mode - create mock payment intent
        console.log("Demo mode: Creating mock payment intent")
        paymentIntent = {
          id: `pi_demo_${Date.now()}_${rideId}`,
          client_secret: `pi_demo_${Date.now()}_${rideId}_secret_demo`,
          amount: Math.round(amount * 100),
          currency: "usd",
          status: "requires_payment_method",
        }
      } else {
        // Production mode - create real Stripe payment intent
        console.log("Production mode: Creating real Stripe payment intent")
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: "usd",
          metadata: {
            rideId: rideId,
            userId: userId,
          },
        })
      }

      // Update ride with payment intent ID
      await db.query("UPDATE rides SET payment_intent_id = ? WHERE id = ?", [paymentIntent.id, rideId])

      console.log("Payment intent created successfully:", paymentIntent.id)

      return res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        demoMode: DEMO_MODE,
      })
    } catch (error) {
      console.error("Payment intent error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error creating payment",
      })
    }
  },

  // Confirm payment was completed
  confirmPayment: async (req, res) => {
    try {
      const { rideId, paymentIntentId } = req.body

      console.log("Confirming payment for ride:", rideId, "payment intent:", paymentIntentId, "demo mode:", DEMO_MODE)

      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      let paymentSucceeded = false

      if (DEMO_MODE) {
        // Demo mode - simulate successful payment
        console.log("Demo mode: Simulating successful payment verification")
        paymentSucceeded = true
      } else {
        // Production mode - verify with Stripe
        console.log("Production mode: Verifying payment with Stripe")
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          paymentSucceeded = paymentIntent.status === "succeeded"
          console.log("Stripe payment status:", paymentIntent.status)
        } catch (stripeError) {
          console.error("Stripe verification error:", stripeError)
          return res.status(400).json({
            success: false,
            message: "Failed to verify payment with Stripe",
          })
        }
      }

      if (!paymentSucceeded) {
        return res.status(400).json({
          success: false,
          message: "Payment has not been completed",
        })
      }

      // Get ride details
      const [rides] = await db.query("SELECT * FROM rides WHERE id = ? AND payment_intent_id = ?", [
        rideId,
        paymentIntentId,
      ])

      if (rides.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Ride not found",
        })
      }

      const ride = rides[0]
      console.log("Processing payment for ride:", ride.id, "fare:", ride.fare)

      // Start a transaction
      const connection = await db.getConnection()
      try {
        await connection.beginTransaction()

        // Update ride status to paid
        await connection.query(
          'UPDATE rides SET payment_status = "paid", status = "completed", completed_at = NOW() WHERE id = ? AND payment_intent_id = ?',
          [rideId, paymentIntentId],
        )

        // Create payments table if it doesn't exist
        await connection.query(`
          CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ride_id INT NOT NULL,
            user_id INT NOT NULL,
            driver_id INT NOT NULL,
            payment_intent_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) NOT NULL,
            driver_earnings DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ride_id) REFERENCES rides(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (driver_id) REFERENCES drivers(id)
          )
        `)

        // Record payment
        await connection.query(
          `INSERT INTO payments (ride_id, user_id, driver_id, payment_intent_id, amount, status, driver_earnings) 
           VALUES (?, ?, ?, ?, ?, 'succeeded', ?)`,
          [rideId, ride.user_id, ride.driver_id, paymentIntentId, ride.fare, ride.fare * 0.8], // 80% to driver
        )

        // Create driver_earnings table if it doesn't exist
        await connection.query(`
          CREATE TABLE IF NOT EXISTS driver_earnings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            driver_id INT NOT NULL,
            ride_id INT NOT NULL,
            payment_id INT NOT NULL,
            gross_amount DECIMAL(10, 2) NOT NULL,
            platform_fee DECIMAL(10, 2) NOT NULL,
            net_earnings DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES drivers(id),
            FOREIGN KEY (ride_id) REFERENCES rides(id)
          )
        `)

        // Get the payment ID for driver earnings
        const [paymentResult] = await connection.query("SELECT LAST_INSERT_ID() as payment_id")
        const paymentId = paymentResult[0].payment_id

        // Record driver earnings
        await connection.query(
          "INSERT INTO driver_earnings (driver_id, ride_id, payment_id, gross_amount, platform_fee, net_earnings) VALUES (?, ?, ?, ?, ?, ?)",
          [ride.driver_id, rideId, paymentId, ride.fare, ride.fare * 0.2, ride.fare * 0.8],
        )

        // Make driver available again
        await connection.query("UPDATE drivers SET available = 1 WHERE id = ?", [ride.driver_id])

        await connection.commit()

        console.log("Payment confirmed and processed successfully")

        return res.status(200).json({
          success: true,
          message: "Payment confirmed successfully",
          demoMode: DEMO_MODE,
          ride: {
            id: rideId,
            status: "completed",
            paymentStatus: "paid",
          },
        })
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error("Payment confirmation error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error confirming payment",
      })
    }
  },

  // Get payment methods for a user
  getPaymentMethods: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      if (DEMO_MODE) {
        // Demo mode - return mock payment methods
        return res.status(200).json({
          success: true,
          paymentMethods: [],
          demoMode: true,
        })
      }

      const userId = req.session.user.id
      const userType = req.session.user.userType

      // Get customer ID from appropriate table
      const table = userType === "driver" ? "drivers" : "users"
      const [users] = await db.query(`SELECT stripe_customer_id FROM ${table} WHERE id = ?`, [userId])

      if (users.length === 0 || !users[0].stripe_customer_id) {
        return res.status(200).json({
          success: true,
          paymentMethods: [],
        })
      }

      // Get payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: users[0].stripe_customer_id,
        type: "card",
      })

      return res.status(200).json({
        success: true,
        paymentMethods: paymentMethods.data,
      })
    } catch (error) {
      console.error("Get payment methods error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error fetching payment methods",
      })
    }
  },

  // Add a payment method for a user
  addPaymentMethod: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        })
      }

      if (DEMO_MODE) {
        // Demo mode - simulate adding payment method
        return res.status(200).json({
          success: true,
          message: "Payment method added successfully (demo mode)",
          demoMode: true,
        })
      }

      const { paymentMethodId } = req.body
      const userId = req.session.user.id
      const userType = req.session.user.userType

      // Get or create customer in Stripe
      let customerId
      const table = userType === "driver" ? "drivers" : "users"
      const [users] = await db.query(`SELECT stripe_customer_id, email, username FROM ${table} WHERE id = ?`, [userId])

      if (users.length > 0 && users[0].stripe_customer_id) {
        customerId = users[0].stripe_customer_id
      } else {
        // Create customer in Stripe
        const customer = await stripe.customers.create({
          email: users[0].email,
          name: users[0].username,
        })

        customerId = customer.id

        // Save customer ID to database
        await db.query(`UPDATE ${table} SET stripe_customer_id = ? WHERE id = ?`, [customerId, userId])
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      })

      return res.status(200).json({
        success: true,
        message: "Payment method added successfully",
      })
    } catch (error) {
      console.error("Add payment method error:", error)
      return res.status(500).json({
        success: false,
        message: "Server error adding payment method",
      })
    }
  },
}

module.exports = paymentController
