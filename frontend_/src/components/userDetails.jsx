import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useUserStore from "../store/useUserStore";
import { updateProfile } from "../services/loginService";
import { toast } from "react-hot-toast";
import Layout from "./layout";
import { FaCamera } from "react-icons/fa";
import { FiEdit2, FiCheck, FiX } from "react-icons/fi";

const UserDetails = () => {
  const { user, setUser, theme } = useUserStore();

  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const aboutInputRef = useRef(null);

  // Resolve nested user object
  const resolvedName =
    user?.userName || user?.user?.username || user?.user?.userName || "";
  const resolvedAbout = user?.about || user?.user?.about || "";
  const resolvedAvatar =
    user?.profilePicture || user?.user?.profilePicture || null;

  useEffect(() => {
    if (user) {
      setName(resolvedName);
      setAbout(resolvedAbout);
    }
  }, [user]);

  // Auto-focus inputs when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) nameInputRef.current.focus();
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingAbout && aboutInputRef.current) aboutInputRef.current.focus();
  }, [isEditingAbout]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Basic validation
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setProfilePicture(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async (field) => {
    setIsSaving(true);
    try {
      const formData = new FormData();

      if (field === "name") {
        if (!name.trim()) {
          toast.error("Name cannot be empty");
          setIsSaving(false);
          return;
        }
        formData.append("userName", name.trim());
        setIsEditingName(false);
      }

      if (field === "about") {
        formData.append("about", about.trim());
        setIsEditingAbout(false);
      }

      if (field === "profile" && profilePicture) {
        formData.append("media", profilePicture);
      }

      const updated = await updateProfile(formData);
      setUser(updated.data);
      setProfilePicture(null);
      setPreview(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = (field) => {
    if (field === "name") {
      setIsEditingName(false);
      setName(resolvedName);
    }
    if (field === "about") {
      setIsEditingAbout(false);
      setAbout(resolvedAbout);
    }
  };

  const isDark = theme === "dark";

  // ── Shared style tokens ──
  const bg = isDark ? "#111827" : "#f8fafc";
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const cardBorder = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f1f5f9" : "#1e293b";
  const textSecondary = isDark ? "#94a3b8" : "#64748b";
  const inputBg = isDark ? "#0f172a" : "#f1f5f9";
  const inputBorder = isDark ? "#475569" : "#cbd5e1";
  const accentColor = "#6366f1"; // indigo
  const dangerColor = "#ef4444";
  const successColor = "#22c55e";

  return (
    <Layout>
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          color: textPrimary,
          fontFamily: "'DM Sans', sans-serif",
          padding: "40px 16px",
          transition: "background 0.3s, color 0.3s",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Header */}
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontSize: 26,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 32,
              letterSpacing: "-0.5px",
            }}
          >
            My Profile
          </motion.h1>

          {/* Avatar Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 20,
              padding: "32px 24px 28px",
              textAlign: "center",
              marginBottom: 20,
              boxShadow: isDark
                ? "0 4px 24px rgba(0,0,0,0.25)"
                : "0 2px 12px rgba(0,0,0,0.06)",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          >
            {/* Avatar with overlay */}
            <div
              style={{ position: "relative", display: "inline-block" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `3px solid ${accentColor}`,
                  cursor: "pointer",
                  position: "relative",
                  background: isDark ? "#334155" : "#e2e8f0",
                  boxShadow: `0 0 0 4px ${isDark ? cardBg : "#fff"}, 0 4px 16px rgba(99,102,241,0.3)`,
                }}
              >
                {/* Image or Fallback */}
                {preview || resolvedAvatar ? (
                  <img
                    src={preview || resolvedAvatar}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 42,
                      fontWeight: 700,
                      color: accentColor,
                      background: isDark
                        ? "linear-gradient(135deg, #1e293b, #334155)"
                        : "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                    }}
                  >
                    {resolvedName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}

                {/* Hover Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.25s ease",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                >
                  <FaCamera size={22} color="#fff" />
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>
                    Change
                  </span>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>

            {/* Preview action buttons */}
            <AnimatePresence>
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <button
                    onClick={() => handleSave("profile")}
                    disabled={isSaving}
                    style={{
                      background: successColor,
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isSaving ? "not-allowed" : "pointer",
                      opacity: isSaving ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <FiCheck size={15} />
                    {isSaving ? "Saving…" : "Save Photo"}
                  </button>
                  <button
                    onClick={() => {
                      setProfilePicture(null);
                      setPreview(null);
                    }}
                    style={{
                      background: isDark ? "#334155" : "#e2e8f0",
                      color: textPrimary,
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FiX size={15} />
                    Discard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Name Field Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 16,
              padding: "20px 22px",
              marginBottom: 14,
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.2)"
                : "0 1px 6px rgba(0,0,0,0.05)",
              transition: "background 0.3s",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: textSecondary,
                marginBottom: 8,
              }}
            >
              Name
            </div>

            <AnimatePresence mode="wait">
              {isEditingName ? (
                <motion.div
                  key="edit-name"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave("name");
                      if (e.key === "Escape") cancelEdit("name");
                    }}
                    style={{
                      flex: 1,
                      background: inputBg,
                      border: `1.5px solid ${accentColor}`,
                      borderRadius: 10,
                      padding: "9px 12px",
                      fontSize: 15,
                      color: textPrimary,
                      outline: "none",
                      transition: "border 0.2s",
                    }}
                  />
                  <button
                    onClick={() => handleSave("name")}
                    disabled={isSaving}
                    style={{
                      background: successColor,
                      border: "none",
                      borderRadius: 10,
                      width: 38,
                      height: 38,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "opacity 0.2s",
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    <FiCheck size={18} color="#fff" />
                  </button>
                  <button
                    onClick={() => cancelEdit("name")}
                    style={{
                      background: isDark ? "#334155" : "#e2e8f0",
                      border: "none",
                      borderRadius: 10,
                      width: 38,
                      height: 38,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FiX size={18} color={textSecondary} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="view-name"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {name || "—"}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: "pointer",
                      color: accentColor,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = isDark
                        ? "#334155"
                        : "#eef2ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <FiEdit2 size={13} />
                    Edit
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* About Field Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 16,
              padding: "20px 22px",
              boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.2)"
                : "0 1px 6px rgba(0,0,0,0.05)",
              transition: "background 0.3s",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: textSecondary,
                marginBottom: 8,
              }}
            >
              About
            </div>

            <AnimatePresence mode="wait">
              {isEditingAbout ? (
                <motion.div
                  key="edit-about"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <textarea
                    ref={aboutInputRef}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit("about");
                    }}
                    rows={3}
                    placeholder="Tell others about yourself…"
                    style={{
                      width: "100%",
                      background: inputBg,
                      border: `1.5px solid ${accentColor}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontSize: 14,
                      color: textPrimary,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => cancelEdit("about")}
                      style={{
                        background: isDark ? "#334155" : "#e2e8f0",
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: textPrimary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <FiX size={14} />
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave("about")}
                      disabled={isSaving}
                      style={{
                        background: successColor,
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 18px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isSaving ? "not-allowed" : "pointer",
                        opacity: isSaving ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <FiCheck size={14} />
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view-about"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: about ? textPrimary : textSecondary,
                      lineHeight: 1.6,
                      fontStyle: about ? "normal" : "italic",
                    }}
                  >
                    {about || "No bio added yet"}
                  </span>
                  <button
                    onClick={() => setIsEditingAbout(true)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: "pointer",
                      color: accentColor,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = isDark
                        ? "#334155"
                        : "#eef2ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <FiEdit2 size={13} />
                    Edit
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default UserDetails;