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

// Enhanced CORS configuration for Vercel frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173',
    /\.vercel\.app$/,
    /\.railway\.app$/,
    /\.render\.com$/,
    'https://stockmarket-ql5uwv9qp-ranjith-hs-projects.vercel.app',
    /https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// MongoDB connection with reasonable timeout handling
const connectToDatabase = async () => {
  try {
    const timeout30Seconds = 30000; // 30 seconds in milliseconds
    
    // Set Mongoose-specific options
    mongoose.set('bufferCommands', false);
    
    // Basic connection options that work with most MongoDB setups
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: timeout30Seconds,
      connectTimeoutMS: timeout30Seconds,
      maxPoolSize: 10,
      retryWrites: true
    };

    // Add additional options for production
    if (process.env.NODE_ENV === 'production') {
      connectionOptions.socketTimeoutMS = 0; // Keep connection alive
      connectionOptions.heartbeatFrequencyMS = 10000;
      connectionOptions.maxIdleTimeMS = 0;
    }
    
    await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    console.log('🌟 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Give specific advice for common issues
    if (error.message.includes('IP')) {
      console.error('💡 Tip: Add 0.0.0.0/0 to MongoDB Atlas IP whitelist for Render deployment');
    }
    
    // Retry connection after 10 seconds
    console.log('🔄 Retrying connection in 10 seconds...');
    setTimeout(connectToDatabase, 10000);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('📦 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB');
});

// Connect to database
connectToDatabase();

app.use('/api/auth', authRoutes);
app.use('/api', assetRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const status = {
    server: 'running',
    database: dbStatus === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
  
  if (dbStatus === 1) {
    res.json(status);
  } else {
    res.status(503).json(status);
  }
});

// Debug endpoint for frontend testing
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    environment: process.env.NODE_ENV
  });
});

// CORS preflight handler
app.options('*', cors());

// Global variable to track the last update time
let lastUpdateTime = new Date();

// Update the lastUpdateTime when updates actually happen
const updateLastUpdateTime = () => {
  lastUpdateTime = new Date();
};

// Initialize dummy data with error handling
const initializeAssets = async () => {
  try {
    // Wait for MongoDB connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (mongoose.connection.readyState === 1) {
            resolve();
          } else {
            setTimeout(checkConnection, 1000);
          }
        };
        checkConnection();
        // Timeout after 30 seconds
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 30000);
      });
    }

    const existingAssets = await Asset.find().maxTimeMS(30000); // 30 second timeout
    if (existingAssets.length === 0) {
      const assets = [...dummyStocks, ...dummyMutualFunds];
      await Asset.insertMany(assets);
      console.log('🎯 Initial assets data created');
    }
  } catch (error) {
    console.error('❌ Error initializing assets:', error);
  }
};

// Update all users' portfolio profit/loss data
const updateAllUsersPortfolioData = async () => {
  try {
    console.log('🔄 Starting portfolio updates for all users...');
    
    // Check MongoDB connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ MongoDB not connected, skipping portfolio update');
      return;
    }

    const users = await User.find({}).populate('portfolio.assetId').maxTimeMS(30000); // 30 second timeout
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
  try {
    console.log('🚀 Server starting up...');
    
    // Wait for database connection first
    await new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
      // Timeout after 30 seconds
      setTimeout(() => reject(new Error('Database connection timeout on startup')), 30000);
    });
    
    await initializeAssets();
    console.log('✅ Assets initialized successfully');
    
    // Update the last update time to now since we're doing initial sync
    updateLastUpdateTime();
    
    // Run initial portfolio update after a delay
    setTimeout(async () => {
      try {
        await updateAllUsersPortfolioData();
        console.log('🎯 Initial portfolio sync completed');
      } catch (error) {
        console.error('❌ Initial portfolio sync failed:', error);
      }
    }, 5000); // Wait 5 seconds for everything to initialize
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.log('🔄 Server will continue running, but some features may be limited');
  }
};

startServer();

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`🌟 Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    mongoose.connection.close(false, () => {
      console.log('📡 MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    mongoose.connection.close(false, () => {
      console.log('📡 MongoDB connection closed');
      process.exit(0);
    });
  });
});