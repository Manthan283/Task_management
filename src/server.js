import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
