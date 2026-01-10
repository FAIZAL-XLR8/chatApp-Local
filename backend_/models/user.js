const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  phoneSuffix: {
    type: String,
  },
  userName: {
    type: String,
  },
  email: {
    type: String,

    unique: true,
    sparse: true,
    lowercase: true, 
    trim: true, 
    validate: [
      {
        validator: function(v) {
          // Basic email format validation
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email!`
      }
   
    ]
  },
  emailOtp: {
    type: String
  },
  emailOtpExpiry: {
    type: Date
  },
  profilePicture: {
    type: String,
    default: ""
  },
  about: {
    type: String,
    default: "Hey there! I am using ZenChat."
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  agreed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});



const User = mongoose.model('User', userSchema);

module.exports = User;