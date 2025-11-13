import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import "./Navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin, isSubAdmin } = useAuth();
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
    <aside className={`navbar sidebar ${isMobileMenuOpen ? "active" : ""}`}>
      <div className="sidebar-header">
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

      <nav className={`nav-menu ${isMobileMenuOpen ? "active" : ""}`}>
        {/* Public Links */}
        <Link 
          to="/" 
          className={`nav-link ${isActive("/") ? "active" : ""}`}
          onClick={closeMobileMenu}
        >
          <i className="fas fa-home"></i>
          <span>Home</span>
        </Link>

        {isAuthenticated ? (
          <>
            {/* Client Links */}
            {!isAdmin && !isSubAdmin && (
              <Link
                to="/my-tickets"
                className={`nav-link ${isActive("/my-tickets") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <i className="fas fa-ticket-alt"></i>
                <span>My Tickets</span>
              </Link>
            )}

            {/* Admin Links */}
            {isAdmin && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`nav-link ${isActive("/admin/dashboard") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/admin/events"
                  className={`nav-link ${isActive("/admin/events") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-calendar"></i>
                  <span>Events</span>
                </Link>
                <Link
                  to="/admin/sub-admins"
                  className={`nav-link ${isActive("/admin/sub-admins") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-users-cog"></i>
                  <span>Sub Admins</span>
                </Link>
                <Link
                  to="/admin/clients"
                  className={`nav-link ${isActive("/admin/clients") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-users"></i>
                  <span>Clients</span>
                </Link>
                <Link
                  to="/admin/reports"
                  className={`nav-link ${isActive("/admin/reports") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-chart-bar"></i>
                  <span>Reports</span>
                </Link>
                <Link
                  to="/admin/transaction-logs"
                  className={`nav-link ${isActive("/admin/transaction-logs") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-file-invoice-dollar"></i>
                  <span>Transaction Logs</span>
                </Link>
              </>
            )}

            {/* Sub Admin Links */}
            {isSubAdmin && (
              <>
                <Link
                  to="/subadmin/dashboard"
                  className={`nav-link ${isActive("/subadmin/dashboard") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/subadmin/events"
                  className={`nav-link ${isActive("/subadmin/events") ? "active" : ""}`}
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-calendar"></i>
                  <span>Events</span>
                </Link>
              </>
            )}

            {/* Profile Link for all authenticated users */}
            <Link
              to="/profile"
              className={`nav-link ${isActive("/profile") ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <i className="fas fa-user-circle"></i>
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <>
            {/* Auth Links */}
            <Link 
              to="/login" 
              className={`nav-link ${isActive("/login") ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
            <Link
              to="/register"
              className={`nav-link register-link ${isActive("/register") ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <i className="fas fa-user-plus"></i>
              <span>Register</span>
            </Link>
          </>
        )}
      </nav>

      {isAuthenticated && (
        <div className="sidebar-footer">
          <div className="nav-user">
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <div className="nav-toggle" onClick={toggleMobileMenu}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </div>
    </aside>
  );
};

export default Navbar;
