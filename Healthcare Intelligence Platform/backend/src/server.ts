import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import authRouter from './modules/auth/auth.router';
import patientsRouter from './modules/patients/patients.router';
import emergencyRouter from './modules/emergency/emergency.router';
import laboratoryRouter from './modules/laboratory/laboratory.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import billingRouter from './modules/billing/billing.router';
import emrRouter from './modules/emr/emr.router';
import adminRouter from './modules/admin/admin.router';
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Global HTTP request logger
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Mount Rate Limiters
app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);

// Mount Modular Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/emergency', emergencyRouter);
app.use('/api/v1/laboratory', laboratoryRouter);
app.use('/api/v1/reports', dashboardRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/emr', emrRouter);
app.use('/api/v1/admin', adminRouter);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Initialize DB and start listening
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[HIP SERVER] Running on port ${PORT}`);
    console.log(`[HIP SERVER] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('[HIP SERVER] Critical database initialisation failed:', err);
  process.exit(1);
});
