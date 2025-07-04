const express = require('express');
const User = require('../models/User');
const Asset = require('../models/Asset');
const Transaction = require('../models/Transaction');
const router = express.Router();

router.get('/assets', async (req, res) => {
  const assets = await Asset.find();
  res.json(assets);
});

router.get('/portfolio/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('portfolio.assetId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Filter out portfolio items with null assetId and calculate profit/loss
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
    
    // Update user portfolio to only include valid items
    user.portfolio = validPortfolio;
    
    res.json({
      ...user.toObject(),
      portfolio: validPortfolio,
      totalInvested,
      currentValue,
      profitLoss,
      profitLossPercentage
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/buy', async (req, res) => {
  try {
    const { userId, assetId, quantity } = req.body;
    
    // Validate input
    if (!userId || !assetId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    const asset = await Asset.findById(assetId);
    const user = await User.findById(userId);

    if (!asset || !user) {
      return res.status(404).json({ error: 'Asset or user not found' });
    }

    const totalCost = parseFloat((quantity * asset.price).toFixed(2));
    if (user.balance < totalCost) {
      return res.status(400).json({ 
        error: `Insufficient balance. Required: ₹${totalCost}, Available: ₹${user.balance}` 
      });
    }

    // Update user balance
    user.balance = parseFloat((user.balance - totalCost).toFixed(2));
    
    // Update portfolio
    const portfolioItem = user.portfolio.find(item => item.assetId.toString() === assetId);
    if (portfolioItem) {
      const totalQuantity = portfolioItem.quantity + quantity;
      const totalValue = (portfolioItem.purchasePrice * portfolioItem.quantity) + totalCost;
      portfolioItem.quantity = totalQuantity;
      portfolioItem.purchasePrice = parseFloat((totalValue / totalQuantity).toFixed(2));
    } else {
      user.portfolio.push({ 
        assetId, 
        quantity, 
        purchasePrice: parseFloat(asset.price.toFixed(2))
      });
    }

    // Create transaction record
    const transaction = new Transaction({ 
      userId, 
      assetId, 
      type: 'buy', 
      quantity, 
      price: parseFloat(asset.price.toFixed(2)),
      timestamp: new Date()
    });
    
    await transaction.save();
    await user.save();
    
    console.log(`💰 ${user.email} bought ${quantity} ${asset.type === 'stock' ? 'shares' : 'units'} of ${asset.name} for ₹${totalCost}`);
    
    res.json({ 
      message: `Successfully bought ${quantity} ${asset.type === 'stock' ? 'shares' : 'units'} of ${asset.name}`,
      balance: user.balance,
      totalCost: totalCost,
      assetType: asset.type
    });
  } catch (error) {
    console.error('Buy error:', error);
    res.status(500).json({ error: 'Server error during purchase' });
  }
});

router.post('/sell', async (req, res) => {
  try {
    const { userId, assetId, quantity } = req.body;
    
    // Validate input
    if (!userId || !assetId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    const asset = await Asset.findById(assetId);
    const user = await User.findById(userId);

    if (!asset || !user) {
      return res.status(404).json({ error: 'Asset or user not found' });
    }

    const portfolioItem = user.portfolio.find(item => item.assetId.toString() === assetId);
    if (!portfolioItem || portfolioItem.quantity < quantity) {
      return res.status(400).json({ 
        error: `Insufficient quantity. Available: ${portfolioItem ? portfolioItem.quantity : 0}, Requested: ${quantity}` 
      });
    }

    const totalValue = parseFloat((quantity * asset.price).toFixed(2));
    const purchaseCost = parseFloat((quantity * portfolioItem.purchasePrice).toFixed(2));
    const profitLoss = totalValue - purchaseCost;
    
    // Update user balance
    user.balance = parseFloat((user.balance + totalValue).toFixed(2));
    portfolioItem.quantity -= quantity;
    
    // Remove from portfolio if quantity becomes 0
    if (portfolioItem.quantity === 0) {
      user.portfolio = user.portfolio.filter(item => item.assetId.toString() !== assetId);
    }

    // Create transaction record
    const transaction = new Transaction({ 
      userId, 
      assetId, 
      type: 'sell', 
      quantity, 
      price: parseFloat(asset.price.toFixed(2)),
      timestamp: new Date()
    });
    
    await transaction.save();
    await user.save();
    
    const profitLossText = profitLoss >= 0 ? `profit of ₹${profitLoss.toFixed(2)}` : `loss of ₹${Math.abs(profitLoss).toFixed(2)}`;
    console.log(`💸 ${user.email} sold ${quantity} ${asset.type === 'stock' ? 'shares' : 'units'} of ${asset.name} for ₹${totalValue} (${profitLossText})`);
    
    res.json({ 
      message: `Successfully sold ${quantity} ${asset.type === 'stock' ? 'shares' : 'units'} of ${asset.name}`,
      balance: user.balance,
      totalValue: totalValue,
      profitLoss: profitLoss,
      assetType: asset.type
    });
  } catch (error) {
    console.error('Sell error:', error);
    res.status(500).json({ error: 'Server error during sale' });
  }
});

router.get('/transactions/:userId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.userId })
      .populate('assetId')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/graphdata/:assetId', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Return all price history data
    const priceHistory = asset.priceHistory || [];
    
    // Sort by timestamp to ensure proper order
    priceHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json(priceHistory);
  } catch (error) {
    console.error('Graph data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/add-balance', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    // Validate input
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    // Maximum addition limit for security
    if (amount > 1000000) {
      return res.status(400).json({ error: 'Maximum addition limit is ₹10,00,000' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add amount to balance
    const amountToAdd = parseFloat(amount.toFixed(2));
    user.balance = parseFloat((user.balance + amountToAdd).toFixed(2));
    await user.save();
    
    console.log(`💳 ${user.email} added ₹${amountToAdd} to balance. New balance: ₹${user.balance}`);
    
    res.json({ 
      message: `Successfully added ₹${amountToAdd} to your account`,
      balance: user.balance,
      amountAdded: amountToAdd
    });
  } catch (error) {
    console.error('Add balance error:', error);
    res.status(500).json({ error: 'Server error while adding balance' });
  }
});

module.exports = router;