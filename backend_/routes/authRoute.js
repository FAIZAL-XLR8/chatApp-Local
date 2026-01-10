const express = require('express');
const authRouter = express.Router();

const { sendOtp, verifyOtp, updateProfile ,logout, checkAuthenticated, getAllUsers} = require('../controllers/authController');

const { authMiddleware } = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/cloudinary');
// Route to send OTP
authRouter.post('/send-otp', sendOtp);
authRouter.post('/verify-otp', verifyOtp);
authRouter.post('/logout', 
authMiddleware, logout);
//proteccted routes
authRouter.put('/update-profile', authMiddleware, multerMiddleware, updateProfile);
authRouter.get('/check-auth', authMiddleware, checkAuthenticated)
authRouter.get('/users', authMiddleware, getAllUsers)
module.exports = authRouter;