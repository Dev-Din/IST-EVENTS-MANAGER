import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  EAST_AFRICAN_COUNTRIES,
  DEFAULT_COUNTRY,
  validatePhoneNumber,
  getCountryByCode,
} from "../utils/eastAfricanCountries";
import "./Auth.css";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    country: DEFAULT_COUNTRY.code,
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

    // Auto-format phone number when country changes
    if (name === "country" && formData.phone) {
      const country = getCountryByCode(value);
      if (country && !formData.phone.startsWith(country.countryCode)) {
        // Clear phone if it doesn't match new country
        setFormData((prev) => ({
          ...prev,
          phone: "",
          [name]: value,
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!formData.country) {
      newErrors.country = "Please select your country";
    }

    if (
      formData.phone &&
      !validatePhoneNumber(formData.phone, formData.country)
    ) {
      const country = getCountryByCode(formData.country);
      newErrors.phone = `Please enter a valid ${country.name} phone number (e.g., ${country.exampleNumber})`;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone || undefined, // Only send phone if provided
        country: formData.country,
      });

      if (result.success) {
        navigate("/", { replace: true });
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
          <h1>Create Account</h1>
          <p>Join us to discover and book amazing events across East Africa</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-triangle"></i>
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-group">
              <i className="fas fa-user"></i>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                className={errors.username ? "error" : ""}
                disabled={loading}
              />
            </div>
            {errors.username && (
              <span className="error-text">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-group">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={errors.email ? "error" : ""}
                disabled={loading}
              />
            </div>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <div className="input-group">
              <i className="fas fa-user-circle"></i>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={errors.fullName ? "error" : ""}
                disabled={loading}
              />
            </div>
            {errors.fullName && (
              <span className="error-text">{errors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
            <div className="input-group">
              <i className="fas fa-globe-africa"></i>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={errors.country ? "error" : ""}
                disabled={loading}
              >
                {EAST_AFRICAN_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.countryCode})
                  </option>
                ))}
              </select>
            </div>
            {errors.country && (
              <span className="error-text">{errors.country}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              Phone Number <span className="optional">(Optional)</span>
            </label>
            <div className="input-group">
              <i className="fas fa-phone"></i>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={getCountryByCode(formData.country).exampleNumber}
                className={errors.phone ? "error" : ""}
                disabled={loading}
              />
            </div>
            <div className="field-hint">
              <small>
                <i className="fas fa-info-circle"></i>
                Format: {getCountryByCode(formData.country).phoneFormat}
              </small>
            </div>
            {errors.phone && <span className="error-text">{errors.phone}</span>}
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
                placeholder="Create a password"
                className={errors.password ? "error" : ""}
                disabled={loading}
              />
            </div>
            <div className="password-requirements">
              <small>
                <i className="fas fa-info-circle"></i>
                Password must be at least 6 characters and contain uppercase,
                lowercase, and number
              </small>
            </div>
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-group">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={errors.confirmPassword ? "error" : ""}
                disabled={loading}
              />
            </div>
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
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
                Creating Account...
              </>
            ) : (
              <>
                <i className="fas fa-user-plus"></i>
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Info Section */}
        <div className="auth-info">
          <h3>Why Join Us?</h3>
          <ul>
            <li>
              <i className="fas fa-check"></i> Discover amazing events
            </li>
            <li>
              <i className="fas fa-check"></i> Easy ticket booking
            </li>
            <li>
              <i className="fas fa-check"></i> Manage your tickets
            </li>
            <li>
              <i className="fas fa-check"></i> Get event updates
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;
