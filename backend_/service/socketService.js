const { Server } = require('socket.io');
const User = require('../models/user');
const Message = require('../models/message');


const onlineUsers = new Map();// Map to store online users --> userId : socketId
const typingUsers = new Map(); // Map to store typing users --> userId : {object of conversationId: true/false}

const initializeSocket = (server) => {
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
                onlineUsers.set(userId, socket.id);
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
        //forward message to reciever if online
        socket.on("send-message", async(message) => {
            try{
                 const recieverSocketId = onlineUsers.get(message.reciever);
            if (recieverSocketId) {
                io.to(recieverSocketId).emit("receive-message", message);
            }
            }
           
            catch(error){
                console.error ("error sending message", error)
                socket.emit("error-sending-message", {error: "error sending message from socket side", error});
            }
        });
         
        //mark messages as read send by user becuase if i am sending messages that means i have read them
        socket.on("message-read", async({messageIds, senderId}) => {
            try{
                await Message.updateMany(
                    { _id: { $in: messageIds }, reciever: userId },
                    { $set: { messageStatus: 'read' } }
                );
                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    messageIds.forEach(messageId => {
                        io.to(senderSocketId).emit("message-status-update", { messageId, messageStatus: 'read' });
                    });
                }
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        }
    );
 //handle typing indicator 
 socket.on("typing-start", ({conversationId, recieverId}) => {

            if (!userId || !recieverId || !conversationId) return;
            if (!typingUsers.has(userId))
            {
                typingUsers.set(userId, {});

            }
            const userTyping = typingUsers.get (userId);
            const recieverSocketId = onlineUsers.get(recieverId);
            if (!recieverSocketId) return; //if reciever not online no need to proceed
            userTyping[conversationId] = true;
              //notify reciever
            socket.to(recieverSocketId).emit("user-typing", {conversationId,  userId, isTyping: true});
            if (userTyping[`${conversationId}-timeout`])
            {
                clearTimeout(userTyping[`${conversationId}-timeout`]);
            }

          //auto stop after stopping for 3 seconds
            userTyping[`${conversationId}-timeout`] = setTimeout(() => {
                userTyping[conversationId] = false;
                socket.to(onlineUsers.get(recieverId)).emit("user-typing", {conversationId,  userId, isTyping: false});
            }, 3000);
          
        });
        //manual stop typing when user stops typing due to backspace or other reasons switch to another chat etc
        socket.on("typing-stop", ({conversationId, recieverId}) => {
            if (!userId || !recieverId || !conversationId) return;
            if (!typingUsers.has(userId)) return;
            const userTyping = typingUsers.get (userId);
            userTyping[conversationId] = false;
            const recieverSocketId = onlineUsers.get(recieverId);
            if (!recieverSocketId) return;
            if (userTyping[`${conversationId}-timeout`])
            {
                clearTimeout(userTyping[`${conversationId}-timeout`]);
                delete userTyping[`${conversationId}-timeout`];
            }
            socket.to(recieverSocketId).emit("user-typing", {conversationId,  userId, isTyping: false});
        });
        // Handle user disconnection
        socket.on('disconnect', async () => {
            try {
                if (userId) {
                    onlineUsers.delete(userId);
                    await User.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: new Date()
                    });
                    
                    // Notify all users this user went offline
                    io.emit('user-status', { userId, isOnline: false });
                }
                console.log('Client disconnected:', socket.id);
            } catch (err) {
                console.error('Error handling disconnect:', err);
            }
        });
    });

    return io; 
};

module.exports = { initializeSocket };