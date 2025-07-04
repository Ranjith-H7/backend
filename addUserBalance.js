const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const addBalanceToUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    // Find all users and update their balance if it's too low
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      // If user has less than 50,000, add more balance
      if (user.balance < 50000) {
        const additionalBalance = 150000 - user.balance;
        user.balance = 150000;
        await user.save();
        console.log(`✅ Updated ${user.email} balance: added ₹${additionalBalance}, new balance: ₹${user.balance}`);
      } else {
        console.log(`✓ ${user.email} already has sufficient balance: ₹${user.balance}`);
      }
    }

    // If no users exist, create a demo user
    if (users.length === 0) {
      const demoUser = new User({
        email: 'demo@example.com',
        password: 'demo123', // In real app, this should be hashed
        username: 'demo',
        balance: 200000
      });
      await demoUser.save();
      console.log('✅ Created demo user with ₹200,000 balance');
    }

    console.log('🎉 Balance update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating balances:', error);
    process.exit(1);
  }
};

addBalanceToUsers();
