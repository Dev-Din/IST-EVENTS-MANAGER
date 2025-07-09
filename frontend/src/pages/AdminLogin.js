import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { authAPI } from "../services/api";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.identifier)) {
      newErrors.identifier = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await login(formData);

      if (result.success) {
        // Get user data from the login result or make a fresh API call
        try {
          const response = await authAPI.getMe();
          const userRole = response.data.user.role;

          if (userRole === "super-admin") {
            navigate("/admin/dashboard", { replace: true });
          } else if (userRole === "sub-admin") {
            navigate("/subadmin/dashboard", { replace: true });
          } else {
            // Not an admin - logout and show error
            await logout();
            setErrors({
              general: "Access denied. Admin credentials required.",
            });
          }
        } catch (error) {
          console.error("Admin verification error:", error);
          await logout();
          setErrors({
            general: "Unable to verify admin credentials. Please try again.",
          });
        }
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <div className="admin-logo">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h1>Admin Access</h1>
          <p>Restricted area for administrators only</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-triangle"></i>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="identifier">Email Address</label>
            <div className="input-group">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                placeholder="Enter your admin email"
                className={errors.identifier ? "error" : ""}
                disabled={loading}
              />
            </div>
            {errors.identifier && (
              <span className="error-text">{errors.identifier}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-group">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? "error" : ""}
                disabled={loading}
              />
            </div>
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-admin btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Signing In...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Admin Sign In
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <p className="security-notice">
            <i className="fas fa-info-circle"></i>
            This is a secure area. All login attempts are monitored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
