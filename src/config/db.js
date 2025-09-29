import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/task_api';
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      dbName: uri.split('/').pop(),
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}
