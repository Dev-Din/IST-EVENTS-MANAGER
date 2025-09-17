import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { authAPI } from "../services/api";
import Loading from "../components/Loading";
import {
  EAST_AFRICAN_COUNTRIES,
  getCountryByCode,
} from "../utils/eastAfricanCountries";
import "./Profile.css";

const Profile = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [profileStats, setProfileStats] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Personal Information Form
  const [personalForm, setPersonalForm] = useState({
    fullName: "",
    phone: "",
    country: "",
  });

  // Security Form
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Preferences Form
  const [preferencesForm, setPreferencesForm] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    language: "en",
    timezone: "UTC",
  });

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setPersonalForm({
        fullName: user.fullName || "",
        phone: user.phone || "",
        country: user.country || "",
      });

      setPreferencesForm({
        notifications: user.preferences?.notifications || {
          email: true,
          sms: false,
          push: true,
        },
        language: user.preferences?.language || "en",
        timezone: user.preferences?.timezone || "UTC",
      });

      loadProfileStats();
    }
  }, [user]);

  const loadProfileStats = async () => {
    try {
      const response = await authAPI.getProfileStats();
      setProfileStats(response.data.stats);
    } catch (error) {
      console.error("Error loading profile stats:", error);
    }
  };

  const showMessage = (message, type = "success") => {
    if (type === "success") {
      setSuccess(message);
      setError("");
    } else {
      setError(message);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 5000);
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.updateProfile(personalForm);
      showMessage("Profile updated successfully!");
      window.location.reload(); // Refresh to update user context
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update profile",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    setLoading(true);

    try {
      await authAPI.updatePassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      });

      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showMessage("Password updated successfully!");
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update password",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.updatePreferences(preferencesForm);
      showMessage("Preferences updated successfully!");
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update preferences",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (!deletePassword) {
      showMessage("Please enter your password to delete account", "error");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      await authAPI.deleteAccount(deletePassword);
      showMessage("Account deleted successfully. You will be logged out.");
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to delete account",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    return "/transparent-default-avatar.png";
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  if (!user) {
    return <Loading />;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              <img
                src={getAvatarUrl()}
                alt="Profile Avatar"
                className="profile-avatar"
              />
            </div>
          </div>

          <div className="profile-info">
            <h1>{user.fullName || user.username}</h1>
            <p className="user-role">
              <i className="fas fa-user-tag"></i>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
            <p className="user-email">
              <i className="fas fa-envelope"></i>
              {user.email}
            </p>
            <p className="user-country">
              <i className="fas fa-globe"></i>
              {getCountryByCode(user.country)?.name || user.country}
            </p>
          </div>

          {profileStats && (
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-number">{profileStats.totalTickets}</div>
                <div className="stat-label">Total Tickets</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{profileStats.upcomingEvents}</div>
                <div className="stat-label">Upcoming Events</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {formatCurrency(profileStats.totalSpent, user.currency)}
                </div>
                <div className="stat-label">Total Spent</div>
              </div>
            </div>
          )}
        </div>

        {(success || error) && (
          <div className={`alert ${success ? "alert-success" : "alert-error"}`}>
            <i
              className={`fas ${
                success ? "fa-check-circle" : "fa-exclamation-triangle"
              }`}
            ></i>
            {success || error}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === "personal" ? "active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              <i className="fas fa-user"></i>
              Personal Info
            </button>
            <button
              className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <i className="fas fa-lock"></i>
              Security
            </button>
            <button
              className={`tab-btn ${
                activeTab === "preferences" ? "active" : ""
              }`}
              onClick={() => setActiveTab("preferences")}
            >
              <i className="fas fa-cog"></i>
              Preferences
            </button>
            <button
              className={`tab-btn ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <i className="fas fa-user-cog"></i>
              Account
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "personal" && (
              <div className="tab-panel">
                <h3>Personal Information</h3>
                <form onSubmit={handlePersonalSubmit} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      value={personalForm.fullName}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          fullName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      value={personalForm.phone}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select
                      id="country"
                      value={personalForm.country}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          country: e.target.value,
                        })
                      }
                      required
                    >
                      {EAST_AFRICAN_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Profile"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "security" && (
              <div className="tab-panel">
                <h3>Change Password</h3>
                <form onSubmit={handleSecuritySubmit} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={securityForm.currentPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      value={securityForm.newPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          newPassword: e.target.value,
                        })
                      }
                      minLength="6"
                      required
                    />
                    <small className="form-text">
                      Password must be at least 6 characters and contain
                      uppercase, lowercase, and numbers.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={securityForm.confirmPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Change Password"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="tab-panel">
                <h3>Notification Preferences</h3>
                <form
                  onSubmit={handlePreferencesSubmit}
                  className="profile-form"
                >
                  <div className="form-group">
                    <label>Notifications</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications.email}
                          onChange={(e) =>
                            setPreferencesForm({
                              ...preferencesForm,
                              notifications: {
                                ...preferencesForm.notifications,
                                email: e.target.checked,
                              },
                            })
                          }
                        />
                        <span>Email notifications</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications.sms}
                          onChange={(e) =>
                            setPreferencesForm({
                              ...preferencesForm,
                              notifications: {
                                ...preferencesForm.notifications,
                                sms: e.target.checked,
                              },
                            })
                          }
                        />
                        <span>SMS notifications</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications.push}
                          onChange={(e) =>
                            setPreferencesForm({
                              ...preferencesForm,
                              notifications: {
                                ...preferencesForm.notifications,
                                push: e.target.checked,
                              },
                            })
                          }
                        />
                        <span>Push notifications</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="language">Language</label>
                    <select
                      id="language"
                      value={preferencesForm.language}
                      onChange={(e) =>
                        setPreferencesForm({
                          ...preferencesForm,
                          language: e.target.value,
                        })
                      }
                    >
                      <option value="en">English</option>
                      <option value="sw">Swahili</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="timezone">Timezone</label>
                    <select
                      id="timezone"
                      value={preferencesForm.timezone}
                      onChange={(e) =>
                        setPreferencesForm({
                          ...preferencesForm,
                          timezone: e.target.value,
                        })
                      }
                    >
                      <option value="UTC">UTC</option>
                      <option value="Africa/Nairobi">East Africa Time</option>
                      <option value="Africa/Kampala">Uganda Time</option>
                      <option value="Africa/Dar_es_Salaam">
                        Tanzania Time
                      </option>
                      <option value="Africa/Kigali">Rwanda Time</option>
                      <option value="Africa/Bujumbura">Burundi Time</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Preferences"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "account" && (
              <div className="tab-panel">
                <h3>Account Settings</h3>

                {profileStats && profileStats.recentActivity.length > 0 && (
                  <div className="recent-activity">
                    <h4>Recent Activity</h4>
                    <div className="activity-list">
                      {profileStats.recentActivity.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-ticket-alt"></i>
                          </div>
                          <div className="activity-details">
                            <p className="activity-title">
                              Purchased ticket for {activity.eventName}
                            </p>
                            <p className="activity-meta">
                              {formatCurrency(
                                activity.amount,
                                activity.currency
                              )}{" "}
                              • {new Date(activity.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="danger-zone">
                  <h4>Danger Zone</h4>
                  <div className="danger-actions">
                    <div className="danger-item">
                      <div className="danger-info">
                        <h5>Delete Account</h5>
                        <p>
                          Permanently delete your account and all associated
                          data. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        className="btn btn-danger"
                      >
                        Delete Account
                      </button>
                    </div>

                    {showDeleteConfirm && (
                      <form
                        onSubmit={handleDeleteAccount}
                        className="delete-confirm-form"
                      >
                        <div className="form-group">
                          <label htmlFor="deletePassword">
                            Enter your password to confirm deletion:
                          </label>
                          <input
                            type="password"
                            id="deletePassword"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-actions">
                          <button
                            type="submit"
                            className="btn btn-danger"
                            disabled={loading}
                          >
                            {loading ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeletePassword("");
                            }}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
