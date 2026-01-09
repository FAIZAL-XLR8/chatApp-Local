const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    phoneNumber : {
        type : String,
        unique : true,
        required : true,
        sparse : true

    },
    phoneSuffix :{
        type : String,
        unique : false,
        
    },
    userName : {
        type : String,
    },
     email: {
    type: String,
    required: true,
    validate: [
      {
        validator: function(v) {
          return /\S+@\S+\.\S+/.test(v);
        },
        message: props => `${props.value} is not a valid email!`
      },
      {
        validator: async function(v) {
          const userCount = await this.model('User').countDocuments({ email: v });
          return !userCount; // Ensure the email is unique
        },
        message: props => `${props.value} already exists!`
      }
    ]
  },
   emailOtp : {
        type : String
   },
   emailOtpExpiry : {
        type : Date
   },
  profilePicture : {
        type : String,
        default : ""
   },
   about : {
        type : String,
        default : "Hey there! I am using WhatsApp Clone."
   },
   lastSeen : {
        type : Date,
        default : Date.now
   },
   isOnline : {
        type : Boolean,
        default : false
   },
   isVerified : {
        type : Boolean,
        default : false
   }, //is account verified via email
   agreed : {
        type : Boolean,
        default : false
   } // agreed to terms and conditions
},
{
    timestamps : true
})
const User = mongoose.model('User', userSchema);
module.exports = User;