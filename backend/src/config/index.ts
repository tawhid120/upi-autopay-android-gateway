import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'payverify-ultra-secure-jwt-secret-key-2026',
  jwtExpiresIn: '7d',
  adminKey: process.env.ADMIN_KEY || 'superadmin-master-key-payverify-2026',
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '../../data/payverify.sqlite'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  checkoutBaseUrl: process.env.CHECKOUT_BASE_URL || 'http://localhost:5173',
  webhookMaxRetries: 5,
};
