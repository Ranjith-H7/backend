const mongoose = require('mongoose');
const Asset = require('./models/Asset');
require('dotenv').config();

const populateHistoryData = async () => {
  try {
    const timeout230Days = 230 * 24 * 60 * 60 * 1000; // 230 days in milliseconds
    
    // Set Mongoose-specific options
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferMaxEntries', 0);
    
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

    const assets = await Asset.find();
    
    for (const asset of assets) {
      // Generate 24 hours of dummy historical data (every 10 minutes)
      const historyData = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * 10 * 60 * 1000)); // 10 minutes ago
        const priceVariation = (Math.random() * 20 - 10); // -10 to +10 variation
        const price = Math.max(100, asset.price + priceVariation);
        const volume = Math.floor(Math.random() * 1000000) + 50000;
        
        historyData.push({
          price: parseFloat(price.toFixed(2)),
          volume: volume,
          timestamp: timestamp
        });
      }
      
      asset.priceHistory = historyData;
      await asset.save();
      console.log(`Updated price history for ${asset.name}`);
    }
    
    console.log('Price history populated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error populating price history:', error);
    process.exit(1);
  }
};

populateHistoryData();
