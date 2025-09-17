import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import "./Navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin, isSubAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

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

  return (
    <nav className="navbar">
      <div className="nav-container">
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

        <div className={`nav-menu ${isMobileMenuOpen ? "active" : ""}`}>
          {/* Public Links */}
          <Link to="/" className="nav-link" onClick={closeMobileMenu}>
            <i className="fas fa-home"></i>
            Home
          </Link>

          {isAuthenticated ? (
            <>
              {/* Client Links */}
              {!isAdmin && !isSubAdmin && (
                <Link
                  to="/my-tickets"
                  className="nav-link"
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-ticket-alt"></i>
                  My Tickets
                </Link>
              )}

              {/* Admin Links */}
              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-tachometer-alt"></i>
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/events"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-calendar"></i>
                    Events
                  </Link>
                  <Link
                    to="/admin/sub-admins"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-users-cog"></i>
                    Sub Admins
                  </Link>
                  <Link
                    to="/admin/clients"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-users"></i>
                    Clients
                  </Link>
                  <Link
                    to="/admin/reports"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-chart-bar"></i>
                    Reports
                  </Link>
                </>
              )}

              {/* Sub Admin Links */}
              {isSubAdmin && (
                <>
                  <Link
                    to="/subadmin/dashboard"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-tachometer-alt"></i>
                    Dashboard
                  </Link>
                  <Link
                    to="/subadmin/events"
                    className="nav-link"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-calendar"></i>
                    Events
                  </Link>
                </>
              )}

              {/* Profile Link for all authenticated users */}
              <Link
                to="/profile"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                <i className="fas fa-user-circle"></i>
                Profile
              </Link>

              {/* User Info & Logout */}
              <div className="nav-user">
                <span className="user-info">
                  <i className="fas fa-user"></i>
                  {user.username} ({user.role})
                </span>
                <button className="logout-btn" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Auth Links */}
              <Link to="/login" className="nav-link" onClick={closeMobileMenu}>
                <i className="fas fa-sign-in-alt"></i>
                Login
              </Link>
              <Link
                to="/register"
                className="nav-link register-link"
                onClick={closeMobileMenu}
              >
                <i className="fas fa-user-plus"></i>
                Register
              </Link>
            </>
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

export default Navbar;
