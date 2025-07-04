const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: false }, // Made optional for backward compatibility
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 150000 }, // Increased default balance for better trading
  portfolio: [{
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    quantity: Number,
    purchasePrice: Number
  }],
  // Calculated fields updated every 10 minutes
  totalInvested: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  profitLoss: { type: Number, default: 0 },
  profitLossPercentage: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);