import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import api from "./services/api";
import ClientLayout from "./layouts/ClientLayout";
import AdminLayout from "./layouts/AdminLayout";
import NoNavbarLayout from "./layouts/NoNavbarLayout";

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (error) {
      console.log("Not authenticated");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);

      // Store JWT token in localStorage
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("token");
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      // Clear token even if logout fails
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const authValue = {
    user,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    isAdmin: user?.role === "super-admin",
    isSuperAdmin: user?.role === "super-admin",
    isSubAdmin: user?.role === "sub-admin",
    isClient: user?.role === "client",
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <Router>
        <AppContent />
      </Router>
    </AuthContext.Provider>
  );
}

// Separate component to use useLocation hook
function AppContent() {
  const location = useLocation();
  const { isAdmin, isSubAdmin } = useAuth();
  
  // Determine which layout to use based on route
  const isAdminRoute = location.pathname.startsWith("/admin/") || location.pathname.startsWith("/subadmin/");
  
  // Special case: admin login page should not have navbar
  const isAdminLoginPage = location.pathname === "/admin" || location.pathname === "/admin/";
  
  // Check if user is admin/sub-admin on profile page
  const isProfilePage = location.pathname === "/profile";
  const isAdminOnProfile = isProfilePage && (isAdmin || isSubAdmin);
  
  if (isAdminLoginPage) {
    return (
      <div className="App">
        <NoNavbarLayout>
          <AppRoutes />
        </NoNavbarLayout>
      </div>
    );
  }
  
  if (isAdminRoute || isAdminOnProfile) {
    return (
      <div className="App">
        <AdminLayout>
          <AppRoutes />
        </AdminLayout>
      </div>
    );
  }
  
  return (
    <div className="App">
      <ClientLayout>
        <AppRoutes />
      </ClientLayout>
    </div>
  );
}

export default App;
