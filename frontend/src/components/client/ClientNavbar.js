import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../App";
import "./ClientNavbar.css";

const ClientNavbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`client-navbar top-navbar ${isMobileMenuOpen ? "active" : ""}`}>
      <div className="navbar-container">
        {/* Left Side - Logo */}
        <div className="navbar-left">
          <Link to="/" className="nav-logo" onClick={closeMobileMenu}>
            <img
              src={`/legit-events.png?v=${Date.now()}`}
              alt="LegitEvents Logo"
              className="nav-logo-img"
              onError={(e) => {
                console.log("Logo failed to load:", e);
                e.target.style.display = "none";
              }}
              onLoad={() => console.log("Logo loaded successfully")}
            />
          </Link>
        </div>

        {/* Center - Navigation Links */}
        <div className={`navbar-center ${isMobileMenuOpen ? "active" : ""}`}>
          {isAuthenticated && (
            <>
              <Link
                to="/my-tickets"
                className={`nav-link ${isActive("/my-tickets") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <i className="fas fa-ticket-alt"></i>
                <span>My Tickets</span>
              </Link>

              <Link
                to="/profile"
                className={`nav-link ${isActive("/profile") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <i className="fas fa-user-circle"></i>
                <span>Profile</span>
              </Link>
            </>
          )}
        </div>

        {/* Right Side - Auth Button */}
        <div className="navbar-right">
          {isAuthenticated ? (
            <button className="nav-link logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          ) : (
            <Link 
              to="/login" 
              className={`nav-link ${isActive("/login") ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
          )}
        </div>

        <div className="nav-toggle" onClick={toggleMobileMenu}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
};

export default ClientNavbar;

