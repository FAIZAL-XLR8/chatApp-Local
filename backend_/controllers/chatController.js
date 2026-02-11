const Conversation = require('../models/Conversation');
const { uploadFileToCloudinary } = require('../config/cloudinary');
const Message = require('../models/message');
const { generateSummary } = require('../utils/aiService');

const response = require('../utils/responseHandler');

// sending a message from one user to another
exports.sendMessage = async (req, res) => {
    try {
        console.log('req.body:', req.body);
        console.log('req.file:', req.file);

        const { senderId, receiverId, content } = req.body;


        // Add validation BEFORE creating participants array
        if (!senderId || senderId === 'undefined') {
            return res.status(400).json({ error: 'Invalid sender ID' });
        }

        if (!receiverId || receiverId === 'undefined') {
            return res.status(400).json({ error: 'Invalid receiver ID' });
        }
        // const { senderId, receiverId, content } = req.body; // Changed 'message' to 'content'
        const file = req.file;
        const participants = [senderId, receiverId].sort();

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
            receiver: receiverId,
            content,
            imageOrVideoUrl,
            contentType
        });
        await newMessage.save();

        // Update the last message in the conversation
        if (content || imageOrVideoUrl) {
            conversation.lastMessage = newMessage._id;
        }
        // Check if receiver is online to mark as delivered
        const receiverIdStr = receiverId?.toString();
        const isReceiverOnline = req.socketUserMap?.has(receiverIdStr) && req.socketUserMap.get(receiverIdStr).length > 0;

        if (isReceiverOnline) {
            newMessage.messageStatus = 'delivered';
        }

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'userName profilePicture')
            .populate('receiver', 'userName profilePicture')
            .populate('reactions.user', 'userName profilePicture');
        console.log('📦 Populated Message Object:', JSON.stringify(populatedMessage, null, 2));
        console.log('📦 Message Fields:', {
            _id: populatedMessage._id,
            conversation: populatedMessage.conversation,
            sender: populatedMessage.sender,
            receiver: populatedMessage.receiver,
            content: populatedMessage.content,
            contentType: populatedMessage.contentType,
            imageOrVideoUrl: populatedMessage.imageOrVideoUrl,
            messageStatus: populatedMessage.messageStatus,
            createdAt: populatedMessage.createdAt,
            reactions: populatedMessage.reactions
        });
        if (req.io) {
            const senderIdStr = senderId?.toString();

            console.log(`📤 Emitting receive-message to receiver: ${receiverIdStr}, sender: ${senderIdStr}`);

            // Emit to receiver (all their devices)
            req.io.to(receiverIdStr).emit("receive-message", populatedMessage);

            // Emit confirmation to sender 
            req.io.to(senderIdStr).emit("message-send", populatedMessage);

            // We already saved the status above, so no need to save again here
            // But if we want to support dynamic delivery updates if logic changes, we can emit status update
            if (isReceiverOnline) {
                // Explicitly ensure sender gets the update if they listened to message-status-update
                // although message-send usually handles the optimistic update
            }
        }
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
            .populate('receiver', 'userName profilePicture')
            .populate('reactions.user', 'userName profilePicture')
            .sort({ createdAt: 1 });

        await Message.updateMany(
            { conversation: conversationId, receiver: userId, messageStatus: { $ne: 'read' } },
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
        // Get relevant messages to determine senders
        let messages = await Message.find({
            _id: { $in: messageIds },
            receiver: userId
        });

        // Update message status to 'read'
        await Message.updateMany(
            { _id: { $in: messageIds }, receiver: userId },
            { $set: { messageStatus: 'read' } }
        );

        if (req.io && messages.length > 0) {
            const senderIds = [...new Set(messages.map(m => m.sender.toString()))];

            senderIds.forEach(senderId => {
                req.io.to(senderId).emit("messages-read", {
                    messageIds,
                    messageStatus: "read"
                });
            });
        }

        // // Emit real-time notifications to senders
        // if (req.io) {

        //     for (const message of messages) {
        //         // Notify the sender that their message has been read
        //         const updatedMessage = {
        //         _id : message._id,
        //         messageStatus : "read"
        //     };
        //         req.io.to(message.sender.toString()).emit('message-read', updatedMessage);

        //     }
        // }

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
        // Validate ObjectId format to prevent CastError for temporary IDs
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return response(res, 400, "Invalid message ID - cannot delete temporary messages");
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return response(res, 404, "Message not found");
        }

        if (message.sender.toString() !== userId) {
            return response(res, 403, "You can only delete your own messages");
        }

        // Delete the message
        await Message.findByIdAndDelete(messageId);

        // Emit real-time notification to receiver frontend
        if (req.io) {
            req.io.to(message.receiver.toString()).emit('message-deleted',
                messageId,
            );
        }

        return response(res, 200, "Message deleted successfully");
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// AI Summarization logic
exports.summarizeMessages = async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const mongoose = require('mongoose');

    // Validate ObjectId to prevent CastError
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return response(res, 400, "Invalid conversation ID format");
    }

    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return response(res, 404, "Conversation not found");
        }

        // Use some with toString() for reliable comparison
        const isParticipant = conversation.participants.some(p => p.toString() === userId.toString());
        if (!isParticipant) {
            return response(res, 403, "Access denied to this conversation");
        }

        // Fetch the last 5 messages for token usage optimization as requested by the user
        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'userName')
            .sort({ createdAt: -1 })
            .limit(5);

        if (messages.length === 0) {
            return response(res, 400, "No messages to summarize");
        }

        // Reverse to get chronological order for the AI
        const summary = await generateSummary(messages.reverse());

        return response(res, 200, "Summary generated successfully", { summary });
    } catch (error) {
        console.error('Summarize messages error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};