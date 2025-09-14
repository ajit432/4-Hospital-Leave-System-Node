const mysql = require('mysql2/promise');
require('dotenv').config();

const runMigration = async () => {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hospital_leave_system',
      multipleStatements: true
    });

    console.log('🔄 Running migration: Add is_active field to leave_categories...');

    // Execute migration steps one by one
    console.log('Step 1: Adding is_active column...');
    await connection.execute(`
      ALTER TABLE leave_categories 
      ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 for active, 0 for inactive'
    `);

    console.log('Step 2: Updating existing records...');
    await connection.execute(`
      UPDATE leave_categories SET is_active = 1 WHERE is_active IS NULL
    `);

    console.log('Step 3: Adding indexes...');
    await connection.execute(`
      CREATE INDEX idx_leave_categories_is_active ON leave_categories(is_active)
    `);

    await connection.execute(`
      CREATE INDEX idx_leave_categories_status_name ON leave_categories(is_active, name)
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added is_active field to leave_categories table');
    console.log('🔍 Added indexes for better performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
