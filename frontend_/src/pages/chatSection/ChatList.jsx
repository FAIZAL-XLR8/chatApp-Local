import React, { useState, useEffect } from 'react'
import useLayoutStore from '../../store/layOutStore';
import useThemeStore from '../../store/theme';
import useUserStore from '../../store/useUserStore';
import { FaPlus, FaSearch, FaUserCircle } from 'react-icons/fa';
import { motion } from "framer-motion";

const ChatList = ({ contacts }) => {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );

  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  
  // State to trigger re-render for real-time timestamps
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Update current time every minute for real-time timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(interval);
  }, []);
  
 
  
  const [searchTerms, setSearchTerms] = useState("");

  const filteredContacts = contacts?.filter((contact) => {
    // Get display name (userName, phoneNumber, or _id)
    const displayName = contact?.userName || contact?.phoneNumber ||  contact?.email || contact?._id ;
    
    return displayName
      .toLowerCase()
      .includes(searchTerms.toLowerCase());
  });

  // Helper function to get display name
  const getDisplayName = (contact) => {
    if (contact?.userName) return contact.userName;
    if (contact?.phoneNumber) {
      return `${contact.phoneSuffix || ''} ${contact.phoneNumber}`.trim();
    }
    if(contact?.email) return contact.email;
    return contact?._id || 'Unknown User';
  };

  // Helper function to format timestamp (real-time)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date(currentTime); // Use currentTime state for real-time updates
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`w-full border-r h-screen ${
        theme === "dark"
          ? "bg-[rgb(17,27,33)] border-gray-600"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 flex justify-between items-center ${
          theme === "dark" ? "text-white" : "text-gray-800"
        }`}
      >
        <h2 className="text-xl font-semibold">Chats</h2>

        <button className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors">
          <FaPlus />
        </button>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <FaSearch
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          />

          <input
            type="text"
            placeholder="Search or start new chat"
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              theme === "dark"
                ? "bg-gray-800 text-white border-gray-700 placeholder-gray-500"
                : "bg-gray-100 text-black border-gray-200 placeholder-gray-400"
            }`}
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        </div>
      </div>

      <div
        className={`overflow-y-auto h-[calc(100vh-120px)] ${
          theme === "dark"
            ? "bg-[rgb(17,27,33)]"
            : "bg-white"
        }`}
      >
        {filteredContacts && filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
           
           
           // Check if the last message was received by the current user
           const lastMessageReceiverId = contact?.conversation?.lastMessage?.receiver || 
                                         contact?.conversation?.lastMessage?.receiverId;
           
           // Show unread count if receiver is the current user AND there are unread messages
           const hasUnreadMessages = contact?.conversation && 
                                     contact?.conversation?.unreadcount > 0 && 
                                     lastMessageReceiverId === user?._id;
           
           return (
          
            <motion.div
              key={contact?._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedContact(contact)}
              className={`p-4 flex items-center cursor-pointer transition-all duration-200 border-b ${
                theme === "dark"
                  ? selectedContact?._id === contact?._id
                    ? "bg-gray-700 border-gray-600"
                    : "hover:bg-gray-800 border-gray-700"
                  : selectedContact?._id === contact?._id
                  ? "bg-gray-100 border-gray-200"
                  : "hover:bg-gray-50 border-gray-100"
              }`}
            >
            {/* Profile Picture */}
            {contact?.profilePicture && contact.profilePicture.trim() !== '' ? (
              <img
                src={contact.profilePicture}
                alt={getDisplayName(contact)}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <FaUserCircle
                  className={`w-8 h-8 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`}
                />
              </div>
            )}

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h2
                    className={`font-semibold ${
                      theme === "dark" ? "text-white" : "text-black"
                    }`}
                  >
                    {getDisplayName(contact)}
                  </h2>
                  
                  {/* Timestamp - Real-time */}
                  {contact?.conversation?.lastMessage && (
                    <span className={`text-xs ml-2 flex-shrink-0 ${
                      hasUnreadMessages 
                        ? 'text-green-500 font-semibold' 
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(contact?.conversation?.lastMessage?.createdAt)}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  {/* Last message preview */}
                  <p className={`text-sm truncate pr-2 ${
                    hasUnreadMessages 
                      ? theme === 'dark' ? 'text-white font-semibold' : 'text-black font-semibold'
                      : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {contact?.conversation?.lastMessage?.content || contact?.about || "No messages yet"}
                  </p>

                  {/* Unread count badge - Only shows when receiver is current user */}
                  {hasUnreadMessages && (
                    <span className="text-xs font-bold min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-green-500 text-white rounded-full flex-shrink-0">
                      {contact?.conversation?.unreadcount}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )})
        ) : (
          <div className={`p-8 text-center ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            <p className="text-lg">
              {searchTerms ? "No contacts found" : "No contacts yet"}
            </p>
            <p className="text-sm mt-2">
              {searchTerms ? "Try a different search term" : "Start a new conversation"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;