const handleVideoCallEvent = (socket, io, onlineUsers) => {

    // Initiate video call
    socket.on("initiate_call", ({ callerId, receiverId, callType, callerInfo }) => {

        const receiverSocketId = onlineUsers.get(receiverId);

        if (receiverSocketId) {
            const callId = `${callerId}-${receiverId}-${Date.now()}`;

            io.to(receiverSocketId).emit("incoming_call", {
                callerId,
                callerName: callerInfo.username,
                callerAvatar: callerInfo.profilePicture,
                callId,
                callType
            });
        } else {
            console.log(`server: Receiver ${receiverId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    });

    // Handle call acceptance
    // Accept Call
    socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
        const callerSocketId = onlineUsers.get(callerId);

        if (callerSocketId) {
            io.to(callerSocketId).emit("call_accepted", {
                callerName: receiverInfo.username,
                callerAvatar: receiverInfo.profilePicture,
                callId,
            });
        } else {
            console.log(`server: Receiver ${callerId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    });


    // Handle call rejection
    socket.on("reject_call", ({ callId, callerId }) => {
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId) {
            io.to(callerSocketId).emit("call_rejected", { callId });
        }
        else {
            console.log(`server: Receiver ${callerId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    });

    // Handle call cancellation
    socket.on("end_call", ({ callId, participantId }) => {
        const participantSocketId = onlineUsers.get(participantId);
        if (participantSocketId) {
            io.to(participantSocketId).emit("call_ended", { callId });
        }
        else {
            console.log(`server: Receiver ${participantId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    });

    // webrtc signaling with proper userId
    socket.on("webrtc_offer", ({ callId, offer, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("webrtc_offer", { callId, offer, senderId: socket.userId });
        }
        else {
            console.log(`server: Receiver ${receiverId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    })

    socket.on("webrtc_answer", ({ callId, answer, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("webrtc_answer", { callId, answer, senderId: socket.userId });
        }
        else {
            console.log(`server: Receiver ${receiverId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    })

    socket.on("webrtc_ice_candidate", ({ callId, candidate, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("webrtc_ice_candidate", { callId, candidate, senderId: socket.userId });
        }
        else {
            console.log(`server: Receiver ${receiverId} is offline`);
            socket.emit("call_failed", { reason: "user is offline" });
        }
    })

    // Handle call disconnection
    socket.on("disconnect_call", ({ callId, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("call_disconnected", { callId });
        }
    });

    // Handle audio toggle
    socket.on("toggle_audio", ({ callId, receiverId, enabled }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("remote_toggle_audio", { callId, enabled });
        }
    });

};
module.exports = handleVideoCallEvent;