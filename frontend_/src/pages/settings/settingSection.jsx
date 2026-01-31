import  React , { useState } from 'react'
import { logoutUser } from '../../services/loginService';
import useUserStore from '../../store/useUserStore';
import useThemeStore from '../../store/theme';
import { FaSearch, FaCheckCircle, FaTimesCircle, FaUserCircle , FaSun, FaMoon } from "react-icons/fa";
import Layout from '../../components/layout';
import { FaSignOutAlt } from "react-icons/fa";
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
const SettingSection = () => {
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const {theme, setTheme} = useThemeStore();  
  const {user, clearUser} = useUserStore();
  const navigate = useNavigate();
  const toggleThemeDialog = () => {
    setIsThemeDialogOpen(!isThemeDialogOpen);
  }
  const handleLogOut = async () => {
    try{
      await logoutUser();
      useUserStore.getState().clearUser();
      toast.success('Logged out successfully');
      navigate('/user-login');
    }catch(error){
      console.error(error);
      toast.error('Failed to log out');
    }
  }
  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={toggleThemeDialog}
    >
      <div
        className={`flex h-screen ${
          theme === "dark"
            ? "bg-[rgb(17,27,33)] text-white"
            : "bg-white text-black"
        }`}
      >
        <div
          className={`w-[400px] border-r ${
            theme === "dark" ? "border-gray-600" : "border-gray-200"
          }`}
        >
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-4">Settings</h1>
  
            {/* THEME TOGGLE */}
            <div
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`flex items-center gap-4 p-3 mb-4 cursor-pointer rounded ${
                theme === "dark"
                  ? "hover:bg-[#202c33]"
                  : "hover:bg-gray-100"
              }`}
            >
              {theme === "dark" ? (
                <FaSun className="w-5 h-5 text-yellow-400" />
              ) : (
                <FaMoon className="w-5 h-5 text-gray-700" />
              )}
  
              <p className="text-sm font-medium">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </p>
            </div>
          </div>
  
          {/* USER PROFILE */}
          <div
            className={`flex items-center gap-4 p-3 ${
              theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-100"
            } cursor-pointer rounded`}
          >
            <img
              src={user?.user?.profilePicture}
              alt="profile"
              className="w-14 h-14 rounded-full object-cover"
            />
  
            <div className="flex flex-col">
              <p className="text-sm font-medium flex items-center gap-2">
                {user?.user?.userName ||
                  `${user?.user?.phoneSuffix} ${user?.user?.phoneNumber}` ||
                  user?.user?.email}
  
                {user?.user?.isVerified ? (
                  <FaCheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <FaTimesCircle className="w-4 h-4 text-red-500" />
                )}
              </p>
            </div>
          </div>
  
          {/* LOGOUT */}
          <div
            className={`flex items-center gap-4 p-3 ${
              theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-100"
            } cursor-pointer rounded`}
            onClick={handleLogOut}
          >
            <FaSignOutAlt className="w-4 h-4" />
            <p className="text-sm font-medium">Log Out</p>
          </div>
        </div>
      </div>
    </Layout>
  );
  
  
}

export default SettingSection;
