const mongoose = require('mongoose');
const Asset = require('./models/Asset');
require('dotenv').config();

const generateComprehensiveHistoryData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    const assets = await Asset.find();
    
    for (const asset of assets) {
      console.log(`Generating comprehensive history for ${asset.name}`);
      
      const historyData = [];
      const now = new Date();
      
      // Generate 1 year of data (365 days, 4 data points per day = 1460 entries)
      const totalDataPoints = 1460; // 365 days * 4 times per day
      const intervalMinutes = 360; // 6 hours between data points
      
      let currentPrice = asset.price;
      
      for (let i = totalDataPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000));
        
        // Create realistic price movements with trends
        const dayOfYear = Math.floor(i / 4);
        const timeOfDay = i % 4;
        
        // Add seasonal trends
        let trendFactor = 1;
        if (dayOfYear < 90) trendFactor = 0.95; // Q1 - slight decline
        else if (dayOfYear < 180) trendFactor = 1.05; // Q2 - growth
        else if (dayOfYear < 270) trendFactor = 1.02; // Q3 - moderate growth
        else trendFactor = 0.98; // Q4 - slight decline
        
        // Add daily volatility
        const dailyVariation = (Math.random() - 0.5) * 0.1; // ±5% daily variation
        const timeVariation = (Math.random() - 0.5) * 0.02; // ±1% intraday variation
        
        // Calculate price change
        const priceChange = currentPrice * (trendFactor - 1) * 0.001 + 
                           currentPrice * dailyVariation * 0.1 + 
                           currentPrice * timeVariation;
        
        currentPrice = Math.max(asset.price * 0.5, currentPrice + priceChange); // Don't go below 50% of original
        currentPrice = Math.min(asset.price * 2, currentPrice); // Don't go above 200% of original
        
        // Generate volume based on price movement and time
        const baseVolume = asset.volume || 100000;
        const volatilityVolume = Math.abs(priceChange / currentPrice) * baseVolume * 5;
        const timeVolume = timeOfDay === 1 || timeOfDay === 3 ? baseVolume * 1.5 : baseVolume; // Higher volume during "market hours"
        const volume = Math.floor(timeVolume + volatilityVolume + (Math.random() * baseVolume * 0.5));
        
        historyData.push({
          price: parseFloat(currentPrice.toFixed(2)),
          volume: volume,
          timestamp: timestamp
        });
      }
      
      // Sort by timestamp (oldest first)
      historyData.sort((a, b) => a.timestamp - b.timestamp);
      
      asset.priceHistory = historyData;
      asset.price = historyData[historyData.length - 1].price; // Update current price to latest
      await asset.save();
      console.log(`✅ Updated ${asset.name} with ${historyData.length} data points`);
    }
    
    console.log('🎉 Comprehensive price history generated successfully!');
    console.log('📊 Data includes:');
    console.log('   - 1 year of historical data');
    console.log('   - 4 data points per day (every 6 hours)');
    console.log('   - Realistic price trends and volatility');
    console.log('   - Volume correlation with price movements');
    console.log('   - Seasonal market patterns');
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating comprehensive price history:', error);
    process.exit(1);
  }
};

generateComprehensiveHistoryData();
