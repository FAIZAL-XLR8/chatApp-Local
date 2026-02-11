import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { FaCheck, FaCheckDouble, FaTrash, FaCopy } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";

const MessageBubble = ({ message, theme, currentUser, deleteMessage }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const optionRef = useRef(null);

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
    // Prevent deletion of temporary messages (not yet saved to database)
    if (message._id?.toString().startsWith('temp-')) {
      alert("Cannot delete message - still sending...");
      setShowOptions(false);
      return;
    }

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

  return (
    <div className={`flex mb-1 ${isUserMessage ? 'justify-end' : 'justify-start'} px-2`}>
      <div className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'} max-w-[70%] md:max-w-[65%]`}>
        {/* Message bubble */}
        <div
          className={`relative group px-3 py-1.5 ${showOptions ? "z-50" : ""} ${isUserMessage
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

          {message.contentType === "text" && (
            <p className="break-words text-sm leading-relaxed">{message.content}</p>
          )}

          {message.contentType === "image" && (
            <div className="relative group">
              <img
                src={message.imageOrVideoUrl}
                alt="message"
                className="rounded-lg max-w-full max-h-96 object-contain cursor-pointer"
                onClick={() => setShowFullscreenImage(true)}
              />
              {/* Expand icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all rounded-lg pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
              </div>
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
                }}
                className={`p-1.5 rounded-full ${theme === "dark"
                  ? "bg-gray-700/80 hover:bg-gray-600"
                  : "bg-gray-200/80 hover:bg-gray-300"
                  } backdrop-blur-sm`}
              >
                <BsThreeDots size={14} />
              </button>

              {showOptions && (
                <div
                  ref={optionRef}
                  className={`absolute ${isUserMessage ? 'left-10' : 'right-10'} top-0 w-40 rounded-lg shadow-lg z-50 ${theme === "dark" ? "bg-[#233138] border border-gray-700" : "bg-white border border-gray-200"
                    }`}
                >
                  {/* Copy option */}
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-opacity-80 ${theme === "dark"
                      ? "text-gray-200 hover:bg-gray-700"
                      : "text-gray-700 hover:bg-gray-100"
                      } rounded-t-lg transition-colors`}
                  >
                    <FaCopy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>

                  {/* Delete option (only for user's own messages) */}
                  {isUserMessage && (
                    <button
                      onClick={handleDelete}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-opacity-80 ${theme === "dark"
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
      </div>

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowFullscreenImage(false)}
        >
          <button
            onClick={() => setShowFullscreenImage(false)}
            className="absolute top-4 right-4 text-white bg-gray-800/50 hover:bg-gray-800 rounded-full p-3 z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={message.imageOrVideoUrl}
            alt="fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
