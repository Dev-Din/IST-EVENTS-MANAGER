const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/postgresAuth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected route
router.get('/me', getMe);

module.exports = router;
