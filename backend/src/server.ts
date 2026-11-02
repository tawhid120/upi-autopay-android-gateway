import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initDatabase } from './database/db';

// Route Handlers
import authRoutes from './modules/auth/auth.routes';
import deviceRoutes from './modules/devices/device.routes';
import mfsRoutes from './modules/devices/mfs.routes';
import paymentRoutes from './modules/payments/payment.routes';
import checkoutRoutes from './modules/checkout/checkout.routes';
import webhookRoutes from './modules/webhooks/webhook.routes';
import adminRoutes from './modules/admin/admin.routes';
import paymentLinkRoutes from './modules/payment_links/payment_link.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import businessRoutes from './modules/business/business.routes';
import { startWebhookRetryWorker } from './modules/webhooks/webhook.service';
import { startDeviceStatusWorker } from './modules/devices/device.routes';
import { startSubscriptionLifecycleWorker } from './modules/subscriptions/subscription.service';

const app = express();

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Initialize Database & Seeds
initDatabase();

// Start background workers
startWebhookRetryWorker();
startDeviceStatusWorker();
startSubscriptionLifecycleWorker();

// API Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Payviro Enterprise Core',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Module Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/mfs', mfsRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payment-links', paymentLinkRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/business', businessRoutes);

// Serve Frontend Static Build & SPA fallback
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Payviro BD v2 Production Core running on port ${config.port}`);
  console.log(`🌐 Health check: http://localhost:${config.port}/health`);
  console.log(`📡 API Base:     http://localhost:${config.port}/api/v1`);
  console.log(`====================================================`);
});

export default app;
