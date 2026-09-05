import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';


import fulfillmentRoutes from './routes/fulfillment.routes.js';

const app = express();

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`[RESPONSE] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  next();
});

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Public health check route
app.get('/', (req, res) => {
  res.json({ message: "AssetFlow API is working (Sequelize MVC)!", status: "healthy" });
});

// API Routes
app.use('/api/fulfillment', fulfillmentRoutes);

// Sync database on startup
export const syncDatabase = async () => {
  try {
    console.log('Syncing Sequelize models with MySQL Database...');
    await sequelize.sync();
    console.log('Sequelize database models synchronized successfully!');
  } catch (err) {
    console.error('Failed to sync Sequelize database models:', err);
    throw err;
  }
};


// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error. Please contact support.' });
});

export default app;