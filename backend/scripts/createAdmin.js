const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function createAdmin() {
  // Read admin credentials from environment variables or command line arguments
  const adminUsername = process.env.ADMIN_USERNAME
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminPhone = process.env.ADMIN_PHONE
  
  if (!adminUsername || !adminEmail || !adminPassword || !adminPhone) {
    console.error('Error: Admin username, email, phone number and password are required.');
    console.log('Usage: node createAdmin.js <username> <email> <password> <phone>');
    console.log('Or set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD, ADMIN_PHONE environment variables.');
    process.exit(1);
  }
  
  // Create database connection
  const connection = await db.getConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // Check if admin already exists
    const [existingAdmins] = await connection.query(
      'SELECT * FROM users WHERE role = "admin"'
    );
    
    if (existingAdmins.length > 0) {
      console.log('An admin user already exists. If you need to create another admin, use the application\'s admin interface.');
      process.exit(0);
    }
    
    // Hash the admin password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    // Insert admin user
    const [result] = await connection.query(
      'INSERT INTO users (username, email, password, phone_number, role) VALUES (?, ?, ?, ?, "admin")',
      [adminUsername, adminEmail, hashedPassword, adminPhone]
    );
    
    console.log(`Admin user created successfully with ID: ${result.insertId}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Use release() instead of end() for pooled connections
    await connection.release();
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });