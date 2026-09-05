import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import negotiationRoutes from './controllers/negotiation.controller.js';
import dealHealthRoutes from './controllers/dealHealth.controller.js';
import reportingRoutes from './controllers/reporting.controller.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import governanceRoutes from './routes/governance.routes.js';
import quotationRoutes from './routes/quotation.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import customerRoutes from './routes/customer.routes.js';

import fulfillmentRoutes from './routes/fulfillment.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';

const app = express();

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`[RESPONSE] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  next();
});

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean),
  credentials: true
}));
app.use(express.json());


// API Routes
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/deal-health', dealHealthRoutes);
app.use('/api/reports', reportingRoutes);

// Public health check route
app.get('/', (req, res) => {
  res.json({ message: "DealFlow360 API is running!", status: "healthy" });
});

// API Routes
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);

// Sync database on startup
export const syncDatabase = async () => {
  try {
    console.log('Connecting to MySQL Database...');
    await sequelize.authenticate();
    // Temporarily skipping .sync() because Aiven sometimes throws ER_NO_SUCH_TABLE on SHOW INDEX
    // during boot if tables have circular references, even when they exist.
    console.log('Database connected successfully!');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    throw err;
  }
};


// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error. Please contact support.' });
});

export default app;