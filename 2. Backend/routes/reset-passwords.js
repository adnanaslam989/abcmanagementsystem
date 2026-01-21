const express = require('express');
const dbModule = require('../config/db');
const router = express.Router();
const db = dbModule.db;

// Temporary route to reset passwords to plain text (for testing only)
router.post('/reset-to-plain', async (req, res) => {
  try {
    console.log('⚠️ WARNING: Resetting password to plain text - FOR TESTING ONLY');
    
    const { pak, newPassword } = req.body;
    
    if (!pak || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'PAK and password are required'
      });
    }
    
    // Update password to plain text
    await db.execute(
      'UPDATE civ_manpower SET PASSWORD = ? WHERE PAK = ?',
      [newPassword, pak]
    );
    
    console.log(`✅ Password reset to plain text for PAK: ${pak}`);
    
    res.json({
      success: true,
      message: `Password reset to plain text for PAK: ${pak}`,
      warning: 'This is insecure! Change back to hashed password after testing.'
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Reset failed',
      error: error.message 
    });
  }
});

// Get all users with their password formats
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT PAK, EMPLOYEE_NAME, PASSWORD FROM civ_manpower LIMIT 10'
    );
    
    const usersWithFormat = users.map(user => ({
      pak: user.PAK,
      name: user.EMPLOYEE_NAME,
      passwordExists: !!user.PASSWORD,
      passwordLength: user.PASSWORD ? user.PASSWORD.length : 0,
      format: user.PASSWORD ? (user.PASSWORD.includes(':') ? 'PBKDF2' : 'PLAIN_TEXT') : 'NULL',
      passwordPreview: user.PASSWORD ? 
        (user.PASSWORD.length > 50 ? user.PASSWORD.substring(0, 50) + '...' : user.PASSWORD) 
        : 'NULL'
    }));
    
    res.json({
      success: true,
      users: usersWithFormat,
      total: usersWithFormat.length
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users',
      error: error.message 
    });
  }
});

module.exports = router;