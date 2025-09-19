import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "./Auth.css";

const TempCredentialsLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user came from email link
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email");
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authAPI.verifyTempCredentials(formData);
      const data = response.data;

      if (data.success) {
        // Store token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.requiresPasswordChange) {
          // Redirect to password change page
          navigate("/change-password", {
            state: {
              message: "Please set a new password for your account",
              fromTempLogin: true,
            },
          });
        } else {
          // Normal login flow
          navigate("/dashboard");
        }
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(
        error.response?.data?.message ||
          "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-header">
          <h1>🔑 Temporary Login</h1>
          <p>Use the credentials sent to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-content">
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Temporary Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter temporary password from email"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Verifying...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Login with Temporary Credentials
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login" className="auth-link">
            <i className="fas fa-arrow-left"></i>
            Back to Regular Login
          </Link>
          <Link to="/forgot-password" className="auth-link">
            <i className="fas fa-key"></i>
            Request New Credentials
          </Link>
        </div>

        <div className="auth-info">
          <h4>ℹ️ Using Temporary Credentials:</h4>
          <ul>
            <li>
              Enter the email and temporary password from your reset email
            </li>
            <li>You will be prompted to set a new password after login</li>
            <li>Temporary credentials expire in 10 minutes</li>
            <li>If credentials have expired, request new ones</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TempCredentialsLogin;
