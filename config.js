require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_leave_system'
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || 5242880, // 5MB
    uploadPath: process.env.UPLOAD_PATH || 'uploads/profiles'
  }
};
