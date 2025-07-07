import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  withCredentials: true, // Important for session-based auth
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
    // Don't auto-redirect on 401 - let components handle authentication state
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
    return api.post(`/admin/export/${dataType}`, options, {
      responseType: "blob", // Important for file downloads
    });
  },
  getDashboardStats: () => api.get("/admin/dashboard"),
};

export default api;
