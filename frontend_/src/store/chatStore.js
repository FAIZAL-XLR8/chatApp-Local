import { create } from "zustand";
import {getSocket} from "../services/chatService";
import axiosClient from "../services/urlServices";
import axios from "axios";

// Helper function to get current user ID consistently
const getCurrentUserId = (currentUser) => {
  if (!currentUser) return null;
  return currentUser.user?._id || currentUser._id || currentUser;
};

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentUser : null,
  currentConversation: null,
  messages: [], //currentConversation ka messages
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

  initialSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // remove existing listeners to prevent duplicate listeners
    // Remove existing listeners to prevent duplicate handlers
socket.off("receive-message");
socket.off("user-typing");
socket.off("user-status");
socket.off("message-send");
socket.off("message-error");
socket.off("message-deleted");

// Listen for incoming messages
socket.on("receive-message", (message) => {
  console.log('📨 RECEIVED MESSAGE via socket:', {
    messageId: message._id,
    conversation: message.conversation,
    sender: message.sender?._id || message.sender,
    content: message.content?.substring(0, 50)
  });
  
  const { currentConversation, currentUser, conversations } = get();
  const currentUserId = getCurrentUserId(currentUser);
  const messageSenderId = message.sender?._id || message.sender;
  const messageConversationId = message.conversation?._id || message.conversation;
  
  // Skip if this is the current user's own message (handled by message-send event)
  if (messageSenderId === currentUserId) {
    console.log('⏭️ Skipping own message in receive-message');
    return;
  }
  
  // Normalize conversation IDs for comparison
  const normalizedMessageConvId = messageConversationId?.toString();
  const normalizedCurrentConvId = currentConversation?.toString();
  
  console.log('🔍 Conversation ID check:', {
    messageConvId: normalizedMessageConvId,
    currentConvId: normalizedCurrentConvId,
    match: normalizedMessageConvId === normalizedCurrentConvId
  });
  
  // Check if message belongs to any conversation user has
  const conversationExists = conversations?.data?.some(conv => {
    const convId = conv._id?.toString();
    return convId === normalizedMessageConvId || conv._id === messageConversationId;
  });
  
  // Update conversations list with new message
  set((state) => {
    let updatedConversations = state.conversations;
    
    if (state.conversations?.data) {
      updatedConversations = {
        ...state.conversations,
        data: state.conversations.data.map((conv) => {
          const convId = conv._id?.toString();
          if (convId === normalizedMessageConvId || conv._id === messageConversationId) {
            // Use unreadcount (lowercase) to match backend model
            const currentUnreadCount = conv.unreadcount || conv.unreadCount || 0;
            const isCurrentConversation = normalizedMessageConvId === normalizedCurrentConvId;
            const messageSenderId = message.sender?._id || message.sender;
            const isMessageFromCurrentUser = messageSenderId === currentUserId;
            
            return {
              ...conv,
              lastMessage: message,
              unreadcount: isCurrentConversation || isMessageFromCurrentUser
                ? 0  // Reset if viewing conversation or message is from current user
                : currentUnreadCount + 1  // Increment if not viewing and message is from other user
            };
          }
          return conv;
        })
      };
    }
    
    // Only add to messages if it's for the current conversation
    // If currentConversation is not set, check if this message belongs to any of user's conversations
    // and if there's only one conversation, assume it's the current one
    let shouldAddToMessages = false;
    
    if (normalizedMessageConvId === normalizedCurrentConvId) {
      shouldAddToMessages = true;
      console.log('✅ Message matches current conversation');
    } else if (!normalizedCurrentConvId && conversationExists) {
      // If no current conversation is set but message belongs to user's conversations
      // Check if there's only one active conversation - if so, this is probably it
      const activeConversations = state.conversations?.data?.filter(conv => 
        (conv._id?.toString() === normalizedMessageConvId || conv._id === messageConversationId)
      );
      
      if (activeConversations?.length === 1) {
        console.log('✅ No current conversation set, but message belongs to user\'s only conversation - adding it');
        shouldAddToMessages = true;
        // Also set this as current conversation
        updatedConversations = {
          ...updatedConversations,
          // This will be handled by the return statement
        };
      }
    }
    
    if (shouldAddToMessages) {
      // Check for duplicates more carefully - handle both string and object IDs
      const existingMessage = state.messages.find(msg => {
        const msgId = msg._id?.toString();
        const incomingId = message._id?.toString();
        return msgId === incomingId || msg._id === message._id;
      });
      
      if (existingMessage) {
        console.log('⚠️ Message already exists in current conversation', {
          messageId: message._id,
          existingMessageId: existingMessage._id,
          existingCount: state.messages.length,
          reason: 'Duplicate detected - message already in state'
        });
        // Still update conversations even if message exists
        return { conversations: updatedConversations };
      }
      
      console.log('➕ Adding new message to current conversation', {
        messageId: message._id,
        conversationId: normalizedMessageConvId,
        currentConvId: normalizedCurrentConvId,
        willSetCurrentConv: !normalizedCurrentConvId
      });
      
      const newState = {
        messages: [...state.messages, message],
        conversations: updatedConversations
      };
      
      // If currentConversation wasn't set, set it now
      if (!normalizedCurrentConvId && conversationExists) {
        newState.currentConversation = normalizedMessageConvId;
      }
      
      return newState;
    }
    
    // Message not for current conversation, just update conversations list
    if (!conversationExists) {
      console.log('⚠️ Message received for conversation not in user\'s list');
    } else {
      console.log('📋 Updated conversation list (message not for current conversation)');
    }
    
    return { conversations: updatedConversations };
  });
});

    // ===== LISTENER 1: When YOUR message is confirmed by server =====
    
    socket.on("message-send", (message) => {
      console.log("📤 message-send event received:", message);
      const { currentConversation } = get();
      const messageConversationId = message.conversation?._id || message.conversation;
      
      // Only process if it's for the current conversation
      if (messageConversationId !== currentConversation && 
          messageConversationId?.toString() !== currentConversation?.toString()) {
        console.log("⏭️ Skipping message-send - not for current conversation");
        return;
      }
      
      set((state) => {
        // First check if message already exists with real ID
        const existingIndex = state.messages.findIndex(m => m._id === message._id);
        if (existingIndex !== -1) {
          console.log("✅ Updating existing message");
          const newMessages = [...state.messages];
          newMessages[existingIndex] = message;
          return { messages: newMessages };
        }
        
        // Find temp message to replace
        const tempIndex = state.messages.findIndex(
          (msg) => {
            const msgSenderId = msg.sender?._id || msg.sender;
            const messageSenderId = message.sender?._id || message.sender;
            return msg._id?.startsWith('temp-') && 
                   msgSenderId === messageSenderId &&
                   (msg.content === message.content || 
                    (msg.contentType === message.contentType && 
                     msg.imageOrVideoUrl && message.imageOrVideoUrl))
          }
        );
        
        if (tempIndex !== -1) {
          console.log("🔄 Replacing temp message with real message");
          const newMessages = [...state.messages];
          newMessages[tempIndex] = message;
          return { messages: newMessages };
        }
        
        // If no match found, add the message
        console.log("➕ Adding new message from message-send");
        return { messages: [...state.messages, message] };
      });
    });

    // ===== LISTENER 2: When message status updates (delivered/read) =====
    socket.on("message-status-update", ({ messageId, messageStatus }) => {
      /*
      SCENARIO: Your friend reads your message

      Server sends: {
        messageId: "real-123",    // Which message
        messageStatus: "read"     // New status: "delivered" or "read"
      }

      BEFORE: messages = [{_id: "real-123", text: "Hello", status: "sent"}]
      AFTER:  messages = [{_id: "real-123", text: "Hello", status: "read"}]
      */
      set((state) => ({
        messages: state.messages.map((msg) =>
          // Find message by ID and update its status
          // FIX: Changed 'messageStatus' to 'status' - correct property name
          msg._id === messageId ? { ...msg, status: messageStatus } : msg
          // ^ This keeps all message data, only updates status property
        ),
      }));
    });

    // ===== LISTENER 3: When someone reacts to a message =====
    socket.on("reaction-update", ({ messageId, reactions }) => {
      /*
      SCENARIO: Your friend ❤️ reacts to your message

      Server sends: {
        messageId: "real-123",    // Which message
        reactions: ["❤️", "😂"]   // Array of all reactions on that message
      }

      BEFORE: messages = [{_id: "real-123", text: "Hello", reactions: []}]
      AFTER:  messages = [{_id: "real-123", text: "Hello", reactions: ["❤️", "😂"]}]
      */
      set((state) => ({
        messages: state.messages.map((msg) =>
          // Find message by ID and update reactions
          msg._id === messageId ? { ...msg, reactions } : msg
          // ^ This replaces entire reactions array with new one
        ),
      }));
    });
// handle remove message from local state
socket.on("message-deleted", ({deletedMessageId}) => {
  set((state) => ({
    messages: state.messages.filter((msg) => msg._id !== deletedMessageId)
  }));
});

// handle any message sending error
socket.on("message-error", (error) => {
  console.error("message error", error);
});
    // ===== LISTENER 4: When someone starts/stops typing =====
    socket.on("user-typing", ({ userId, conversationId, isTyping }) => {
      /*
      SCENARIO: Alice starts typing in chat "room-123"

      Server sends: {
        userId: "alice-456",
        conversationId: "room-123",
        isTyping: true
      }

      TYPING MAP STRUCTURE:
      typingUsers = Map {
        "room-123" → Set(["alice-456"]),    // Alice typing in room-123
        "room-456" → Set(["bob-789"])       // Bob typing in room-456
      }
      */
      set((state) => {
        // Create copy of current typingUsers Map
        const newTypingUsers = new Map(state.typingUsers);

        // If this conversation doesn't exist in Map, create empty Set
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }

        // Get the Set of users typing in this conversation
        const typingSet = newTypingUsers.get(conversationId);

        // Add or remove user from the Set
        if (isTyping) {
          typingSet.add(userId); // Add user to typing list
        } else {
          typingSet.delete(userId); // Remove user from typing list
        }

        // Return updated Map to Zustand
        return { typingUsers: newTypingUsers };
      });
    });
    socket.on ("user-status", ({userId, isOnline, lastSeen}) => {
        set ((state) => {
            const newOnlineUsers = new Map (state.onlineUsers);
            newOnlineUsers.set(userId, {isOnline,lastSeen});
            return {onlineUsers : newOnlineUsers}
        })
    })
    //emit status check for all users
    const {conversations} = get();
    if (conversations?.data?.length > 0)
    {
        conversations.data.forEach((conv) => {
            const otherUser = conv?.participants.find(
                (p) => p._id !== get().currentUser?._id
            );
            if (otherUser?._id)
            {
                socket.emit("get-user-status", otherUser._id, (status) => {
                    set((state) => {
                        const newOnlineUsers = new Map(state.onlineUsers);
                        newOnlineUsers.set(status.userId, {
                            isOnline: status.isOnline,
                            lastSeen: status.lastSeen
                        })
                        return {onlineUsers: newOnlineUsers}
                    })
                })
            }
        })
    }

  },
 setCurrentUser : (user) => set({currentUser : user}),
 fetchConversations : async () => {
    set ({loading : true, error : null});
    try {
        const {data} = await axiosClient.get("/chat/conversations");
        
        // ✅ SET THE CONVERSATIONS IN STORE
        set({ 
            conversations: data,
            loading: false 
        });
        
        get().initialSocketListeners();
      
        return data;
    }catch(error){
        console.error("❌ Error fetching conversations:", error);
        set({
            error : error?.response?.data?.message || error?.message, 
            loading : false
        });
        return null;
    }
},

fetchMessage : async (conversationId) =>{
    if (!conversationId) return;
    
    console.log("📥 Fetching messages for conversation:", conversationId);
    set ({loading : true, error : null});
    
    try {
        const {data} = await axiosClient.get(`/chat/conversations/${conversationId}/messages`);
      
        const messageArray = data.data || data || [];
        
        // Normalize conversation ID to string for consistency
        const normalizedConvId = conversationId?.toString();
        
        console.log("✅ Fetched messages:", {
          count: messageArray.length,
          conversationId: normalizedConvId,
          firstMessage: messageArray[0]?._id,
          lastMessage: messageArray[messageArray.length - 1]?._id,
          existingMessagesCount: get().messages.length
        });
        
        // Merge with existing messages to preserve any socket-received messages
        // Remove duplicates and sort by createdAt
        set ((state) => {
          const existingMessageIds = new Set(state.messages.map(m => m._id));
          const newMessages = messageArray.filter(m => !existingMessageIds.has(m._id));
          const allMessages = [...state.messages, ...newMessages];
          
          // Sort by createdAt
          const sortedMessages = allMessages.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA - dateB;
          });
          
          // Update conversations to reset unread count for this conversation
          let updatedConversations = state.conversations;
          if (state.conversations?.data) {
            updatedConversations = {
              ...state.conversations,
              data: state.conversations.data.map((conv) => {
                const convId = conv._id?.toString();
                if (convId === normalizedConvId || conv._id?.toString() === normalizedConvId) {
                  return {
                    ...conv,
                    unreadcount: 0  // Reset unread count when opening conversation
                  };
                }
                return conv;
              })
            };
          }
          
          console.log("🔄 Merged messages:", {
            existing: state.messages.length,
            new: newMessages.length,
            total: sortedMessages.length
          });
          
          return {
            messages: sortedMessages,
            currentConversation: normalizedConvId, // Store as string for consistency
            conversations: updatedConversations,
            loading: false
          };
        });
        
        // Mark unread messages as read
        const {markMessagesAsRead} = get();
        markMessagesAsRead();
        
        return messageArray;
    }catch(error){
        console.error("❌ Error fetching messages:", error);
        set ({
            error : error?.response?.data?.message || error?.message,
            loading: false
        });
        return [];
    }
},

  //sending message in real time
  sendMessage: async (formData) => {
  const senderId = formData.get("senderId");
  const receiverId = formData.get("receiverId");
  const media = formData.get("media");
  const content = formData.get("content");
  const messageStatus = formData.get("messageStatus");
   if (!content && !media) {
        throw new Error("Message must have either content or media");
    }
    
    if (content && content.trim() === "") {
        throw new Error("Message content cannot be empty");
    }
  const socket = getSocket();
  const { conversations, currentConversation } = get();

  let conversationId = null;

  // Find existing conversation
  if (conversations?.data?.length > 0) {
    const conversation = conversations.data.find((conv) =>
      conv.participants.some((p) => p._id === senderId) &&
      conv.participants.some((p) => p._id === receiverId)
    );

    if (conversation) {
      conversationId = conversation._id;
      // Normalize to string for consistency
      const normalizedConvId = conversationId?.toString();
      console.log("💬 Setting currentConversation:", normalizedConvId);
      set({ currentConversation: normalizedConvId });
    }
  }
const tempId = `temp-${Date.now()}`;

const optimisticMessage = {
  _id: tempId,
  sender: { _id: senderId },
  receiver: { _id: receiverId },
  conversation: conversationId,
  imageOrVideoUrl:
    media && typeof media !== "string"
      ? URL.createObjectURL(media)
      : null,
  content,
  contentType: media
    ? (media.type?.startsWith("image") ? "image" : "video")
    : "text",
  createdAt: new Date().toISOString(),
  messageStatus,
};
 // 🔹 Update messages in state
  set((state) => ({
    messages: [...state.messages, optimisticMessage],
  }));
  try {
    const {data} = await axiosClient.post("/chat/send-message", formData, {
      headers: {"Content-Type": "multipart/form-data"}
    });
    
    // Handle different response structures
    const messageData = data.data?.message || data.data || data.message || data;
    console.log("✅ Message sent - server response:", messageData);

    // 🔥 CRITICAL FIX: Emit socket event after HTTP success
    // This ensures receiver gets the message in real-time
    if (socket && messageData) {
      const socketMessage = {
        ...messageData,
        sender: messageData.sender?._id || messageData.sender,
        receiver: messageData.receiver?._id || messageData.receiver,
        conversation: messageData.conversation?._id || messageData.conversation
      };
      
      console.log("📤 Emitting send-message via socket:", socketMessage);
      socket.emit("send-message", socketMessage);
    }

    // Replace the temp message with the real message from server
    // Also update conversations list with new lastMessage
    set((state) => {
      const messageConversationId = messageData.conversation?._id || messageData.conversation;
      const normalizedConvId = messageConversationId?.toString();
      
      // Update conversations list with new lastMessage
      let updatedConversations = state.conversations;
      if (state.conversations?.data && normalizedConvId) {
        updatedConversations = {
          ...state.conversations,
          data: state.conversations.data.map((conv) => {
            const convId = conv._id?.toString();
            if (convId === normalizedConvId || conv._id === messageConversationId) {
              return {
                ...conv,
                lastMessage: messageData,
                unreadcount: 0  // Reset unread count when current user sends a message
              };
            }
            return conv;
          })
        };
      }
      
      // Find and replace temp message with real message from server
      const tempIndex = state.messages.findIndex(msg => msg._id === tempId);
      if (tempIndex !== -1) {
        const newMessages = [...state.messages];
        newMessages[tempIndex] = messageData;
        console.log("🔄 Replaced temp message with real message:", messageData._id);
        return { 
          messages: newMessages,
          conversations: updatedConversations
        };
      }
      
      // If temp message not found, check if message already exists
      const exists = state.messages.some(m => m._id === messageData._id);
      if (exists) {
        console.log("✅ Message already exists, updating:", messageData._id);
        // Update existing message
        return {
          messages: state.messages.map(msg => 
            msg._id === messageData._id ? messageData : msg
          ),
          conversations: updatedConversations
        };
      }
      
      // Add message if it doesn't exist
      console.log("➕ Adding new message:", messageData._id);
      return { 
        messages: [...state.messages, messageData],
        conversations: updatedConversations
      };
    });

    return messageData;
  }catch(error)
  {
    console.error(error.message || error);
    set((state) => ({messages : state.messages.map((msg) => msg._id === tempId ? {...msg, messageStatus : "failed"} : msg),
     error : error?.response?.data?.message || error?.message
  }))
  throw error;
  }
},

  //to instantly update our store 
  receiveMessage: (message) => {
    if(!message) return;
    const {currentConversation, currentUser, messages} = get();
    const messageExists = messages.some((msg) => msg._id === message._id);
    if (messageExists) return; //need not receive again same message
    
    const messageConversationId = message.conversation?._id || message.conversation;
    if (messageConversationId === currentConversation || 
        messageConversationId?.toString() === currentConversation?.toString())
    {
      set((state) => ({
        messages: [...state.messages, message]
      }))
    }
      //automatically mark as read
      if(message.receiver?._id === currentUser?._id) get().markMessagesAsRead();
      //update conversation preiveiw and unread Count
      set((state) => {
    const updateConversations = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
            return {
                ...conv,
                lastMessage: message,
                unreadcount: message?.receiver?._id === currentUser?._id
                    ? ((conv.unreadcount || conv.unreadCount || 0) + 1)
                    : (conv.unreadcount || conv.unreadCount || 0)
            }
        }
        return conv;
    });

    return {
        conversations: {
            ...state.conversations,
            data: updateConversations
        }
    };
});
  },
  markMessagesAsRead : async () => {
    const {messages, currentUser} = get ();
    if(!messages.length || !currentUser) return;
    const unreadIds = messages.filter((msg) => msg.messageStatus !== 'read' && msg.receiver?._id === currentUser._id).map((mssg)=>mssg._id).filter(Boolean);
    if(unreadIds.length === 0) return;
    try {
      const {data} = await axiosClient.put("/chats/messages/read", {
        messagesIds : unreadIds
      });
    
      set (state => ({
        messages : state.messages.map (msg =>
          unreadIds.includes(msg._id) ? {...msg, messageStatus : "read"} : msg
        )
      }))
      const socket = getSocket();
      if (socket)
      {
        socket.emit("message-read", {
          messageIds : unreadIds,
          senderId : messages[0].sender._id
        })
      }
    }catch(error)
    {
      console.log("failed to mark as read", error);
    }
  },
  deleteMessage : async (messageId) => {
    try{
      await axiosClient.delete(`/chat/messages/${messageId}`);
      set (state => ({
        messages : state.messages.filter(mssg => mssg._id !== messageId)
      }))
      return true;
    }catch(error)
    {
      console.log('error deleting the message', error);
      set ({error : error.response?.message || error.message});
      return false;
    }
  },
  addReaction : async(messageId, emoji) =>
  {
    const socket = getSocket();
    const {currentUser} = get();
    if (socket && currentUser)
    {
      socket.emit ("add-reaction", {
        messageId, emoji,
        reactionUserId : currentUser._id
      })
    }
  },
  startTyping : (receiverId) => {
    const {currentConversation} = get();
    const socket = getSocket ();
    if(socket && currentConversation)
    {
      socket.emit("typing-start", {
        conversationId : currentConversation,
        receiverId
      })
    }
  },
  stopTyping : (receiverId) => {
    const {currentConversation} = get();
    const socket = getSocket ();
    if(socket && currentConversation)
    {
      socket.emit("typing-start", {
        conversationId : currentConversation,
        receiverId
      })
    }
  },
  isUserTyping : (userId) => {
    const {typingUsers, currentConversation} = get();
    if (!currentConversation || !typingUsers.has(currentConversation) || !userId)
    {return false};
    return typingUsers.get(currentConversation).has(userId);
  },
  isUserOnline : (userId) => {
    if(!userId) return null;
    const {onlineUsers} = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },
  getUserLastSeen : (userId) =>
  {
    if(!userId) return null;
    const {onlineUsers} = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },
  cleanup : () => {
    set({
      conversations : [],
      currentConversation : null,
      messages : [],
      onlineUsers : new Map(),
      typingUser : new Map (),  
    })
  }
}));
