const jwt = require('jsonwebtoken');
const User = require('../models/user');
const response = require('../utils/responseHandler');
const authMiddleware = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return response(res, 401, "Authentication token missing");
        console.log("No token found in cookies");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return response(res, 401, "User not found");
        }
        req.user = decoded;
        console.log("Authenticated user:", user);
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return response(res, 401, "Invalid authentication token");
    }
};
module.exports = { authMiddleware };