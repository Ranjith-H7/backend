const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: String,
  symbol: String,
  type: String, // 'stock' or 'mutualFund'
  price: Number,
  volume: { type: Number, default: 0 },
  priceHistory: [{ 
    price: Number, 
    volume: { type: Number, default: 0 },
    timestamp: Date 
  }]
});

module.exports = mongoose.model('Asset', assetSchema);