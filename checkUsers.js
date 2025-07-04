const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUsers = async () => {
  try {
    const timeout30Seconds = 30000; // 30 seconds in milliseconds
    
    // Set Mongoose-specific options
    mongoose.set('bufferCommands', false);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: timeout30Seconds,
      socketTimeoutMS: 0, // Keep connection alive
      connectTimeoutMS: timeout30Seconds,
      maxPoolSize: 10,
      retryWrites: true,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 0 // Keep connections alive indefinitely
    });
    console.log('MongoDB connected');

    const users = await User.find({}, { email: 1, balance: 1, totalInvested: 1, currentValue: 1, profitLoss: 1 });
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`📧 ${user.email} (ID: ${user._id})`);
      console.log(`   💰 Balance: ₹${user.balance}`);
      console.log(`   📊 Invested: ₹${user.totalInvested || 0}, Current: ₹${user.currentValue || 0}, P&L: ₹${user.profitLoss || 0}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUsers();
