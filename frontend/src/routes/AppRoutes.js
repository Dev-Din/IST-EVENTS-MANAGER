import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../App";

// Import pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import EventDetails from "../pages/EventDetails";
import Purchase from "../pages/Purchase";
import MyTickets from "../pages/MyTickets";
import Profile from "../pages/Profile";
import AdminDashboard from "../pages/AdminDashboard";
import SubAdminDashboard from "../pages/SubAdminDashboard";
import ManageEvents from "../pages/ManageEvents";
import ManageSubAdmins from "../pages/ManageSubAdmins";
import ManageClients from "../pages/ManageClients";
import Reports from "../pages/Reports";
import NotFound from "../pages/NotFound";
import AdminLogin from "../pages/AdminLogin";

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard based on role
    if (user.role === "super-admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === "sub-admin") {
      return <Navigate to="/subadmin/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Hidden Admin Login Route */}
      <Route path="/admin" element={<AdminLogin />} />

      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/events" element={<Home />} />
      <Route path="/events/:id" element={<EventDetails />} />

      {/* Auth Routes - Login handles its own redirection logic */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Client Routes */}
      <Route
        path="/purchase/:eventId"
        element={
          <ProtectedRoute>
            <Purchase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-tickets"
        element={
          <ProtectedRoute>
            <MyTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Super Admin Routes */}  
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={["super-admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute roles={["super-admin"]}>
            <ManageEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sub-admins"
        element={
          <ProtectedRoute roles={["super-admin"]}>
            <ManageSubAdmins />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute roles={["super-admin"]}>
            <ManageClients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={["super-admin"]}>
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* Sub Admin Routes */}
      <Route
        path="/subadmin/dashboard"
        element={
          <ProtectedRoute roles={["sub-admin"]}>
            <SubAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subadmin/events"
        element={
          <ProtectedRoute roles={["sub-admin"]}>
            <ManageEvents />
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
