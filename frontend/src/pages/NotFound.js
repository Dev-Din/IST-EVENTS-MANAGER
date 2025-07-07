import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import "./NotFound.css";

const NotFound = () => {
  const { isAuthenticated, isAdmin, isSubAdmin } = useAuth();

  const getHomeLink = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isSubAdmin) return "/subadmin/dashboard";
    return "/";
  };

  return (
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <div className="error-illustration">
            <div className="error-number">404</div>
            <div className="error-icon">
              <i className="fas fa-search"></i>
            </div>
          </div>

          <div className="error-text">
            <h1>Page Not Found</h1>
            <p>
              Oops! The page you're looking for doesn't exist. It might have
              been moved, deleted, or you entered the wrong URL.
            </p>
          </div>

          <div className="error-actions">
            <Link to={getHomeLink()} className="btn btn-primary">
              <i className="fas fa-home"></i>
              {isAuthenticated ? "Go to Dashboard" : "Go Home"}
            </Link>

            <Link to="/" className="btn btn-outline">
              <i className="fas fa-calendar"></i>
              Browse Events
            </Link>
          </div>

          <div className="help-section">
            <h3>What can you do?</h3>
            <ul className="help-list">
              <li>
                <i className="fas fa-check"></i>
                Check the URL for typos
              </li>
              <li>
                <i className="fas fa-check"></i>
                Use the navigation menu
              </li>
              <li>
                <i className="fas fa-check"></i>
                Browse our events
              </li>
              {!isAuthenticated && (
                <li>
                  <i className="fas fa-check"></i>
                  <Link to="/login">Sign in to your account</Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
