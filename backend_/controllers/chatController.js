const Conversation = require('../models/Conversation');
const { uploadFileToCloudinary } = require('../config/cloudinary');
const Message = require('../models/message');

const response = require('../utils/responseHandler');

// sending a message from one user to another
exports.sendMessage = async (req, res) => {
    try {
        const { senderId, recieverId, content } = req.body; // Changed 'message' to 'content'
        const file = req.file;
        const participants = [senderId, recieverId].sort();

        let conversation = await Conversation.findOne({
            participants: { $all: participants }
        });

        if (!conversation) {
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
            } else {
                return response(res, 400, "Unsupported file type");
            }
        } else if (content?.trim()) {
            contentType = 'text';
        } else {
            return response(res, 400, "Message content is required!");
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
        if (content || imageOrVideoUrl) {
            conversation.lastMessage = newMessage._id;
        }
        conversation.unreadcount += 1;
        await conversation.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'userName profilePicture')
            .populate('reciever', 'userName profilePicture');

        return response(res, 200, "Message sent successfully", { message: populatedMessage });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// get Conversation list for a user
exports.getConversation = async (req, res) => {
    const userId = req.user.userId;
    try {
        const conversations = await Conversation.find({
            participants: { $in: [userId] }
        })
            .populate("participants", "userName profilePicture lastSeen isOnline")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });

        return response(res, 200, "Conversations fetched successfully", conversations);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// get messages for a specific conversation
exports.getMessages = async (req, res) => {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return response(res, 404, "Conversation not found");
        }
        if (!conversation.participants.includes(userId)) {
            return response(res, 403, "Access denied to this conversation");
        }

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'userName profilePicture')
            .populate('reciever', 'userName profilePicture')
            .sort({ createdAt: 1 });

        await Message.updateMany(
            { conversation: conversationId, reciever: userId, messageStatus: { $ne: 'read' } },
            { $set: { messageStatus: 'read' } }
        );

        conversation.unreadcount = 0;
        await conversation.save();

        return response(res, 200, "Messages fetched successfully", messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.markAsRead = async (req, res) => {
    const { messageIds } = req.body;
    const userId = req.user.userId;
    try {
        await Message.updateMany(
            { _id: { $in: messageIds }, reciever: userId },
            { $set: { messageStatus: 'read' } }
        );
        return response(res, 200, "Messages marked as read successfully");
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

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
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};