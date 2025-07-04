const dummyStocks = [
  { name: 'TCS', symbol: 'TCS', type: 'stock', price: 4000, volume: 250000, priceHistory: [] },
  { name: 'Reliance', symbol: 'RELIANCE', type: 'stock', price: 3000, volume: 180000, priceHistory: [] },
  { name: 'Infosys', symbol: 'INFY', type: 'stock', price: 1800, volume: 320000, priceHistory: [] },
  { name: 'HDFC', symbol: 'HDFC', type: 'stock', price: 2500, volume: 150000, priceHistory: [] },
  { name: 'Tata Steel', symbol: 'TATASTEEL', type: 'stock', price: 1200, volume: 400000, priceHistory: [] }
];

const dummyMutualFunds = [
  { name: 'SBI Bluechip', symbol: 'SBIBLU', type: 'mutualFund', price: 500, volume: 75000, priceHistory: [] },
  { name: 'ICICI Equity', symbol: 'ICICIEQ', type: 'mutualFund', price: 600, volume: 90000, priceHistory: [] },
  { name: 'Axis MF', symbol: 'AXISMF', type: 'mutualFund', price: 450, volume: 65000, priceHistory: [] },
  { name: 'Kotak MF', symbol: 'KOTAKMF', type: 'mutualFund', price: 700, volume: 85000, priceHistory: [] }
];

module.exports = { dummyStocks, dummyMutualFunds };