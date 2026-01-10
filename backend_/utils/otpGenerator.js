const otpGeneraete = () => {
    return Math.floor(1000000 + Math.random() * 9000).toString();
    //7 digits otp
}
module.exports = otpGeneraete;