import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { FaCheck, FaCheckDouble, FaTrash, FaCopy, FaSmile } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';

const MessageBubble = ({ message, theme, currentUser, deleteMessage, onReact }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const optionRef = useRef(null);
  const reactionRef = useRef(null);

  if (!message) return null;

  // Handle different currentUser structures
  const currentUserId = currentUser?.user?._id || currentUser?._id;
  const senderId = message.sender?._id || message.sender;
  const isUserMessage = senderId === currentUserId;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionRef.current && !optionRef.current.contains(e.target)) {
        setShowOptions(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusIcon = () => {
    const status = message.messageStatus?.toLowerCase();

    if (status === "sent") return <FaCheck size={11} />;
    if (status === "delivered") return <FaCheckDouble size={11} />;
    if (status === "read")
      return <FaCheckDouble size={11} className="text-blue-400" />;

    return null;
  };

  const handleDelete = () => {
    if (window.confirm("Delete this message?")) {
      deleteMessage(message._id);
      setShowOptions(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = message.content || message.imageOrVideoUrl || '';
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setShowOptions(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReactionClick = (emojiObject) => {
    if (onReact && message._id) {
      onReact(message._id, emojiObject.emoji);
      setShowReactionPicker(false);
    }
  };

  // Quick reaction emojis
  const quickReactions = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

  const handleQuickReaction = (emoji) => {
    if (onReact && message._id) {
      onReact(message._id, emoji);
      setShowReactionPicker(false);
    }
  };

  // Get reactions for this message
  const reactions = message.reactions || [];
  const reactionCounts = reactions.reduce((acc, reaction) => {
    // Handle both object format {user, emoji} and string format
    const emoji = typeof reaction === 'string' ? reaction : (reaction.emoji || reaction);
    if (emoji) {
      acc[emoji] = (acc[emoji] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className={`flex mb-1 ${isUserMessage ? 'justify-end' : 'justify-start'} px-2`}>
      <div className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'} max-w-[70%] md:max-w-[65%]`}>
        {/* Message bubble */}
        <div
          className={`relative group px-3 py-1.5 ${
            isUserMessage
              ? theme === "dark"
                ? "bg-[#005c4b] text-white"
                : "bg-[#d9fdd3] text-gray-900"
              : theme === "dark"
              ? "bg-[#202c33] text-white"
              : "bg-white text-gray-900 shadow-sm"
          }`}
          style={{
            borderRadius: isUserMessage 
              ? '7.5px 7.5px 0 7.5px' 
              : '7.5px 7.5px 7.5px 0'
          }}
        >
          {/* Message content */}
          {message.contentType === "text" && (
            <p className="break-words text-sm leading-relaxed">{message.content}</p>
          )}

          {message.contentType === "image" && (
            <div>
              <img
                src={message.imageOrVideoUrl}
                alt="message"
                className="rounded-lg max-w-full max-h-96 object-contain"
              />
              {message.content && (
                <p className="mt-2 text-sm break-words">{message.content}</p>
              )}
            </div>
          )}

          {message.contentType === "video" && (
            <div>
              <video
                src={message.imageOrVideoUrl}
                controls
                className="rounded-lg max-w-full max-h-96"
              />
              {message.content && (
                <p className="mt-2 text-sm break-words">{message.content}</p>
              )}
            </div>
          )}

          {/* Timestamp & status */}
          <div className={`flex items-center gap-1 mt-1 text-[11px] opacity-70 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
            <span>{format(new Date(message.createdAt), "HH:mm")}</span>
            {isUserMessage && (
              <span className="ml-1">{getStatusIcon()}</span>
            )}
          </div>

          {/* Options menu - always visible on mobile, hover on desktop */}
          <div className={`absolute ${isUserMessage ? '-left-10' : '-right-10'} top-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
            <div className="relative">
              <button
                onClick={() => {
                  setShowOptions(!showOptions);
                  setShowReactionPicker(false);
                }}
                className={`p-1.5 rounded-full ${
                  theme === "dark" 
                    ? "bg-gray-700/80 hover:bg-gray-600" 
                    : "bg-gray-200/80 hover:bg-gray-300"
                } backdrop-blur-sm`}
              >
                <BsThreeDots size={14} />
              </button>

              {showOptions && (
                <div
                  ref={optionRef}
                  className={`absolute ${isUserMessage ? 'left-10' : 'right-10'} top-0 w-40 rounded-lg shadow-lg z-50 ${
                    theme === "dark" ? "bg-[#233138] border border-gray-700" : "bg-white border border-gray-200"
                  }`}
                >
                  {/* Copy option */}
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-opacity-80 ${
                      theme === "dark" 
                        ? "text-gray-200 hover:bg-gray-700" 
                        : "text-gray-700 hover:bg-gray-100"
                    } rounded-t-lg transition-colors`}
                  >
                    <FaCopy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>

                  {/* React option */}
                  <button
                    onClick={() => {
                      setShowReactionPicker(!showReactionPicker);
                      setShowOptions(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-opacity-80 ${
                      theme === "dark" 
                        ? "text-gray-200 hover:bg-gray-700" 
                        : "text-gray-700 hover:bg-gray-100"
                    } transition-colors`}
                  >
                    <FaSmile size={12} />
                    React
                  </button>

                  {/* Delete option (only for user's own messages) */}
                  {isUserMessage && (
                    <button
                      onClick={handleDelete}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-opacity-80 ${
                        theme === "dark" 
                          ? "hover:bg-red-900/30" 
                          : "hover:bg-red-50"
                      } rounded-b-lg transition-colors`}
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <div
                key={emoji}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  theme === "dark" 
                    ? "bg-gray-700/50 text-gray-200" 
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && <span>{count}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        {showReactionPicker && (
          <div
            ref={reactionRef}
            className={`absolute ${isUserMessage ? 'right-0' : 'left-0'} bottom-full mb-2 z-50 ${
              theme === "dark" ? "bg-[#233138]" : "bg-white"
            } rounded-lg shadow-xl border ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            } p-2`}
          >
            {/* Quick reactions */}
            <div className="flex gap-2 mb-2">
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {/* Full emoji picker */}
            <div className="max-h-64 overflow-y-auto">
              <EmojiPicker
                onEmojiClick={handleReactionClick}
                theme={theme === "dark" ? "dark" : "light"}
                width={280}
                height={250}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
