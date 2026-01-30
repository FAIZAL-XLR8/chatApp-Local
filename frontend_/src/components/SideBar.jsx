import React, { useEffect , useState} from 'react'
import { useLocation , Link} from 'react-router-dom';
import useLayoutStore from '../store/layOutStore'
import { MdOutlineRadioButtonChecked } from "react-icons/md"
import { FaWhatsapp, FaUserCircle, FaCog } from 'react-icons/fa';
import useThemeStore from '../store/theme';
import useUserStore from '../store/useUserStore';
import { motion } from "framer-motion";

const SideBar = () => {
    const {activeTab, setActiveTab, selectedContact, setSelectedContact} = useLayoutStore();
    const location = useLocation();
    const {theme, setTheme} = useThemeStore();
    const {user} = useUserStore();
    

    const [isMobile, setIsMobile] = useState (window.innerWidth < 768);

    useEffect (()=>{
        const handleResize = () => {
            //trigger only when its less than 768 px
            setIsMobile (window.innerWidth < 768);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    },[])

    useEffect (()=>{
        if (location.pathname === '/') setActiveTab("chats");
        else  if (location.pathname === '/status') setActiveTab("status");
        else  if (location.pathname === '/user-profile') setActiveTab("profile");
        else if (location.pathname === '/setting') setActiveTab("setting");
    },[location, setActiveTab])

    //if mobile mein hai aur  koi contact ke chat khule hue h no side bar
    if (isMobile && selectedContact) return null;

  const SidebarContent = (
    <>
      <Link
        to="/"
        className={`${isMobile ? "" : "mb-6"} ${
          activeTab === "chats" &&
          "bg-gray-100 shadow-sm border border-gray-300 p-3 rounded-full"
        } focus:outline-none`}
      >
        <FaWhatsapp
          className={`h-7 w-7 ${
            activeTab === "chats"
              ? "text-gray-900"
              : "text-gray-500"
          }`}
        />
      </Link>

      <Link
        to="/status"
        className={`${isMobile ? "" : "mb-6"} ${
          activeTab === "status" &&
          "bg-gray-100 shadow-sm border border-gray-300 p-3 rounded-full"
        } focus:outline-none`}
      >
        <MdOutlineRadioButtonChecked 
          className={`h-7 w-7 ${
            activeTab === "status"
              ? "text-gray-900"
              : "text-gray-500"
          }`}
        />
      </Link>

      {!isMobile && <div className="grow"/>}

      <Link
        to="/user-profile"
        className={`${isMobile ? "" : "mb-6"} ${
          activeTab === "profile" &&
          "bg-gray-100 shadow-sm border border-gray-300 p-3 rounded-full"
        } focus:outline-none`}
      >
        {user?.user?.profilePicture ? (
          <img
            src={user?.user?.profilePicture}
            alt="user"
            className="h-7 w-7 rounded-full border border-gray-300"
          />
        ) : (
          <FaUserCircle
            className={`h-7 w-7 ${
              activeTab === "profile"
                ? "text-gray-900"
                : "text-gray-500"
            }`}
          />
        )}
      </Link>
      <Link
        to="/setting"
        className={`${isMobile ? "" : "mb-6"} ${
          activeTab === "setting" &&
          "bg-gray-100 shadow-sm border border-gray-300 p-3 rounded-full"
        } focus:outline-none`}
      >
        <FaCog 
          className={`h-7 w-7 ${
            activeTab === "setting"
              ? "text-gray-900"
              : "text-gray-500"
          }`}
        />
      </Link>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile
          ? "fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-white shadow-md border-t border-gray-300"
          : "w-16 h-screen flex flex-col items-center py-6 bg-white shadow-md border-r border-gray-300"
      }`}
    >
      {SidebarContent}
    </motion.div>
  );
};

export default SideBar;
