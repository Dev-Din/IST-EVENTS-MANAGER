import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import "./Auth.css";

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updatePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is coming from temp login
    if (location.state?.fromTempLogin) {
      setFormData((prev) => ({ ...prev, currentPassword: "" }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.isValid) {
      setError(
        "Password must be at least 6 characters with uppercase, lowercase, and numbers"
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } else {
        setError(result.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <div className="auth-header">
            <h1>✅ Password Updated</h1>
          </div>
          <div className="auth-content">
            <div className="success-message">
              <p>Your password has been successfully updated!</p>
              <p>Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-header">
          <h1>🔐 Change Password</h1>
          <p>
            {location.state?.message || "Set a new password for your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-content">
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="currentPassword">
              {location.state?.fromTempLogin
                ? "Temporary Password"
                : "Current Password"}
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder={
                location.state?.fromTempLogin
                  ? "Enter temporary password"
                  : "Enter current password"
              }
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              required
              disabled={loading}
            />
            <div className="password-requirements">
              <small>Password must contain:</small>
              <ul>
                <li
                  className={
                    formData.newPassword.length >= 6 ? "valid" : "invalid"
                  }
                >
                  At least 6 characters
                </li>
                <li
                  className={
                    /[A-Z]/.test(formData.newPassword) ? "valid" : "invalid"
                  }
                >
                  One uppercase letter
                </li>
                <li
                  className={
                    /[a-z]/.test(formData.newPassword) ? "valid" : "invalid"
                  }
                >
                  One lowercase letter
                </li>
                <li
                  className={
                    /\d/.test(formData.newPassword) ? "valid" : "invalid"
                  }
                >
                  One number
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
            {formData.confirmPassword &&
              formData.newPassword !== formData.confirmPassword && (
                <small className="error-text">Passwords do not match</small>
              )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Updating...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Update Password
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <button
            onClick={() => navigate("/dashboard")}
            className="auth-link"
            disabled={loading}
          >
            <i className="fas fa-arrow-left"></i>
            Skip for now
          </button>
        </div>

        <div className="auth-info">
          <h4>🔒 Password Security Tips:</h4>
          <ul>
            <li>Use a unique password for this account</li>
            <li>Don't reuse passwords from other accounts</li>
            <li>Consider using a password manager</li>
            <li>Never share your password with anyone</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
