const mongoose = require('mongoose');
const ConversationSchema = new mongoose.Schema({
    // Array of user IDs who are part of this chat
    participants: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }],
    
    // Reference to the most recent message (for preview)
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Message'
    },
    
    // Counter for unread messages
    unreadcount: {type: Number, default: 0}
}, {
    timestamps: true  
});
const Conversation =  mongoose.model('Conversation',ConversationSchema);
module.exports = Conversation;