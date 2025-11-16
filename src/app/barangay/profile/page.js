"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./profile.module.css";
import api from "../../../lib/axios";
import { requireRole, getCurrentUser } from "../../../lib/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [profile, setProfile] = useState({
    username: "",
    email: "",
    role: "",
    createdAt: "",
  });

  const [username, setUsername] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const user = await requireRole(router, 'barangay', '/home');
        if (!user) {
          toast.error("Barangay access required.");
          return;
        }

        const res = await api.get("/api/user/profile", {
          withCredentials: true
        });
        const data = res.data?.user || res.data;
        const info = {
          username: data?.username || "",
          email: data?.email || "",
          role: data?.role || "user",
          createdAt: data?.createdAt || data?.dateJoined || "",
        };
        setProfile(info);
        setUsername(info.username);
      } catch {
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username || username === profile.username) return;
    try {
      setSaving(true);
      const res = await api.patch(
        "/api/user/profile",
        { username },
        { withCredentials: true }
      );
      const data = res.data?.user || res.data;
      setProfile((p) => ({ ...p, username: data?.username || username }));
      toast.success("Profile updated.");
    } catch {
      toast.error("Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Enter current and new passwords.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    try {
      setChangingPw(true);
      const token = getCookie("authToken") || getToken();
      if (!token) throw new Error("Missing auth token");
      await api.patch(
        "/api/user/profile/password",
        { currentPassword, newPassword },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
          timeout: 100000, // 100 seconds timeout
        }
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password changed.");
    } catch {
      toast.error("Could not change password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.pageLabel}>Profile</h1>
        <p className={styles.pageDesc}>Manage your account details</p>
      </header>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Account Information</div>
            {loading ? (
              <div className={styles.loading}>Loading…</div>
            ) : (
              <form onSubmit={handleSaveProfile} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Username</label>
                  <input
                    className={styles.input}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                      className={styles.input}
                      value={profile.email}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Role</label>
                    <input
                      className={styles.input}
                      value={profile.role}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Date Joined</label>
                  <input
                    className={styles.input}
                    value={formatDate(profile.createdAt)}
                    readOnly
                    disabled
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={saving || username === profile.username}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Change Password</div>
            <form onSubmit={handleChangePassword} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Current Password</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>New Password</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Confirm New Password</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.secondaryBtn}
                  disabled={changingPw}
                >
                  {changingPw ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <ToastContainer position="top-right" autoClose={2500} theme="colored" />
    </main>
  );
}