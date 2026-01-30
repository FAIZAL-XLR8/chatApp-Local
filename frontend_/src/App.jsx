import React, {useEffect} from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/user-login/login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PublicRoute, ProtectedRoute } from "./pages/user-login/protectedRoute";
import PageNotFound from "./pages/user-login/PageNotfound";
import SettingSection from "./pages/settings/settingSection";
import HomePage from "./components/homePage";
import UserProfile from "./pages/user-profile/userProfile";
import Status from "./pages/statusSection/Status"
import useUserStore from "./store/useUserStore";
import { disconnectSocket, initialiseSocket } from "./services/chatService";
import { useChatStore } from "./store/chatStore";
const App = () => {
  const {user} = useUserStore();
  const {setCurrentUser, cleanup} = useChatStore();
  useEffect (()=>{
     if (user?._id)
  {
    const socket = initialiseSocket();
    if(socket)
    {
      setCurrentUser(user);
      
      // Initialize socket listeners when socket connects
      socket.on("connect", () => {
        useChatStore.getState().initialSocketListeners();
      });
      
      // Also initialize immediately if already connected
      if (socket.connected) {
        useChatStore.getState().initialSocketListeners();
      }
    }
  }
  return () => {
    cleanup();
    disconnectSocket();
    
  }
  },[user, setCurrentUser])
 
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element ={<PublicRoute></PublicRoute>}>
                <Route path="/user-login" element={<Login />} />

          </Route>
          <Route element ={<ProtectedRoute></ProtectedRoute>}>
          <Route path="/" element= {<HomePage></HomePage>} />
                      <Route path="/status" element= {<Status></Status>} />
                                            <Route path="/setting" element= {<SettingSection></SettingSection>} />

                      <Route path="/user-profile" element= {<UserProfile></UserProfile>} />


          </Route>

         
          
        
          <Route path="*" element={<PageNotFound/>} />
        </Routes>
      </BrowserRouter>
      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default App;