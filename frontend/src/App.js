import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import AppRoutes from "./routes/AppRoutes";
import api from "./services/api";

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
  return (
    <div className="App sidebar-layout">
      <Navbar />
      <main className="main-content with-sidebar">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;
