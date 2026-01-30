import React, { useEffect, useRef, useState } from "react";
import {getSocket} from "../../services/chatService"
import { useChatStore } from "../../store/chatStore";
import useThemeStore from "../../store/theme"
import useUserStore from "../../store/useUserStore";
import whatsappImage from "../../../image/images/whatsapp_image.png"
import { FaLock, FaArrowLeft , FaVideo, FaEllipsisV, FaSmile ,FaPaperPlane, FaTimes, FaImage , FaPaperclip} from "react-icons/fa";
const  isValidate = (date) => {
 return date instanceof Date && !isNaN(date)

}
import {isToday, isYesterday, format} from "date-fns" 
import MessageBubble from "./MessageBubble";
import EmojiPicker from 'emoji-picker-react';
const ChatWindow = ({selectedContact, setSelectedContact,}) => {
  // =======================
  // UI STATE (re-render)
  // =======================
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // =======================
  // REFS (no re-render)
  // =======================
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const fetchingRef = useRef(false);
  const lastFetchedConversationRef = useRef(null);

  // =======================
  // GLOBAL STATE
  // =======================
  const { conversations, sendMessage , loading, receiveMessage, setCurrentUser, fetchConversations, fetchMessage, markMessagesAsRead, currentConversation,deleteMessage, addReaction, startTyping, stopTyping, isUserTyping, isUserOnline, getUserLastSeen, cleanup, messages} = useChatStore();
  const { user } = useUserStore();
  const { theme } = useThemeStore();


  //get online status
  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);
  useEffect (()=>{
      if(selectedContact?._id && conversations?.data?.length > 0)
      {
      const conversation = conversations?.data?.find((conv) => conv.participants.some((participant)=>participant._id === selectedContact?._id));
      if(conversation?._id)
      {
        // Only fetch if we don't already have messages for this conversation
        // This prevents unnecessary HTTP requests when socket messages are working
        const conversationId = conversation._id?.toString();
        const normalizedCurrentConv = currentConversation?.toString();
        
        // Prevent multiple fetches for the same conversation
        if (lastFetchedConversationRef.current === conversationId) {
          console.log("⏭️ Already fetched messages for this conversation - skipping HTTP request");
          return;
        }
        
        // Reset fetch tracking if conversation changed
        if (lastFetchedConversationRef.current && lastFetchedConversationRef.current !== conversationId) {
          lastFetchedConversationRef.current = null;
        }
        
        if (normalizedCurrentConv !== conversationId && !fetchingRef.current && lastFetchedConversationRef.current !== conversationId) {
          console.log("🔄 Opening conversation - fetching messages via HTTP (one-time)");
          fetchingRef.current = true;
          lastFetchedConversationRef.current = conversationId;
          
          fetchMessage(conversation?._id).finally(() => {
            fetchingRef.current = false;
          });
        } else if (normalizedCurrentConv === conversationId) {
          console.log("✅ Already have messages for this conversation - using socket messages only");
        } else if (lastFetchedConversationRef.current === conversationId) {
          console.log("⏭️ Already fetched this conversation - skipping HTTP request");
        }
      }
    }
  },[selectedContact, conversations, currentConversation, fetchMessage])
  useEffect (()=>{
    fetchConversations();
  }, [])
  const socket = getSocket();

  // =======================
  // DEBUG: Log message changes
  // =======================
  useEffect(() => {
    console.log("📊 Messages changed:", {
      count: messages?.length || 0,
      currentConversation,
      messages: messages?.map(m => ({
        id: m._id,
        conversation: m.conversation?._id || m.conversation,
        content: m.content?.substring(0, 30)
      }))
    });
  }, [messages, currentConversation]);

  // =======================
  // AUTO SCROLL
  // =======================
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);
useEffect(() => {
  if (!message || !selectedContact?._id) return;


  startTyping(selectedContact._id);

  // Clear poorane  stop-typing timer
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  // Set naye stop-typing timer
  typingTimeoutRef.current = setTimeout(() => {
    stopTyping(selectedContact._id);
  }, 2000);

  // Cleanup
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
}, [message, selectedContact, startTyping, stopTyping]);

  // =======================
  // CLICK OUTSIDE EMOJI
  // =======================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
const displayName = selectedContact?.userName || selectedContact?.phoneNumber ||  selectedContact?.email || selectedContact?._id ;
  // =======================
  // TYPING HANDLER
  // =======================
  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!socket || !currentConversation) return;

    socket.emit("user_typing", {
      conversationId: currentConversation,
      isTyping: true,
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("user_typing", {
        conversationId: selectedContact._id,
        isTyping: false,
      });
    }, 1500);
  };
  const handleReaction = (messageId, emoji) =>
  {
    addReaction(messageId, emoji);
  }
  // =======================
  // FILE SELECT
  // =======================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
     setShowFileMenu(false);
    if(file.type.startsWith('image/'))setFilePreview(URL.createObjectURL(file));
   
  };

  // =======================
  // SEND MESSAGE
  // =======================
  const handleSendMessage = async () => {
    if(!selectedContact) return;
    if (!message.trim() && !selectedFile) return;
try{
 
   const formData = new FormData();

    formData.append("content", message);
    formData.append("senderId", user?.user?._id);
    formData.append("receiverId", selectedContact?._id);
    const status = online ? "delivered" : "send";
    if (selectedFile) formData.append("media", selectedFile, selectedFile.name);

    await sendMessage(formData);

    setMessage("");
    setSelectedFile(null);
    setFilePreview(null);
    setShowFileMenu(false);
}catch(error){console.error(error.message);}
   
  };
const renderDateSeperator = (date) => {
  if(!isValidate(date)) return null;
  let dateString;
  if(isToday(date))
  {
    dateString = "Today";
  }
  else if (isYesterday(date))
  {
    dateString = "Yesterday";
  }
  else{
    dateString = format(date, "EEEE, MMMM d");
  }

  return (
    <div className="flex justify-center my-4">
      <span
        className={`px-4 py-2 rounded-full text-sm ${
          theme === "dark"
            ? "bg-gray-700 text-gray-300"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        {dateString}
      </span>
    </div>
  );
};
// Group messages
const groupedMessages = Array.isArray(messages)
  ? messages.reduce((acc, message) => {
      if (!message.createdAt) return acc;

      const date = new Date(message.createdAt);

      if (isValidate(date)) {
        const dateString = format(date, "yyyy-MM-dd");

        if (!acc[dateString]) {
          acc[dateString] = [];
        }

        acc[dateString].push(message);
      } else {
        console.error("Invalid date for message:", message);
      }

      return acc;
    }, {})
  : {};

if (!selectedContact) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center mx-auto h-screen text-center">
      <div className="max-w-md">
        <img
          src={whatsappImage}
          alt="chat-app"
          className="w-full h-auto"
        />

        <h2
          className={`text-3xl font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          Select a conversation to start chatting
        </h2>

        <p
          className={`${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          } mb-6`}
        >
          Choose a contact from the list on the left to begin messaging
        </p>

        <p
          className={`${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          } text-sm mt-8 flex items-center justify-center gap-2`}
        >
          <FaLock className="h-4 w-4" />
          Your personal messages are end-to-end encrypted
        </p>
      </div>
    </div>
  );
}
// Add this right before the return statement (after the !selectedContact check)


 return (
    <div className="flex-1 h-screen w-full flex flex-col">
      {/* Header */}
      <div
        className={`p-4 ${
          theme === "dark"
            ? "bg-[#303030] text-white"
            : "bg-[rgb(239,242,245)] text-gray-600"
        } flex items-center`}
      >
        <button
          className="mr-2 focus:outline-none"
          onClick={() => setSelectedContact(null)}
        >
          <FaArrowLeft className="h-6 w-6" />
        </button>

        <img
          src={selectedContact?.profilePicture}
          alt={selectedContact?.username}
          className="w-10 h-10 rounded-full"
        />

        <div className="ml-3 flex-grow">
          <h2 className="font-semibold text-start">
            {displayName}
          </h2>

          {isTyping ? (
  <div>Typing...</div>
) : (
  <p
    className={`text-sm ${
      theme === "dark" ? "text-gray-400" : "text-gray-500"
    }`}
  >
    {online
      ? "Online"
      : lastSeen
      ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
      : "Offline"}
  </p>
)}

        </div>
        <div className="flex items-center space-x-4">
  <button className="focus:outline-none">
    <FaVideo className="h-5 w-5"/>
  </button>
  <button className="focus:outline-none">
    <FaEllipsisV className="h-5 w-5"/>
  </button>
</div>
      </div>
      <div className={`flex-1 p-2 md:p-4 overflow-y-auto ${theme === 'dark' ? "bg-[#0b141a]" : "bg-[rgb(239,242,245)]"}`}>
       {/* Debug info - remove in production */}
       {process.env.NODE_ENV === 'development' && (
         <div className="text-xs text-gray-500 p-2">
           Messages: {messages?.length || 0} | Current Conv: {currentConversation || 'none'}
         </div>
       )}
       
       {/* Since multiple dom elements/html elements cant be rendered at once 
    React fragment doesnt adds extra div it retunsa all the DOM elements within this at once  */}
    {/* Below Object.entried converts objects into vector of [key, val] we are using this because we cant iterate over obkects with .map */}
  {Object.entries(groupedMessages).map(([date, msgs]) => (
   
    <React.Fragment key={date}>
      {renderDateSeperator(new Date(date))}
      {msgs.filter((msg) => {
        // Normalize conversation IDs for comparison
        const msgConvId = msg.conversation?._id?.toString() || msg.conversation?.toString();
        const currentConvId = currentConversation?.toString();
        
        // Filter by currentConversation to ensure messages match the active conversation
        const matches = msgConvId === currentConvId || 
                       msg.conversation === currentConversation || 
                       msg.conversation?._id === currentConversation;
        
        if (!matches && process.env.NODE_ENV === 'development') {
          console.log('🚫 Filtered out message:', {
            msgId: msg._id,
            msgConvId,
            currentConvId,
            msgConversation: msg.conversation
          });
        }
        
        return matches;
      }).map((msg) => (
  <MessageBubble
    key={msg._id || msg.tempId}
    message={msg}
    theme={theme}
    currentUser={user}
    onReact={handleReaction}
    deleteMessage={deleteMessage}
  />
))}
    </React.Fragment>
  ))}
  <div ref={messageEndRef}/> 
  </div>
  {/* above div scrolls down to the newest message automatically */}
  {filePreview && (
  <div className="relative p-2">
    <img
      src={filePreview}
      alt="file-preview"
      className="w-80 object-cover rounded shadow-lg mx-auto"
    />

    <button
      onClick={() => {
        setSelectedFile(null);
        setFilePreview(null);
      }}
      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
    >
      <FaTimes className="h-4 w-4" />
    </button>
  </div>
)}
<div
  className={`p-4 ${
    theme === "dark" ? "bg-[#303430]" : "bg-white"
  } flex items-center space-x-3 relative`}
>
  {/* Emoji button */}
  <button
    className="focus:outline-none"
    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
  >
    <FaSmile
      className={`h-6 w-6 ${
        theme === "dark" ? "text-gray-400" : "text-gray-500"
      }`}
    />
  </button>

  {/* File button */}
  <div className="relative">
    <button
      className="focus:outline-none"
      onClick={() => setShowFileMenu(!showFileMenu)}
    >
      <FaPaperclip
        className={`h-6 w-6 ${
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        }`}
      />
    </button>

    {showFileMenu && (
      <div
        className={`absolute bottom-full left-0 mb-2 ${
          theme === "dark" ? "bg-gray-700" : "bg-white"
        } rounded-lg shadow-lg`}
      >
        <input
          type="file"
          ref={fileInputRef}
          
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current.click()}
          className="flex items-center px-4 py-2 w-full hover:bg-gray-100"
        >
          <FaImage className="mr-2" />
          Image / video
        </button>
      </div>
    )}
  </div>

  {/* Emoji picker */}
     {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  setMessage((prev) => prev + emojiObject.emoji);
                }}
                theme={theme}
              />
            </div>
          )}
  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
    onKeyPress={(e)=>{
      if(e.key === 'Enter')
      {
        handleSendMessage();
      }
    }}
    placeholder="Type a message"
    className={`flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500
    ${
      theme === "dark"
        ? "bg-gray-700 text-white border-gray-600"
        : "bg-white text-black border-gray-300"
    }
  `}
  />
  <button onClick={handleSendMessage}
  className="focus:outline-none">
     <FaPaperPlane className="h-6 w-6 text-green-500" />
  </button>
</div>
</div>
    
  );
 
};

export default ChatWindow;
