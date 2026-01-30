import { io } from 'socket.io-client';
import useUserState from '../store/useUserStore';
import { useChatStore } from '../store/chatStore';

let socket = null;

export const initialiseSocket = () => {
  if(socket) return socket;
  const BACKEND_URL = import.meta.env.VITE_API_URL;

  socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    //Polling repeatedly sends HTTP requests to check for updates, while WebSocket maintains a persistent connection allowing real-time, bi-directional communication.
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected with id:", socket.id);
    
    // 🔥 CRITICAL: Get user dynamically when socket connects (not at initialization)
    // This ensures we have the latest user data
    const user = useUserState.getState().user;
    const userId = user?._id || user?.user?._id;
    
    // 🔥 CRITICAL: Emit user-connected to join user to their room
    // This MUST happen so backend can emit messages to this user
    if (userId) {
      console.log("👤 Emitting user-connected for user:", userId);
      socket.emit("user-connected", userId);
    } else {
      console.warn("⚠️ Cannot emit user-connected - user._id is missing. User object:", user);
    }
    
    // Initialize socket listeners immediately when connected
    // Use a small delay to ensure store is ready
    setTimeout(() => {
      try {
        useChatStore.getState().initialSocketListeners();
        console.log("✅ Socket listeners initialized on connect");
      } catch (error) {
        console.error("❌ Error initializing socket listeners:", error);
      }
    }, 100);
  });

  // 🔥 CRITICAL: Re-emit user-connected on reconnect
  socket.on("reconnect", () => {
    console.log("🔄 Socket reconnected");
    const user = useUserState.getState().user;
    const userId = user?._id || user?.user?._id;
    if (userId) {
      console.log("👤 Re-emitting user-connected after reconnect:", userId);
      socket.emit("user-connected", userId);
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error", error);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnection:", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) return initialiseSocket();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
