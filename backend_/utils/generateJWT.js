const jwt = require('jsonwebtoken');
const generateJWT = (userId) => {
    return jwt.sign({userId}, process.env.JWT_SECRET, { expiresIn: '7d' });
}
module.exports = generateJWT;