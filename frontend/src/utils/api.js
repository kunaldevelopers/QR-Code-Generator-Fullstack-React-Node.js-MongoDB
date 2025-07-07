// API utility for backend communication
const API_BASE_URL = import.meta.env.PROD
  ? "https://qr-generator-advanced.onrender.com"
  : "http://localhost:5000";

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem("token");
  }

  // Common headers for API requests
  getHeaders(includeAuth = true) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.auth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `HTTP error! status: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
  }

  async register(email, password) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
  }

  async getCurrentUser() {
    return this.request("/api/auth/me");
  }

  // QR Code endpoints
  async createQRCode(qrData) {
    const formData = new FormData();

    // Add text content
    formData.append("text", qrData.text);
    formData.append("qrType", qrData.qrType);
    formData.append("enableTracking", qrData.enableTracking || true);

    // Add customization as JSON string (exclude logoFile since it's sent separately)
    if (qrData.customization) {
      const customizationForJson = { ...qrData.customization };
      delete customizationForJson.logoFile; // Remove logoFile from JSON
      formData.append("customization", JSON.stringify(customizationForJson));
    }

    // Add security as JSON string
    if (qrData.security) {
      formData.append("security", JSON.stringify(qrData.security));
    }

    // Add logo file if present
    if (qrData.logo || qrData.customization?.logoFile) {
      formData.append("logo", qrData.logo || qrData.customization.logoFile);
    }

    return this.request("/api/qrcodes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }

  async getQRCodes() {
    return this.request("/api/qrcodes");
  }

  async getQRCode(id) {
    return this.request(`/api/qrcodes/${id}`);
  }

  async deleteQRCode(id) {
    return this.request(`/api/qrcodes/${id}`, {
      method: "DELETE",
    });
  }

  async updateQRCode(id, updates) {
    return this.request(`/api/qrcodes/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Bulk operations
  async createBulkQRCodes(qrDataArray) {
    return this.request("/api/qrcodes/bulk", {
      method: "POST",
      body: JSON.stringify({ qrCodes: qrDataArray }),
    });
  }

  // Analytics endpoints
  async getAnalytics(qrCodeId) {
    return this.request(`/api/analytics/${qrCodeId}`);
  }

  async getDashboardAnalytics() {
    return this.request("/api/analytics/dashboard");
  }

  // Logo upload
  async uploadLogo(file) {
    const formData = new FormData();
    formData.append("logo", file);

    return this.request("/api/qrcodes/upload-logo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }

  // Track QR code scan
  async trackScan(qrCodeId, trackingId, password = null) {
    const endpoint = password
      ? `/api/analytics/track/${qrCodeId}/${trackingId}?password=${encodeURIComponent(
          password
        )}`
      : `/api/analytics/track/${qrCodeId}/${trackingId}`;

    return this.request(endpoint, { auth: false });
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;

// Export individual methods for convenience
export const {
  login,
  register,
  getCurrentUser,
  createQRCode,
  getQRCodes,
  getQRCode,
  deleteQRCode,
  updateQRCode,
  createBulkQRCodes,
  getAnalytics,
  getDashboardAnalytics,
  uploadLogo,
  trackScan,
} = apiClient;
