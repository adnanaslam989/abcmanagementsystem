const express = require('express');
const app = express();
const PORT = 5001; // Different port

app.use(express.json());

// Simple auth routes
const authRouter = express.Router();

authRouter.get('/', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

authRouter.post('/reset-password', (req, res) => {
  console.log('Reset password called:', req.body);
  res.json({ 
    success: true, 
    message: 'Password reset test successful',
    data: req.body 
  });
});

app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Test server on port ${PORT}`);
  console.log('Test with: curl -X POST http://localhost:5001/api/auth/reset-password');
});