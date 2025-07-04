const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const Asset = require('./models/Asset');
const User = require('./models/User');
const { dummyStocks, dummyMutualFunds } = require('./utils/DummyData');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api', assetRoutes);

// Global variable to track the last update time
let lastUpdateTime = new Date();

// Update the lastUpdateTime when updates actually happen
const updateLastUpdateTime = () => {
  lastUpdateTime = new Date();
};

// Initialize dummy data
const initializeAssets = async () => {
  const existingAssets = await Asset.find();
  if (existingAssets.length === 0) {
    const assets = [...dummyStocks, ...dummyMutualFunds];
    await Asset.insertMany(assets);
    console.log('🎯 Initial assets data created');
  }
};

// Update all users' portfolio profit/loss data
const updateAllUsersPortfolioData = async () => {
  try {
    console.log('🔄 Starting portfolio updates for all users...');
    const users = await User.find({}).populate('portfolio.assetId');
    let updatedUsersCount = 0;
    
    for (const user of users) {
      if (user.portfolio && user.portfolio.length > 0) {
        let hasChanges = false;
        
        // Filter out invalid portfolio items and recalculate
        const validPortfolio = user.portfolio.filter(item => item.assetId !== null);
        
        let totalInvested = 0;
        let currentValue = 0;
        
        validPortfolio.forEach(item => {
          if (item.assetId && item.assetId.price) {
            totalInvested += item.quantity * item.purchasePrice;
            currentValue += item.quantity * item.assetId.price;
          }
        });
        
        const profitLoss = currentValue - totalInvested;
        const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
        
        // Update user's calculated fields
        const previousProfitLoss = user.profitLoss || 0;
        user.totalInvested = parseFloat(totalInvested.toFixed(2));
        user.currentValue = parseFloat(currentValue.toFixed(2));
        user.profitLoss = parseFloat(profitLoss.toFixed(2));
        user.profitLossPercentage = parseFloat(profitLossPercentage.toFixed(2));
        user.portfolio = validPortfolio;
        user.lastUpdated = new Date();
        
        if (Math.abs(profitLoss - previousProfitLoss) > 0.01) {
          hasChanges = true;
        }
        
        if (hasChanges || user.isModified()) {
          await user.save();
          updatedUsersCount++;
          console.log(`💰 Updated ${user.email}: Total Invested: ₹${user.totalInvested}, Current Value: ₹${user.currentValue}, P&L: ₹${user.profitLoss} (${user.profitLossPercentage}%)`);
        }
      } else {
        // Update timestamp even for users with no portfolio
        user.lastUpdated = new Date();
        await user.save();
        console.log(`📊 ${user.email}: No portfolio items to update`);
      }
    }
    
    console.log(`✅ Updated portfolio data for ${updatedUsersCount} users with changes`);
  } catch (error) {
    console.error('❌ Error updating users portfolio data:', error);
  }
};

// Get next update time endpoint
app.get('/api/next-update', (req, res) => {
  const now = new Date();
  const nextUpdate = new Date(lastUpdateTime.getTime() + 10 * 60 * 1000); // 10 minutes from last update
  const secondsUntilUpdate = Math.max(0, Math.ceil((nextUpdate - now) / 1000));
  
  res.json({
    lastUpdate: lastUpdateTime,
    nextUpdate: nextUpdate,
    secondsUntilUpdate: secondsUntilUpdate
  });
});

// Update prices and user portfolios every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('🕐 Running 10-minute update cycle...');
  updateLastUpdateTime(); // Track when the update starts
  
  try {
    // 1. Update asset prices first
    const assets = await Asset.find();
    console.log(`📊 Updating prices for ${assets.length} assets`);
    
    for (const asset of assets) {
      // Different volatility for stocks vs mutual funds
      const volatility = asset.type === 'stock' ? 8 : 4; // Stocks more volatile
      const change = (Math.random() * volatility - volatility/2).toFixed(2); // Random change
      const volumeChange = (Math.random() * 0.4 - 0.2); // Volume can change by ±20%
      
      const newPrice = Math.max(asset.price * 0.3, parseFloat(asset.price) + parseFloat(change));
      const finalPrice = Math.min(asset.price * 3, newPrice); // Cap at 300% of original
      
      const previousPrice = asset.price;
      asset.price = parseFloat(finalPrice.toFixed(2));
      
      // Update volume with some randomness
      const baseVolume = asset.type === 'stock' ? 200000 : 75000;
      asset.volume = Math.floor(baseVolume * (1 + volumeChange)) + Math.floor(Math.random() * 50000);
      
      // Add to price history
      asset.priceHistory.push({ 
        price: asset.price, 
        volume: asset.volume, 
        timestamp: new Date() 
      });
      
      // Keep only last 2000 entries (about 2 weeks of 10-minute data)
      if (asset.priceHistory.length > 2000) {
        asset.priceHistory = asset.priceHistory.slice(-2000);
      }
      
      await asset.save();
      
      const changePercent = ((asset.price - previousPrice) / previousPrice * 100).toFixed(2);
      const trend = parseFloat(changePercent) > 0 ? '📈' : '📉';
      console.log(`${trend} ${asset.name} (${asset.type}): ₹${previousPrice} → ₹${asset.price} (${changePercent}%)`);
    }
    
    console.log('📈 All asset prices updated successfully');
    
    // 2. Update all users' portfolio data
    await updateAllUsersPortfolioData();
    
    console.log('🎉 Complete 10-minute update cycle finished');
  } catch (error) {
    console.error('❌ Error in 10-minute update cycle:', error);
  }
});

// Manual update endpoint for testing
app.get('/api/update-all-portfolios', async (req, res) => {
  try {
    await updateAllUsersPortfolioData();
    res.json({ message: 'All user portfolios updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolios' });
  }
});

// Initialize on startup
const startServer = async () => {
  await initializeAssets();
  console.log('🚀 Server starting up...');
  
  // Update the last update time to now since we're doing initial sync
  updateLastUpdateTime();
  
  // Run initial portfolio update
  setTimeout(async () => {
    await updateAllUsersPortfolioData();
    console.log('🎯 Initial portfolio sync completed');
  }, 5000); // Wait 5 seconds for everything to initialize
};

startServer();

app.listen(5001, () => console.log('🌟 Server running on port 5001'));