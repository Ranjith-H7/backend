const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const cleanupPortfolios = async () => {
  try {
    const timeout230Days = 230 * 24 * 60 * 60 * 1000; // 230 days in milliseconds
    
    // Set Mongoose-specific options
    mongoose.set('bufferCommands', false);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: timeout230Days,
      socketTimeoutMS: timeout230Days,
      connectTimeoutMS: timeout230Days,
      maxPoolSize: 10,
      retryWrites: true,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: timeout230Days
    });
    console.log('MongoDB connected');

    // Find all users and clean their portfolios
    const users = await User.find({});
    
    for (const user of users) {
      // Filter out portfolio items with null or undefined assetId
      const cleanPortfolio = user.portfolio.filter(item => 
        item.assetId !== null && item.assetId !== undefined
      );
      
      if (cleanPortfolio.length !== user.portfolio.length) {
        user.portfolio = cleanPortfolio;
        await user.save();
        console.log(`Cleaned portfolio for user: ${user.email}`);
      }
    }
    
    console.log('Portfolio cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning portfolios:', error);
    process.exit(1);
  }
};

cleanupPortfolios();
