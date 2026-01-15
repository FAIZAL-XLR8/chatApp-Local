import React from "react";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import countries from "../../utils/countriles";
import { useState } from "react";
import { MdMessage } from "react-icons/md"; // Message icon
import { FaChevronDown, FaUser } from "react-icons/fa"; // country flag icons
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";
import ProgressBar from "./progress";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/theme";
import { motion, useSpring } from "framer-motion";
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
      .email("Please enter a valid email")
      .transform((value, originalValue) =>
        originalValue?.trim() === "" ? null : value
      ),

    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^[0-9]{10}$/, "Phone number must be 10 digits")
      .transform((value, originalValue) =>
        originalValue?.trim() === "" ? null : value
      ),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value.email || value.phoneNumber);
    }
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
  const { step, setStep, setUserPhoneData, userPhoneData, resetLofinState } =
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
  const { setUser } = useUserStore();
  console.log(theme);
  //form of login
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  }); // useForm takes an object where for validation we use resolvers therefore
  //resolver : yupresolver(validationScheama);

  //form of otp
  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });
  //form of profileRegister
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  // const ProgressBar = () => (
  //   <div className="w-full mb-6">
  //     <div
  //       className={`h-2 rounded-full overflow-hidden ${
  //         theme === "dark" ? "bg-gray-700" : "bg-gray-200"
  //       }`}
  //     >
  //       <motion.div
  //         initial={{ width: 0 }}
  //         animate={{ width: `${(step / 3) * 100}%` }}
  //         transition={{ duration: 0.6, ease: "easeInOut" }}
  //         className="h-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]"
  //       />
  //     </div>
  //   </div>
  // );

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
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
        {error && <p className="text-error-500 text-center mb-4">{error}</p>}

        {step === 1 && (
          <form
            onSubmit={handleLoginSubmit(async (data) => {
              try {
                setError("");
                const fullPhoneNumber = selectedCountry.dialCode + phoneNumber;
                // Add your login API call here
                setStep(2);
              } catch (err) {
                setError(err.message || "An error occurred");
              }
            })}
          >
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
                    } border rounded-s-lg hover:bg-gray-200 focus:right-4 focus:outline-none focus:ring-gray-100`}
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
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition`}
                />
              </div>
            </div>
            {loginErrors.phoneNumber && (
              <p className="text-red-500 text-sm mt-2">
                {loginErrors.phoneNumber.message}
              </p>
            )}
            <button
  type="submit"
  className="w-full  bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
  disabled={loading}
>
  {loading ? <Spinner /> : "Send OTP"}
</button>

          </form>
        )}
        {/* divider with OR */}
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-gray-300" />
          <span className="mx-3 text-gray-500 text-sm font-medium">Or</span>
          <div className="flex-grow h-px bg-gray-300" />
        </div>
        {/* Email input box */}
        <div
          className={`flex items-center border rounded-md px-3 py-2 ${
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
            placeholder="Enter your email (optional)"
            className={`w-full bg-transparent outline-none text-sm ${
              theme === "dark" ? "text-white" : "text-gray-800"
            }`}
          />
        </div>
        {loginErrors.email && (
          <p className="text-red-500 text-sm mt-2">
            {loginErrors.email.message}
          </p>
        )}
      </motion.div>
    </div>
  );
};
export default Login;
