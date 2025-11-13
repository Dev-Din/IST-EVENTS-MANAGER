import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import "./AdminSidebar.css";

const AdminSidebar = () => {
  const { user, logout, isAdmin, isSubAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Show sidebar for both super-admins and sub-admins on their respective routes
  const isAdminRoute = location.pathname.startsWith("/admin/");
  const isSubAdminRoute = location.pathname.startsWith("/subadmin/");
  
  if (!isAdminRoute && !isSubAdminRoute) {
    return null;
  }

  // Show admin sidebar for super-admins on admin routes
  if (isAdminRoute && !isAdmin) {
    return null;
  }

  // Show sub-admin sidebar for sub-admins on subadmin routes
  if (isSubAdminRoute && !isSubAdmin) {
    return null;
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <Link 
          to={isAdminRoute ? "/admin/dashboard" : "/subadmin/dashboard"} 
          className="sidebar-logo"
        >
          <img
            src={`/legit-events.png?v=${Date.now()}`}
            alt="LegitEvents Logo"
            className="sidebar-logo-img"
            onError={(e) => {
              console.log("Logo failed to load:", e);
              e.target.style.display = "none";
            }}
            onLoad={() => console.log("Logo loaded successfully")}
          />
        </Link>
      </div>

      <nav className="sidebar-nav">
        {isAdminRoute && isAdmin && (
          <>
            <Link
              to="/admin/dashboard"
              className={`sidebar-link ${isActive("/admin/dashboard") ? "active" : ""}`}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
            <Link
              to="/admin/events"
              className={`sidebar-link ${isActive("/admin/events") ? "active" : ""}`}
            >
              <i className="fas fa-calendar"></i>
              <span>Events</span>
            </Link>
            <Link
              to="/admin/sub-admins"
              className={`sidebar-link ${isActive("/admin/sub-admins") ? "active" : ""}`}
            >
              <i className="fas fa-users-cog"></i>
              <span>Sub Admins</span>
            </Link>
            <Link
              to="/admin/clients"
              className={`sidebar-link ${isActive("/admin/clients") ? "active" : ""}`}
            >
              <i className="fas fa-users"></i>
              <span>Clients</span>
            </Link>
            <Link
              to="/admin/reports"
              className={`sidebar-link ${isActive("/admin/reports") ? "active" : ""}`}
            >
              <i className="fas fa-chart-bar"></i>
              <span>Reports</span>
            </Link>
            <Link
              to="/admin/transaction-logs"
              className={`sidebar-link ${isActive("/admin/transaction-logs") ? "active" : ""}`}
            >
              <i className="fas fa-file-invoice-dollar"></i>
              <span>Transaction Logs</span>
            </Link>
          </>
        )}
        {isSubAdminRoute && isSubAdmin && (
          <>
            <Link
              to="/subadmin/dashboard"
              className={`sidebar-link ${isActive("/subadmin/dashboard") ? "active" : ""}`}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
            <Link
              to="/subadmin/events"
              className={`sidebar-link ${isActive("/subadmin/events") ? "active" : ""}`}
            >
              <i className="fas fa-calendar"></i>
              <span>Events</span>
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <Link to="/profile" className="sidebar-link">
          <i className="fas fa-user"></i>
          <span>Profile</span>
        </Link>
        <Link to="/" className="sidebar-link">
          <i className="fas fa-home"></i>
          <span>Home</span>
        </Link>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;

