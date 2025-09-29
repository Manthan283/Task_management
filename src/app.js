import express from 'express';
import morgan from 'morgan';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { basicAuth } from './middleware/auth.js';

const app = express();

// Core middleware
app.use(express.json());
app.use(morgan('dev'));

// Public route: user registration
app.use('/users', userRoutes);

// Auth gate for everything else
app.use(basicAuth);

// Protected routes
app.use('/tasks', taskRoutes);

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Not found handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Normalize common Mongoose errors to client-friendly codes
    let status = err.status || 500;
    let message = err.message || 'Internal Server Error';
  
    if (err.name === 'ValidationError') {
      status = 400;
      message = 'Validation error';
    }
    if (err.name === 'CastError') {
      status = 400; // invalid ObjectId, etc.
      message = 'Invalid identifier';
    }
  
    if (process.env.NODE_ENV !== 'test') {
      console.error(err);
    }
    res.status(status).json({ message });
});

export default app;
