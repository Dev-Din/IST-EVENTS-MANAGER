import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import { adminAPI } from "../services/api";
import "./ManageUsers.css";

const ManageSubAdmins = () => {
  const { user, isSuperAdmin } = useAuth();
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    permissions: [],
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      setError("Access denied. Super Admin permissions required.");
      setLoading(false);
      return;
    }
    fetchSubAdmins();
  }, [isSuperAdmin]);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSubAdmins();
      setSubAdmins(response.data.subAdmins || []);
      setError("");
    } catch (error) {
      console.error("Error fetching sub-admins:", error);
      setError("Failed to load sub-admins");
      // Mock data for demo purposes
      setSubAdmins([
        {
          _id: "1",
          username: "subadmin1",
          email: "subadmin1@example.com",
          fullName: "John Smith",
          phone: "+1-555-0123",
          permissions: ["events", "tickets"],
          isActive: true,
          createdAt: "2024-01-15T10:30:00Z",
        },
        {
          _id: "2",
          username: "subadmin2",
          email: "subadmin2@example.com",
          fullName: "Sarah Johnson",
          phone: "+1-555-0456",
          permissions: ["events"],
          isActive: false,
          createdAt: "2024-01-20T14:15:00Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phone: "",
      permissions: [],
    });
    setShowModal(true);
  };

  const handleEdit = (subAdmin) => {
    setEditingUser(subAdmin);
    setFormData({
      username: subAdmin.username,
      email: subAdmin.email,
      password: "",
      confirmPassword: "",
      fullName: subAdmin.fullName || "",
      phone: subAdmin.phone || "",
      permissions: subAdmin.permissions || [],
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (subAdminId, currentStatus) => {
    try {
      await adminAPI.toggleSubAdminStatus(subAdminId, !currentStatus);
      setSubAdmins(
        subAdmins.map((admin) =>
          admin._id === subAdminId
            ? { ...admin, isActive: !currentStatus }
            : admin
        )
      );
    } catch (error) {
      console.error("Error toggling sub-admin status:", error);
      alert("Failed to update sub-admin status");
    }
  };

  const handleDelete = async (subAdminId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this sub-admin? This action cannot be undone."
      )
    ) {
      try {
        await adminAPI.deleteSubAdmin(subAdminId);
        setSubAdmins(subAdmins.filter((admin) => admin._id !== subAdminId));
      } catch (error) {
        console.error("Error deleting sub-admin:", error);
        alert("Failed to delete sub-admin");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        permissions: formData.permissions,
        role: "sub-admin",
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await adminAPI.updateSubAdmin(editingUser._id, userData);
        setSubAdmins(
          subAdmins.map((admin) =>
            admin._id === editingUser._id ? { ...admin, ...userData } : admin
          )
        );
      } else {
        const response = await adminAPI.createSubAdmin(userData);
        setSubAdmins([response.data.subAdmin, ...subAdmins]);
      }

      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error saving sub-admin:", error);
      alert("Failed to save sub-admin");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePermissionChange = (permission) => {
    const currentPermissions = formData.permissions;
    const updatedPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission];

    setFormData({
      ...formData,
      permissions: updatedPermissions,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <Loading message="Loading sub-admins..." />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="access-denied">
        <i className="fas fa-lock"></i>
        <h2>Access Denied</h2>
        <p>You need Super Admin permissions to access this page.</p>
      </div>
    );
  }

  return (
    <div className="manage-users-page">
      <div className="container">
        <div className="page-header">
          <h1>Manage Sub-Admins</h1>
          <p>Create and manage sub-administrator accounts</p>
        </div>

        <div className="actions-bar">
          <button onClick={handleCreate} className="btn btn-primary">
            <i className="fas fa-plus"></i>
            Add Sub-Admin
          </button>
          <div className="users-count">{subAdmins.length} Sub-Admins Total</div>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={fetchSubAdmins} className="btn btn-sm">
              Try Again
            </button>
          </div>
        )}

        {subAdmins.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-user-plus"></i>
            <h3>No Sub-Admins Yet</h3>
            <p>
              Create your first sub-admin account to delegate management tasks.
            </p>
            <button onClick={handleCreate} className="btn btn-primary">
              Add Sub-Admin
            </button>
          </div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subAdmins.map((admin) => (
                  <tr key={admin._id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <div className="user-name">
                            {admin.fullName || admin.username}
                          </div>
                          <div className="user-username">@{admin.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{admin.email}</div>
                        {admin.phone && (
                          <div className="phone">{admin.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="permissions">
                        {admin.permissions?.map((permission) => (
                          <span key={permission} className="permission-badge">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          admin.isActive ? "active" : "inactive"
                        }`}
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{formatDate(admin.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(admin)}
                          className="btn btn-sm btn-outline"
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() =>
                            handleToggleStatus(admin._id, admin.isActive)
                          }
                          className={`btn btn-sm ${
                            admin.isActive ? "btn-outline" : "btn-success"
                          }`}
                          title={admin.isActive ? "Deactivate" : "Activate"}
                        >
                          <i
                            className={`fas ${
                              admin.isActive ? "fa-ban" : "fa-check"
                            }`}
                          ></i>
                        </button>
                        <button
                          onClick={() => handleDelete(admin._id)}
                          className="btn btn-sm btn-danger"
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sub-Admin Form Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingUser ? "Edit Sub-Admin" : "Create New Sub-Admin"}
          size="medium"
        >
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">
                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingUser}
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password {editingUser ? "" : "*"}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={!editingUser || formData.password}
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Permissions</label>
              <div className="permissions-grid">
                <label className="permission-option">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes("events")}
                    onChange={() => handlePermissionChange("events")}
                  />
                  <span>Manage Events</span>
                </label>
                <label className="permission-option">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes("tickets")}
                    onChange={() => handlePermissionChange("tickets")}
                  />
                  <span>Manage Tickets</span>
                </label>
                <label className="permission-option">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes("reports")}
                    onChange={() => handlePermissionChange("reports")}
                  />
                  <span>View Reports</span>
                </label>
                <label className="permission-option">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes("clients")}
                    onChange={() => handlePermissionChange("clients")}
                  />
                  <span>View Clients</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingUser ? "Update Sub-Admin" : "Create Sub-Admin"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ManageSubAdmins;
