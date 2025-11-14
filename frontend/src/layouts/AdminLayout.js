import React from "react";
import AdminNavbar from "../components/admin/AdminNavbar";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout sidebar-layout">
      <AdminNavbar />
      <main className="main-content with-sidebar">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

