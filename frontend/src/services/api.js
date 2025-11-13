import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(
      `Making ${config.method?.toUpperCase()} request to: ${config.url}`
    );

    // Add JWT token to requests if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors by clearing token and redirecting to login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Don't auto-redirect - let components handle authentication state
    }

    console.log(
      `API Error: ${error.response?.status} - ${error.response?.statusText}`
    );
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  updateProfile: (userData) => api.put("/auth/profile", userData),
  updatePassword: (passwords) => api.put("/auth/password", passwords),
  updatePreferences: (preferences) => api.put("/auth/preferences", preferences),
  getProfileStats: () => api.get("/auth/profile-stats"),
  deleteAccount: (password) =>
    api.delete("/auth/account", { data: { password } }),
  // Password reset endpoints
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) =>
    api.put(`/auth/reset-password/${token}`, { password }),
  verifyTempCredentials: (credentials) =>
    api.post("/auth/verify-temp-credentials", credentials),
};

export const eventsAPI = {
  getAll: () => api.get("/events"),
  getById: (id) => api.get(`/events/${id}`),
  create: (eventData) => api.post("/events", eventData),
  update: (id, eventData) => api.put(`/events/${id}`, eventData),
  delete: (id) => api.delete(`/events/${id}`),
};

export const ticketsAPI = {
  purchase: (purchaseData) => api.post("/tickets/purchase", purchaseData),
  getMyTickets: () => api.get("/tickets/my-tickets"),
};

export const adminAPI = {
  getSubAdmins: () => api.get("/admin/sub-admins"),
  createSubAdmin: (userData) => api.post("/admin/sub-admins", userData),
  updateSubAdmin: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteSubAdmin: (id) => api.delete(`/admin/users/${id}`),
  toggleSubAdminStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getClients: () => api.get("/admin/clients"),
  toggleClientStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
  getReports: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.append("startDate", params.startDate);
    if (params.endDate) searchParams.append("endDate", params.endDate);
    if (params.type) searchParams.append("type", params.type);

    const queryString = searchParams.toString();
    return api.get(`/admin/reports${queryString ? `?${queryString}` : ""}`);
  },
  getSalesReport: (startDate, endDate) =>
    api.get(
      `/admin/reports?type=sales&startDate=${startDate}&endDate=${endDate}`
    ),
  getEventsReport: (startDate, endDate) =>
    api.get(
      `/admin/reports?type=events&startDate=${startDate}&endDate=${endDate}`
    ),
  exportData: (dataType, options = {}) => {
    const format = options.format || "csv";
    const endpoint = format === "pdf" 
      ? `/admin/export-pdf/${dataType}`
      : `/admin/export/${dataType}`;
    // Include role in body if provided
    const body = {
      startDate: options.startDate,
      endDate: options.endDate,
      role: options.role, // For filtering users by role
    };
    
    // Debug logging
    console.log("Frontend API - Export Data Request:", {
      endpoint,
      dataType,
      format,
      body: JSON.stringify(body),
      role: options.role,
      roleType: typeof options.role
    });
    
    return api.post(endpoint, body, {
      responseType: "blob", // Important for file downloads
    });
  },
  getDashboardStats: () => api.get("/admin/dashboard"),
};

export const paymentsAPI = {
  getTransactionLogs: () => api.get("/payments/logs"),
  getTransactionSummary: () => api.get("/payments/logs/summary"),
  exportPDF: () =>
    api.get("/payments/logs/export/pdf", {
      responseType: "blob",
    }),
  exportCSV: () =>
    api.get("/payments/logs/export/csv", {
      responseType: "blob",
    }),
};

export default api;
