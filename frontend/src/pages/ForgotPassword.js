import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import "./Auth.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authAPI.forgotPassword(email);
      const data = response.data;

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "Failed to send reset email");
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

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <div className="auth-header">
            <h1>✅ Check Your Email</h1>
          </div>
          <div className="auth-content">
            <div className="success-message">
              <p>New login credentials have been sent to:</p>
              <p className="email-highlight">{email}</p>
              <p>
                Please check your email and follow the instructions to login
                with your temporary credentials.
              </p>
            </div>
            <div className="auth-links">
              <Link to="/login" className="btn btn-primary">
                Back to Login
              </Link>
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
          <h1>🔐 Forgot Password</h1>
          <p>Enter your email address to receive new login credentials</p>
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
              value={email}
              onChange={handleChange}
              placeholder="Enter your email address"
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
                Sending...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Send New Credentials
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login" className="auth-link">
            <i className="fas fa-arrow-left"></i>
            Back to Login
          </Link>
          <Link to="/register" className="auth-link">
            <i className="fas fa-user-plus"></i>
            Create Account
          </Link>
        </div>

        <div className="auth-info">
          <h4>ℹ️ Important Information:</h4>
          <ul>
            <li>You will receive temporary login credentials</li>
            <li>Credentials expire in 10 minutes</li>
            <li>You'll be prompted to change your password after login</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
