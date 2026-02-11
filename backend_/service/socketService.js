const { Server } = require('socket.io');
const User = require('../models/user');
const Message = require('../models/message');
const handleVideoCallEvent = require('./videoCall');

const onlineUsers = new Map();// Map to store online users --> userId : [socketIds]
const typingUsers = new Map(); // Map to store typing users --> userId : {object of (conversationId: true/false, timeoutId : 191u91)}

const initializeSocket = (server) => {
    //this takes http server and converts into socket
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
        },
        pingTimeout: 60000, // 60 seconds timeout for inactive connections
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);
        let userId = null;

        // Handle user online status and mark them as online in db
        socket.on('user-connected', async (connectingUserId) => {
            try {
                userId = connectingUserId;
                socket.userId = userId;
                if (!onlineUsers.has(userId)) {
                    onlineUsers.set(userId, []);
                }
                onlineUsers.get(userId).push(socket.id);
                socket.join(userId);
                //join for personal room for direct emit
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date()
                });

                // Notify all connected users about this user's online status
                io.emit('user-status', { userId, isOnline: true });
            } catch (err) {
                console.error('Error setting user online status:', err);
            }
        });

        // Handle online status for requested user
        socket.on('get-user-status', async (requestedUserId, callback) => {
            try {
                const isOnline = onlineUsers.has(requestedUserId);
                let lastSeen = null;

                if (!isOnline) {
                    const user = await User.findById(requestedUserId);
                    lastSeen = user?.lastSeen;
                }

                callback({
                    userId: requestedUserId,
                    isOnline,
                    lastSeen
                });
            } catch (err) {
                console.error('Error getting user status:', err);
                callback({
                    userId: requestedUserId,
                    isOnline: false,
                    lastSeen: null,
                    error: 'Failed to fetch status'
                });
            }
        });

        //forward message to receiver if online
        socket.on("send-message", async (message) => {
            console.log("📨 Received send-message via socket:", message);
            try {
                // Extract receiver and sender IDs (handle both object and string formats)
                const receiverId = message.receiver?._id || message.receiver;
                const senderId = message.sender?._id || message.sender;

                if (!receiverId || !senderId) {
                    console.error("❌ Missing receiver or sender ID in send-message");
                    return;
                }

                console.log(`📤 Forwarding message to receiver: ${receiverId}, sender: ${senderId}`);

                // Use room to emit to all devices of receiver
                io.to(receiverId.toString()).emit("receive-message", message);
                // Also emit to sender for multi-device sync
                io.to(senderId.toString()).emit("receive-message", message);

                console.log("✅ Message forwarded successfully");
            }
            catch (error) {
                console.error("❌ Error forwarding message via socket:", error);
                socket.emit("error-sending-message", {
                    error: "error sending message from socket side",
                    details: error.message
                });
            }
        });

        //mark messages as read send by user because if i am sending messages that means i have read them
        socket.on("message-read", async ({ messageIds, senderId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds }, receiver: userId },
                    { $set: { messageStatus: 'read' } }
                );

                // Emit to all devices of sender using room
                io.to(senderId).emit("messages-read", {
                    messageIds,
                    messageStatus: 'read'
                });
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        });

        //handle typing indicator 
        socket.on("typing-start", ({ conversationId, receiverId }) => {
            if (!userId || !receiverId || !conversationId) return;
            if (!typingUsers.has(userId)) {
                typingUsers.set(userId, {});
            }
            const userTyping = typingUsers.get(userId);

            // Check if receiver is online
            if (!onlineUsers.has(receiverId)) return;

            userTyping[conversationId] = true;

            // Notify all devices of receiver
            io.to(receiverId).emit("user-typing", { conversationId, userId, isTyping: true });

            if (userTyping[`${conversationId}-timeout`]) {
                clearTimeout(userTyping[`${conversationId}-timeout`]);
            }

            //auto stop after stopping for 3 seconds
            userTyping[`${conversationId}-timeout`] = setTimeout(() => {
                userTyping[conversationId] = false;
                if (onlineUsers.has(receiverId)) {
                    io.to(receiverId).emit("user-typing", { conversationId, userId, isTyping: false });
                }
            }, 3000);
        });

        //manual stop typing when user stops typing due to backspace or other reasons switch to another chat etc
        socket.on("typing-stop", ({ conversationId, receiverId }) => {
            if (!userId || !receiverId || !conversationId) return;
            if (!typingUsers.has(userId)) return;

            const userTyping = typingUsers.get(userId);
            userTyping[conversationId] = false;

            if (!onlineUsers.has(receiverId)) return;

            if (userTyping[`${conversationId}-timeout`]) {
                clearTimeout(userTyping[`${conversationId}-timeout`]);
                delete userTyping[`${conversationId}-timeout`];
            }

            io.to(receiverId).emit("user-typing", { conversationId, userId, isTyping: false });
        });


        // Handle user disconnection
        socket.on('disconnect', async () => {
            if (!userId) return;
            try {
                // Remove this socket from user's array
                if (onlineUsers.has(userId)) {
                    const sockets = onlineUsers.get(userId);
                    const index = sockets.indexOf(socket.id);
                    if (index > -1) {
                        sockets.splice(index, 1);
                    }

                    // If no more sockets, mark user offline
                    if (sockets.length === 0) {
                        onlineUsers.delete(userId);

                        await User.findByIdAndUpdate(userId, {
                            isOnline: false,
                            lastSeen: new Date()
                        });

                        // Notify all users this user went offline
                        io.emit('user-status', { userId, isOnline: false, lastSeen: new Date() });
                    }
                }

                socket.leave(userId);

                // Clear typing timeouts
                const typing = typingUsers.get(userId);
                if (typing) {
                    Object.keys(typing).forEach((key) => {
                        if (key.endsWith('-timeout')) clearTimeout(typing[key]);
                    });
                    typingUsers.delete(userId);
                    console.log('Client disconnected:', socket.id);
                }
            } catch (err) {
                console.error('Error handling disconnect:', err);
            }
        });

        //handle video call events
        handleVideoCallEvent(socket, io, onlineUsers);
    });

    //for other controllers to use the map of online users we attach in io object onlineUser
    io.socketUserMap = onlineUsers;
    return io;
};

module.exports = { initializeSocket };