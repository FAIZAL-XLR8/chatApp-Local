import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../../store/theme';
import useUserStore from '../../store/useUserStore';
import useStatusStore from '../../store/statusStore';
import { getSocket } from '../../services/chatService';
import {
  MdAdd,
  MdMoreVert,
  MdSearch,
  MdClose,
  MdEmojiEmotions,
  MdSend,
  MdImage,
  MdOutlinePhotoCamera,
  MdArrowBack
} from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';

const Status = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    statuses,
    loading,
    error,
    fetchStatuses,
    createStatus,
    viewStatus,
    initializeSocket,
    cleanupSocket,
    getUserStatuses,
    getOtherStatuses,
    deleteStatus,
    clearError
  } = useStatusStore();
  const { setTheme } = useThemeStore();

  const [previewContact, setPreviewContact] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [barActive, setBarActive] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [ticker, setTicker] = useState(0); // Force re-render for timestamps
  const fileInputRef = useRef(null);
  const statusTimerRef = useRef(null);
  const deleteMenuRef = useRef(null);
  const sidebarMenuRef = useRef(null);

  // Grouped statuses
  const myStatus = getUserStatuses(user?._id || user?.user?._id);
  const otherStatuses = getOtherStatuses(user?._id || user?.user?._id);

  useEffect(() => {
    fetchStatuses();
    const socket = getSocket();
    initializeSocket(socket);

    // Refresh timestamps every 30 seconds
    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 30000);

    const handleClickOutside = (event) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target)) {
        setShowDeleteMenu(false);
      }
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target)) {
        setShowSidebarMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      cleanupSocket();
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  // Handle status auto-advance and bar animation trigger
  useEffect(() => {
    if (previewContact) {
      setBarActive(false);
      // Small timeout to ensure the bar starts from 0 width
      const trigger = setTimeout(() => {
        setBarActive(true);
      }, 10);

      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);

      statusTimerRef.current = setTimeout(() => {
        handleNextStatus();
      }, 5010);

      return () => {
        clearTimeout(trigger);
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      };
    }
  }, [previewContact, currentStatusIndex]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setShowCreateModal(true);
    }
  };

  const handleCreateStatus = async () => {
    if (!selectedFile && !statusText.trim()) return;

    try {
      const result = await createStatus({
        file: selectedFile,
        content: statusText
      });

      if (result) {
        setShowCreateModal(false);
        setSelectedFile(null);
        setFilePreview(null);
        setStatusText("");
      }
    } catch (err) {
      console.error("Failed to create status:", err);
    }
  };

  const handleNextStatus = () => {
    if (!previewContact) return;
    if (currentStatusIndex < previewContact.statuses.length - 1) {
      setCurrentStatusIndex(prev => prev + 1);
    } else {
      setPreviewContact(null);
      setCurrentStatusIndex(0);
    }
  };

  const handlePrevStatus = () => {
    if (!previewContact) return;
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(prev => prev - 1);
    } else {
      setPreviewContact(null);
      setCurrentStatusIndex(0);
    }
  };

  const openStatus = (contact) => {
    setPreviewContact(contact);
    setCurrentStatusIndex(0);
    setShowDeleteMenu(false);
    const activeStatusId = contact.statuses[0]?.id;
    if (activeStatusId) viewStatus(activeStatusId);
  };

  const handleDeleteStatus = async () => {
    if (!previewContact) return;
    const currentStatus = previewContact.statuses[currentStatusIndex];
    if (!currentStatus) return;

    if (window.confirm("Are you sure you want to delete this status?")) {
      try {
        await deleteStatus(currentStatus.id);
        setShowDeleteMenu(false);

        // If it was the last status, close preview
        if (previewContact.statuses.length === 1) {
          setPreviewContact(null);
        } else {
          // Move to next or previous
          handleNextStatus();
        }
      } catch (err) {
        console.error("Failed to delete status:", err);
      }
    }
  };

  const isDarkMode = theme === 'dark';

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-[#111b21] text-white' : 'bg-white text-black'}`}>
      {/* Sidebar */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col h-full`}>
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <MdArrowBack
              className="text-2xl cursor-pointer opacity-70 hover:opacity-100"
              onClick={() => navigate('/')}
            />
            <h1 className="text-xl font-bold">Status</h1>
          </div>
          <div className="flex gap-4 items-center">
            <MdOutlinePhotoCamera
              className="text-2xl cursor-pointer opacity-70 hover:opacity-100"
              onClick={() => fileInputRef.current.click()}
            />
            <div className="relative">
              <MdMoreVert
                className="text-2xl cursor-pointer opacity-70 hover:opacity-100"
                onClick={() => setShowSidebarMenu(!showSidebarMenu)}
              />
              {showSidebarMenu && (
                <div
                  ref={sidebarMenuRef}
                  className={`absolute right-0 top-full mt-2 w-48 py-2 rounded-lg shadow-2xl z-50 ${isDarkMode ? 'bg-[#233138] text-white' : 'bg-white text-black'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                >
                  <button
                    className={`w-full text-left px-4 py-3 hover:${isDarkMode ? 'bg-[#182229]' : 'bg-[#f5f6f6]'} transition-colors flex items-center justify-between`}
                    onClick={() => {
                      setTheme(isDarkMode ? 'light' : 'dark');
                      setShowSidebarMenu(false);
                    }}
                  >
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-[#00a884]' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isDarkMode ? 'left-4.5' : 'left-0.5'}`}></div>
                    </div>
                  </button>
                  <div className={`h-[1px] ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} my-1`}></div>
                  <button className={`w-full text-left px-4 py-3 hover:${isDarkMode ? 'bg-[#182229]' : 'bg-[#f5f6f6]'} transition-colors text-sm`}>
                    Status Privacy
                  </button>
                  <button className={`w-full text-left px-4 py-3 hover:${isDarkMode ? 'bg-[#182229]' : 'bg-[#f5f6f6]'} transition-colors text-sm text-red-500`}>
                    Muted Updates
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className={`flex items-center gap-3 p-2 rounded-lg ${isDarkMode ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
            <MdSearch className="text-xl opacity-50" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="bg-transparent border-none outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* My Status */}
          <div className={`flex items-center gap-4 p-4 cursor-pointer hover:${isDarkMode ? 'bg-[#202c33]' : 'bg-[#f5f6f6]'}`}
            onClick={() => myStatus ? openStatus(myStatus) : fileInputRef.current.click()}>
            <div className="relative">
              <img
                src={user?.user?.profilePicture || user?.profilePicture || "/default-avatar.png"}
                alt="My Status"
                className={`w-12 h-12 rounded-full border-2 ${myStatus ? 'border-green-500' : 'border-gray-400'} p-[2px] object-cover`}
                onError={(e) => e.target.src = "/default-avatar.png"}
              />
              {!myStatus && (
                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-[#111b21] w-5 h-5 flex items-center justify-center">
                  <MdAdd className="text-white text-xs" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">My Status</h3>
              <p className="text-sm opacity-60">
                {myStatus ? "Tap to view updates" : "Tap to add status update"}
              </p>
            </div>
          </div>

          <div className="px-4 py-2 opacity-60 text-sm font-semibold uppercase tracking-wider">
            Recent updates
          </div>

          {loading ? (
            <div className="flex justify-center p-4">Loading...</div>
          ) : (
            otherStatuses && otherStatuses.length > 0 ? (
              otherStatuses.map((contact) => {
                return (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-4 p-4 cursor-pointer hover:${isDarkMode ? 'bg-[#202c33]' : 'bg-[#f5f6f6]'}`}
                    onClick={() => openStatus(contact)}
                  >
                    <img
                      src={contact.avatar || "/default-avatar.png"}
                      alt={contact.name}
                      className="w-12 h-12 rounded-full border-2 border-green-500 p-[2px] object-cover"
                      onError={(e) => e.target.src = "/default-avatar.png"}
                    />
                    <div className="flex-1 border-b pb-2 border-gray-700/30">
                      <h3 className="font-semibold">{contact.name}</h3>
                      <p className="text-sm opacity-60">
                        {contact.statuses?.[contact.statuses.length - 1]?.timestamp
                          ? formatDistanceToNow(new Date(contact.statuses[contact.statuses.length - 1].timestamp), { addSuffix: true })
                          : "Just now"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center opacity-50 text-sm italic">No recent updates</div>
            )
          )}
        </div>

        <input
          type="file"
          hidden
          ref={fileInputRef}
          accept="image/*,video/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Main Preview Area */}
      <div className={`hidden md:flex flex-1 ${isDarkMode ? 'bg-[#222e35]' : 'bg-[#f0f2f5]'} relative h-full`}>
        {previewContact ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black h-full w-full">
            {/* Status Header */}
            <div className="absolute top-0 w-full p-6 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent z-30">
              <MdArrowBack
                className="text-2xl cursor-pointer text-white hover:scale-110 transition-transform"
                onClick={() => setPreviewContact(null)}
              />
              <img
                src={previewContact.avatar || "/default-avatar.png"}
                alt=""
                className="w-10 h-10 rounded-full border border-white/20"
              />
              <div>
                <h4 className="text-white font-semibold">{previewContact.name}</h4>
                <p className="text-xs text-white/70">
                  {formatDistanceToNow(new Date(previewContact.statuses[currentStatusIndex].timestamp), { addSuffix: true })}
                </p>
              </div>
              <div className="ml-auto flex gap-4 text-white items-center relative">
                {previewContact.id === (user?._id || user?.user?._id) && (
                  <div className="relative">
                    <MdMoreVert
                      className="text-2xl cursor-pointer opacity-70 hover:opacity-100"
                      onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    />
                    {showDeleteMenu && (
                      <div
                        ref={deleteMenuRef}
                        className={`absolute right-0 top-full mt-2 w-32 py-2 rounded shadow-xl z-50 ${isDarkMode ? 'bg-[#233138] text-white' : 'bg-white text-black'}`}
                      >
                        <button
                          className={`w-full text-left px-4 py-2 hover:${isDarkMode ? 'bg-[#182229]' : 'bg-[#f5f6f6]'} text-red-500`}
                          onClick={handleDeleteStatus}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <MdClose className="text-2xl cursor-pointer opacity-70 hover:opacity-100" onClick={() => setPreviewContact(null)} />
              </div>
            </div>

            {/* Progress Bars */}
            <div className="absolute top-4 w-[95%] flex gap-1.5 z-40">
              {previewContact.statuses.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white linear ${i < currentStatusIndex ? 'w-full duration-0' : i === currentStatusIndex ? (barActive ? 'w-full duration-[5000ms]' : 'w-0 duration-0') : 'w-0 duration-0'} transition-all`}
                  ></div>
                </div>
              ))}
            </div>

            {/* Media Rendering */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden z-10 bg-black">
              {previewContact.statuses[currentStatusIndex].contentType === 'text' ? (
                <div className={`w-full h-full flex items-center justify-center p-12 text-center text-4xl font-medium ${isDarkMode ? 'bg-[#1e2a30]' : 'bg-[#e9edef]'}`}>
                  {previewContact.statuses[currentStatusIndex].content}
                </div>
              ) : previewContact.statuses[currentStatusIndex].contentType?.startsWith('video') ? (
                <video
                  key={previewContact.statuses[currentStatusIndex].id}
                  src={previewContact.statuses[currentStatusIndex].media}
                  autoPlay
                  onEnded={handleNextStatus}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  key={previewContact.statuses[currentStatusIndex].id}
                  src={previewContact.statuses[currentStatusIndex].media}
                  alt="Status"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    console.error("Image failed to load:", e.target.src);
                    // If media is empty or invalid, show text-friendly fallback
                    if (!previewContact.statuses[currentStatusIndex].media) {
                      e.target.style.display = 'none';
                    }
                  }}
                />
              )}
              {/* Overlay Content (Caption for media) */}
              {previewContact.statuses[currentStatusIndex].contentType !== 'text' && previewContact.statuses[currentStatusIndex].content && (
                <div className="absolute bottom-0 left-0 w-full p-10 text-center text-white bg-gradient-to-t from-black/80 to-transparent z-20">
                  <p className="text-lg">{previewContact.statuses[currentStatusIndex].content}</p>
                </div>
              )}
            </div>

            {/* Navigation Areas */}
            <div className="absolute left-0 w-1/4 h-full cursor-pointer z-20" onClick={handlePrevStatus}></div>
            <div className="absolute right-0 w-1/4 h-full cursor-pointer z-20" onClick={handleNextStatus}></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50 space-y-4">
            <div className="w-24 h-24 bg-gray-400 rounded-full flex items-center justify-center shadow-lg">
              <MdOutlinePhotoCamera className="text-4xl text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-light">Click on a contact to view their status updates</h2>
              <p className="text-sm mt-2">Statuses disappear after 24 hours</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#111b21]">
          <div className="p-4 flex items-center gap-4">
            <MdClose
              className="text-2xl cursor-pointer text-white"
              onClick={() => { setShowCreateModal(false); setFilePreview(null); }}
            />
            <span className="text-white font-semibold">Preview Status</span>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            {selectedFile?.type.startsWith('video') ? (
              <video src={filePreview} controls className="max-h-[70vh]" />
            ) : (
              <img src={filePreview} alt="Preview" className="max-h-[70vh] object-contain" />
            )}
          </div>

          <div className="p-4 bg-[#202c33]/50 flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-[#2a3942] p-3 rounded-xl">
              <MdEmojiEmotions className="text-2xl text-gray-400" />
              <input
                type="text"
                placeholder="Add a caption..."
                className="bg-transparent border-none outline-none flex-1 text-white"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-white/70">
                <MdImage className="text-2xl cursor-pointer" />
                <span className="text-sm">Status (Contacts)</span>
              </div>
              <button
                onClick={handleCreateStatus}
                className="bg-[#00a884] p-3 rounded-full text-white hover:bg-[#06cf9c] transition-colors"
                disabled={loading}
              >
                {loading ? "..." : <MdSend className="text-2xl" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Status;
