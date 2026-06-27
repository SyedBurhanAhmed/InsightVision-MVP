const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insightvision';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected:', uri);
}

module.exports = { connectDb };
