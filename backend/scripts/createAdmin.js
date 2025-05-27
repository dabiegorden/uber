const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function createAdmin() {
  // Read admin credentials from environment variables
  const adminUsername = process.env.ADMIN_USERNAME
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminPhone = process.env.ADMIN_PHONE
  
  if (!adminUsername || !adminEmail || !adminPassword || !adminPhone) {
    console.error('Error: Admin username, email, phone number and password are required.');
    console.log('Usage: Set ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_PHONE environment variables.');
    process.exit(1);
  }
  
  try {
    // Check if admin already exists in the admins table
    const [existingAdmins] = await db.query(
      'SELECT * FROM admins WHERE email = ?',
      [adminEmail]
    );
    
    if (existingAdmins.length > 0) {
      console.log('An admin user already exists with this email. If you need to create another admin, use a different email.');
      process.exit(0);
    }
    
    // Hash the admin password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    // Insert admin user into admins table
    const [result] = await db.query(
      'INSERT INTO admins (username, email, password, phone_number) VALUES (?, ?, ?, ?)',
      [adminUsername, adminEmail, hashedPassword, adminPhone]
    );
    
    console.log(`✅ Admin user created successfully with ID: ${result.insertId}`);
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Username: ${adminUsername}`);
    console.log(`📱 Phone: ${adminPhone}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdmin()
  .then(() => {
    console.log('🎉 Admin creation completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Unhandled error:', err);
    process.exit(1);
  });