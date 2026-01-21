import React from "react";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import countries from "../../utils/countriles";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState } from "react";
import { MdMessage } from "react-icons/md"; // Message icon
import { FaChevronDown, FaUser,FaPlus } from "react-icons/fa"; // country flag icons
import Spinner from "../../utils/Spinner";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";
import ProgressBar from "./progress";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/theme";
import { motion, useSpring } from "framer-motion";
import { verifyOtp, sendOtp, updateProfile } from "../../services/loginService";

/* =========================
   LOGIN VALIDATION
   (Email OR Phone required)
========================= */
export const loginValidationSchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .nullable()
      .notRequired()
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address",
      )
      .transform((value, originalValue) =>
        originalValue?.trim() === "" ? null : value,
      ),
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^[0-9]{10}$/, "Phone number must be 10 digits")
      .transform((value, originalValue) =>
        originalValue?.trim() === "" ? null : value,
      ),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value.email || value.phoneNumber);
    },
  );

/* =========================
   OTP VALIDATION
========================= */
export const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .required("OTP is required")
    .length(6, "OTP must be exactly 6 digits"),
});

/* =========================
   PROFILE VALIDATION
========================= */
export const profileValidationSchema = yup.object().shape({
  username: yup
    .string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),

  agreed: yup.boolean().oneOf([true], "You must agree to the terms"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  const navigate = useNavigate();
  const { step, setStep, setUserPhoneData, userPhoneData, resetLoginState } =
    useLoginStore();
  const { theme, setTheme } = useThemeStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [error, setError] = useState("");
  //the below line is for picture preview
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showDropDown, setDropDown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser, user, isAuthenticated , clearUser} = useUserStore();
  console.log(theme);
  
  //form of login
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  //form of otp
  const {
    handleSubmit: handleOtpSubmit,
    setValue: setOtpValue,
    formState: { errors: otpErrors },
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });
  
  //form of profileRegister
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    watch,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  const onLoginSubmit = async (data) => {
    try {
      setLoading(true);
      console.log(data, data.email);
      const email = data.email;
      const phoneNumber = data.phoneNumber;
      if (email) {
        console.log("hit");
        const response = await sendOtp(email, null, null);
        if (response.status === "success") {
          toast.info("OTP sent to email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else if (phoneNumber) {
        console.log("nothit")
        const response = await sendOtp(null, phoneNumber, selectedCountry.dialCode);
        if (response.status === "success") {
          toast.info("OTP sent to phone number");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (error) {
      console.log(error);
      setError(error?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (data) => {
    try {
      console.log(data.otp, "hii");
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Either Phone or Email should be provided");
      }
      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(email, null, null, data.otp);
      } else {
        response = await verifyOtp(
          null,
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          data.otp,
        );
      }
      console.log(response);
      console.log(response.data);
      if (response.message === "success") {
        toast.success("Otp verified Successfully");
        const user = response.data;
        console.log(user);
        if ( user?.profilePicture !== "") {
          setUser(user);
          toast.success("Welcome back to SyncTalk");
          navigate("/");
          resetLoginState();
        } else {
          console.log("start journer")
          setStep(3);
        }
      }
    } catch (error) {
      console.log(error.message);
      setError(error?.message || "Wrong Otp");
    } finally {
      setLoading(false);
    }
  };
//revise this thing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
     if (profilePicture) {
    URL.revokeObjectURL(profilePicture);
  }
    if (file) {
      const inMemoryPreviewUrl = URL.createObjectURL(file);
      setProfilePicture(inMemoryPreviewUrl);
      setProfilePictureFile(file);
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data?.username);
      formData.append("agreed", data.agreed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }
      await updateProfile(formData);
      toast.success("Synctalk welcomes you.");
      navigate("/");
      resetLoginState();
    } catch (error) {
      console.log(error);
      setError(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-linear-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`
          relative w-full max-w-md p-6 md:p-8 rounded-2xl
          shadow-2xl backdrop-blur-xl
          ${
            theme === "dark"
              ? "bg-gray-900/80 border border-gray-700"
              : "bg-white/80 border border-white"
          }
        `}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
        >
          <MdMessage className="w-10 h-10 text-white" />
        </motion.div>

        <h1
          className={`text-3xl font-extrabold text-center mb-6 tracking-wide ${
            theme === "dark"
              ? "text-white drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]"
              : "text-gray-800"
          }`}
        >
          SyncTalk Login
        </h1>

        <ProgressBar></ProgressBar>
        
      
        {error && (
          <div className={`px-4 py-3 rounded-lg mb-4 ${
            theme === "dark" 
              ? "bg-red-900/50 border border-red-700 text-red-300" 
              : "bg-red-100 border border-red-400 text-red-700"
          }`}>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
            <p
              className={`text-lg font-extrabold text-center mb-6 tracking-wide ${
                theme === "dark"
                  ? "text-white drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                  : "text-gray-800"
              }`}
            >
              Enter your phone number to receive otp
            </p>

            <div className="relative py-2.5">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type="button"
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "text-gray-900 bg-gray-100 border-gray-300"
                    } border rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100`}
                    onClick={() => {
                      setDropDown(!showDropDown);
                    }}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>

                  {showDropDown && (
                    <div
                      className={`absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-lg shadow-lg z-20 ${
                        theme === "dark"
                          ? "bg-gray-800 border border-gray-600"
                          : "bg-white border border-gray-300"
                      }`}
                    >
                      {countries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setDropDown(false);
                          }}
                          className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 ${
                            theme === "dark"
                              ? "hover:bg-gray-700 text-white"
                              : "text-gray-900"
                          } ${
                            selectedCountry.alpha2 === country.alpha2
                              ? theme === "dark"
                                ? "bg-gray-700"
                                : "bg-gray-100"
                              : ""
                          }`}
                        >
                          <span className="text-xl">{country.flag}</span>
                          <span className="text-sm">{country.name}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            {country.dialCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } rounded-r-md focus:outline-none focus:ring-2 focus:ring-green-500 transition`}
                />
              </div>
            </div>
            {loginErrors.phoneNumber && (
              <p className="text-red-500 text-sm mt-2">
                {loginErrors.phoneNumber.message}
              </p>
            )}
            
            {/* divider with OR */}
            <div className="flex items-center my-4">
              <div className={`flex-grow h-px ${theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`} />
              <span className={`mx-3 text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Or
              </span>
              <div className={`flex-grow h-px ${theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`} />
            </div>
            
            {/* Email input box */}
            <div
              className={`flex items-center border rounded-md px-3 py-3 mb-4 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <FaUser
                className={`mr-2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="email"
                {...loginRegister("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email (optional)"
                className={`w-full bg-transparent outline-none text-sm ${
                  theme === "dark" ? "text-white placeholder-gray-400" : "text-gray-800 placeholder-gray-500"
                }`}
              />
            </div>
            {loginErrors.email && (
              <p className="text-red-500 text-sm mt-2">
                {loginErrors.email.message}
              </p>
            )}
            
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}
        
        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Please enter the 6-digit OTP send to your{" "}
              {userPhoneData?.email ? "Email" : `${userPhoneData?.phoneSuffix || ""}`}{" "}
              {userPhoneData?.phoneNumber && userPhoneData?.phoneNumber}
            </p>

            {/* ✅ FIXED: OTP inputs with proper spacing */}
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className={`w-12 h-12 text-center text-lg font-semibold border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition ${
                    otpErrors.otp ? "border-red-500 ring-2 ring-red-500" : ""
                  }`}
                />
              ))}
            </div>
            
            {/* ✅ FIXED: Error message outside flex container */}
            {otpErrors.otp && (
              <p className="text-red-500 text-sm text-center">
                {otpErrors.otp.message}
              </p>
            )}
            
            {/* Add buttons */}
            <div className="space-y-2">
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? <Spinner /> : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition"
              >
                Something wrong? Go Back
              </button>
            </div>
          </form>
        )}
        {step == 3 && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
  <div className="flex flex-col items-center mb-4">
    <div className="relative w-24 h-24 mb-2">
      <img
        src={profilePicture || selectedAvatar}
        alt="profile"
        className="w-full h-full rounded-full object-cover"
      />

      <label
        htmlFor="profile-picture"
        className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600"
      >
        <FaPlus className="w-4 h-4" />
      </label>

      <input
        type="file"
        id="profile-picture"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>

    <p
      className={`text-sm ${
        theme === "dark" ? "text-gray-300" : "text-gray-500"
      } mb-2`}
    >
      Choose an avatar
    </p>

    <div className="flex flex-wrap justify-center gap-2">
      {avatars.map((avatar, index) => (
        <img
          key={index}
          src={avatar}
          alt={`Avatar ${index + 1}`}
          className={`w-12 h-12 rounded-full cursor-pointer transition duration-300 ease-in-out transform hover:scale-110 ${
            selectedAvatar === avatar ? "ring-2 ring-green-500" : ""
          }`}
          onClick={() => {
         
          setSelectedAvatar(avatar)
          setProfilePicture(avatar)}}
        />
      ))}
      <div className="relative">
  <FaUser
    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
      theme === "dark" ? "text-gray-400" : "text-gray-400"
    }`}
  />

  <input
    {...profileRegister("username")}
    type="text"
    placeholder="Username"
    className={`w-100 pl-13 pr-3 py-2  border ${
      theme === "dark"
        ? "bg-gray-700 border-gray-600 text-white"
        : "bg-white border-gray-300 text-black"
    } rounded-md focus:outline-none`}
  />
</div>

{profileErrors.username && (
  <p className="text-red-500 text-sm mt-1">
    {profileErrors.username.message}
  </p>
)}

    </div>
    <div className="flex items-center space-x-2">
  <input
    {...profileRegister("agreed")}
    type="checkbox"
    id="terms"
    className={`rounded ${
      theme === "dark"
        ? "text-green-500 bg-gray-700 focus:ring-green-500"
        : "text-green-500 focus:ring-green-500"
    }`}
  />

  <label
    htmlFor="terms"
    className={`text-sm ${
      theme === "dark" ? "text-gray-300" : "text-gray-700"
    }`}
  >
    I agree to the{" "}
    <a href="#" className="text-red-500 hover:underline">
      Terms and Conditions
    </a>
  </label>

  {profileErrors.agreed && (
    <p className="text-red-500 text-sm mt-1">
      {profileErrors.agreed.message}
    </p>
  )}
</div>

  </div>
  <button
  type="submit"
  disabled={!watch("agreed") || loading}
  className="
    w-full
    bg-green-500
    text-white
    font-bold
    py-3
    px-4
    rounded-md
    transition
    duration-300
    ease-in-out

    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:bg-green-400
  "
>
  {!watch("agreed") 
  ? "Accept Terms to Continue" 
  : loading 
  ? <Spinner /> 
  : "Create Profile"}

</button>


</form>

        )}
      </motion.div>
    </div>
  );
};

export default Login;