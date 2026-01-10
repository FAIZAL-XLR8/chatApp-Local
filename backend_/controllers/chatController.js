    const { response } = require('express');
const Conversation = require('../models/Conversation');
const response = require ("../utils/responseHandler")
const Message = require('../models/message');
// sending a message from one user to another
    exports.sendMessage = async (req, res) => {

        try{
            const {senderId, recieverId, message} = req.body;
            const file = req.file;
            const participants = [senderId, recieverId].sort(); //
            //sorting needed to maintain consistency in participant order matlab ki agar A aur B hain to hamesha [A,B] hi rahe na ki [b,a] agr b sender ho
            //sender koi bhi ho convo same hai
            

            let conversation = await Conversation.findOne({
                participants: { $all: participants }
            }); ///finding the conversation between the two participants

            if (!conversation) {
                // Create a new conversation if it doesn't exist
                conversation = new Conversation({ participants });
            }
            await conversation.save();
            let imageOrVideoUrl = null;
            let contentType = null;
            if (file) {
                const uploadFile = await uploadFileToCloudinary(file);
                if (!uploadFile?.secure_url) {
                    return res.status(500).json({ error: 'File upload failed' });
                }
                imageOrVideoUrl = uploadFile.secure_url;

                if (file.mimetype.startsWith('video')) {
                    contentType = 'video';
                } else if (file.mimetype.startsWith('image')) {
                    contentType = 'image';
                }
                else {
                 return response(res, 400, "Unsupported file type");
                }
            }else if (content?.trim()){
                contentType = 'text';
            }
            else
            {
                return response(res,400, "Message content is required!");
            }
            const newMessage = new Message({
                conversation: conversation._id,
                sender: senderId,
                reciever: recieverId,
                content,   
                imageOrVideoUrl,
                contentType
            });
            await newMessage.save();
            // Update the last message in the conversation
            
            if (message?.content)
            {
                conversation.lastMessage = newMessage._id;
            }
            conversation.unreadcount += 1; // Increment unread count
            await conversation.save();
            const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'userName profilePicture').populate('reciever', 'userName profilePicture');

            return response(res, 200, "Message sent successfully", { message: newMessage });

        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    //get Conversation list for a user
    exports.getConersation = async (req, res) => {
        const userId = req.user.userId;
        try {
            const conversations = await Conversation.find({
                participants: { $in: [userId] }}).populate ("participants", "userName profilePicture lastSeen isOnline ").populate("lastMessage", "userName profilePicture").sort({ updatedAt: -1 });
            return response(res, 200, "Conversations fetched successfully",  conversations );
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }

    }
    //get messages for a specific conversation
    exports.getMessages = async (req, res) => {
        const conversationId = req.params.conversationId;
        const userId = req.user.userId;
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return response(res, 404, "Conversation not found or access denied");
            }
            if (!conversation.participants.includes(userId)) {
                return response(res, 403, "Access denied to this conversation");
            }
            const messages = await Message.find({ conversation: conversationId }).populate('sender', 'userName profilePicture').populate('reciever', 'userName profilePicture').sort({ createdAt: 1 });
            await Message.updateMany(
                { conversation: conversationId, reciever: userId, messageStatus: { $ne: 'read' } },
                { $set: { messageStatus: 'read' } }
            );
            conversation.unreadcount = 0;
            await conversation.save();

            return response(res, 200, "Messages fetched successfully", messages);
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    exports.markAsRead = async (req, res) => {
        const {messageIds} =   req.body; 
        const userId = req.user.userId;
        try {
            let messages = await Message.find({ _id: { $in: messageIds }, reciever: userId });
            await Message.updateMany(
                { _id: { $in: messageIds }, reciever: userId },
                { $set: { messageStatus: 'read' } }
            );
            return response(res, 200, "Messages marked as read successfully");
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    exports.deleteMessage = async (req, res) => {
        const messageId = req.params.messageId;
        const userId = req.user.userId;
        try {
            const message = await Message.findById(messageId);
            if (!message) {
                return response(res, 404, "Message not found");
            }
            if (message.sender.toString() !== userId) {
                return response(res, 403, "You can only delete your own messages");
            }
            await Message.findByIdAndDelete(messageId);
            return response(res, 200, "Message deleted successfully");
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }