const otpGeneraete = () => {
    return Math.floor(100000 + Math.random() * 9000).toString();
    // 6 digits otp
}
module.exports = otpGeneraete;