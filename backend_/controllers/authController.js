const otpGeneraete = require('../utils/otpGenerator');
const User = require('../models/user');
const {sendOtpToEmail} = require('../service/emailServices');
const twilioService = require('../service/twilioService');
const response = require('../utils/responseHandler');
 const generateJWT = require('../utils/generateJWT');
const { uploadFileToCloudinary } = require('../config/cloudinary');
const Conversation = require ("../models/Conversation");
const sendOtp = async (req, res) =>{
    const {phoneNumber, phoneSuffix, email} = req.body;
    const otp = otpGeneraete();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    let user ;
    try{
        if(email){
            user = await User.findOne({
                email: email
            });
            if(!user){
                user = new User({email: email});
            }
            //store otp in db and also its expiry
            user.emailOtp = otp;
            user.emailOtpExpiry = expiry;
            await user.save();
            await sendOtpToEmail(email, otp);
            return response(res, 200, "OTP sent to email", {email} );

        }
        if (!phoneNumber || !phoneSuffix) {
            return response(res, 400, "Phone number and suffix are required");
        }
        const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
        user = await User.findOne({phoneNumber});
        if(!user){
            user = new User({phoneNumber, phoneSuffix});
        }
        await twilioService.sendOtpToPhoneNumber (fullPhoneNumber);
        await user.save();

        return response(res, 200, "OTP sent to phone number", {phoneNumber: fullPhoneNumber} ); 
    }catch(err){
        console.error(err);
        return response(res, 500, "Server error");
    }
}

// Const verify Otp
const verifyOtp = async (req, res) => {
    const {phoneNumber, phoneSuffix, otp, email} = req.body;
    let user;
    try {
        if(email){
            user = await User.findOne({ email: email });
            if (!user) {
                return response(res, 400, "User not found");
            }
            if (!user.emailOtp || String(user.emailOtp) !== String(otp)) {
                return response(res, 400, "Invalid OTP");
            }
            user.isVerified = true;
            user.emailOtp = null;
            user.emailOtpExpiry = null;
            await user.save();
            console.log("OTP verified for email:", email);

        }
        else{
            if (!phoneNumber || !phoneSuffix) {
                return response(res, 400, "Phone number and suffix are required");
            }
            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
            user = await User.findOne({ phoneNumber: phoneNumber });
            if (!user) {
                return response(res, 400, "User not found");
            }
            const verificationResult = await twilioService.verifyOtp(fullPhoneNumber, otp);
            if (verificationResult.status !== "approved") {
                return response(res, 400, "Invalid OTP");
            }
            console.log("OTP verified for phone number:", fullPhoneNumber);
            user.isVerified = true;
            await user.save();
        }
        //abb  give jwt token after verification user ko
       const token = generateJWT(user?._id);
       res.cookie ("token", token, {
        httpOnly : true,
        maxAge : 7*24*60*60*1000, //7 days
       });
       console.log("JWT token generated and set in cookies for user:", user?._id);
       return response(res, 200, "Otp  verified successfully", {
       });
      

    } catch (err) {
        console.error(err);
        return response(res, 500, "Server error");
    }
}

const updateProfile = async (req, res) => {
    // Implementation for updating user profile
    const {userName, agreed, about} = req.body;
    const userId = req.user.userId;
    {
        try {
            const user = await User.findById(userId);
            const file = req.file;
            if (!user) {
                return response(res, 404, "User not found");
            }
            if (file)
            {
                const uploadResult = await uploadFileToCloudinary(file);
                user.profilePicture = uploadResult?.secure_url;
                console.log("Profile picture updated:", user.profilePicture);
            }else if(req.body.profilePicture){
                user.profilePicture = req.body.profilePicture;
            }
            if (userName) user.userName = userName;
            if (about) user.about = about;
            if (agreed !== undefined) user.agreed = agreed;
            await user.save();
            console.log("User profile updated:", user);
            return response(res, 200, "Profile updated successfully", {
                user,
            });
        }catch (err) {
        console.error(err);
        return response(res, 500, "Server error");
    }
    }
}
const logout = (req, res)=>{
    try{
        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0),
        });
        return response (res, 200, "Logged out successfully");
    }catch(err){
        console.error(err);
        return response(res, 500, "Server error");
    }
}
const checkAuthenticated = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) {
            return response(res, 404, "User not found");
        }
        return response(res, 200, "User authenticated", { user });
    } catch (err) {
        console.error(err);
        return response(res, 500, "Server error");
    }
}
const getAllUsers = async (req, res) => {
    const loggedInUser = req.user.userId;
    try {
        const users = await User.find({ _id: { $ne: loggedInUser } }).select(
            "username profilePicture lastSeen isOnline about phoneNumber phoneSuffix"
        ).lean();

        const usersWithConversation = await Promise.all(
            users.map(async (user) => {
                const conversation = await Conversation.findOne({
                    participants: { $all: [loggedInUser, user?._id] }
                }).populate({
                    path: 'lastMessage',
                    select: 'content createdAt sender receiver'
                }).lean();
                //lean to get plain JS object without mongoose methods .save() doesnt works but populate works without lean its mongoose document with methods lean makes docs into lesser size and faster

                return {
                    ...user,
                    conversation: conversation || null
                };
            })
        );

        return response(res, 200, 'users retived successfully', usersWithConversation);
    } catch (error) {
        // error handling
        console.error(error);
        return response(res, 500, 'Server error');
    }
};
module.exports = {sendOtp, verifyOtp, updateProfile, logout, checkAuthenticated, getAllUsers};
