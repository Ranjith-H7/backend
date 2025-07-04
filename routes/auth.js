const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const user = new User({ 
      username: username || email.split('@')[0], // Use email prefix if no username provided
      email, 
      password 
    });
    await user.save();
    res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) return res.status(400).json({ error: 'Invalid credentials' });
    res.json({ 
      message: 'Login successful', 
      userId: user._id, 
      username: user.username || email.split('@')[0], 
      email: user.email 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;