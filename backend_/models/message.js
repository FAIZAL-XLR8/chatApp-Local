const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
    conversation : {
        type : mongoose.Schema.Types.ObjectId, ref : 'Conversation', required : true
    }, //has idea about which conversation this message belongs to
    sender : {
        type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true
    }, //who sent this message
    content : {
        type : String, required : true
    }, //the actual message content
    reciever : {
        type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true
    }, //who is the reciever of this message
    imageOrVideoUrl : {
        type : String
    }, //if the message contains image or video along with message text thats why two seperate things content and images, store the URL here,
    contentType : {
        type : String,
        enum : ['text','image','video'],
        default : 'text'
    },
    reactions : [ //array of reactions for user : emoji objects
        {
            user : {type : mongoose.Schema.Types.ObjectId, ref : 'User'},
            emoji : {type : String} //like, love, laugh etc
        }
    ],
    messageStatus : {
        type : String,
        enum : ['send','delivered','read'],
        default : 'send'
    }
},{timestamps : true});
const Message = mongoose.model('Message',MessageSchema);
module.exports = Message;