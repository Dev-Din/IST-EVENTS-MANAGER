import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { authAPI } from "../services/api";
import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [blockingAdmin, setBlockingAdmin] = useState(false);

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || "/";

  // Handle redirection if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user && !blockingAdmin) {
      // Redirect to appropriate dashboard based on role
      if (user.role === "super-admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "sub-admin") {
        navigate("/subadmin/dashboard", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from, blockingAdmin]);

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
        // Check user role and block admin users
        try {
          const response = await authAPI.getMe();
          const userRole = response.data.user.role;

          if (userRole === "super-admin" || userRole === "sub-admin") {
            // Block admin users from regular login
            setBlockingAdmin(true);
            await logout();
            setBlockingAdmin(false);
            setErrors({
              general: "Admin users must login through the admin portal.",
            });
            return; // Prevent any further processing
          } else {
            // Regular user - allow login
            navigate(from, { replace: true });
          }
        } catch (error) {
          console.error("User verification error:", error);
          setBlockingAdmin(true);
          await logout(); // Ensure logout on error
          setBlockingAdmin(false);
          setErrors({
            general: "Unable to verify user credentials. Please try again.",
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account to continue</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
                placeholder="Enter your email"
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
            className="btn btn-primary btn-full"
            disabled={loading || blockingAdmin}
          >
            {loading || blockingAdmin ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {blockingAdmin ? "Blocking access..." : "Signing In..."}
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?
            <Link to="/register" className="auth-link">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
