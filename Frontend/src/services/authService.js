import axios from "axios";

// Falls back to localhost for local dev; set VITE_API_URL in .env for
// staging/production so the frontend never hardcodes a backend host.
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Centralized 401 handling: if the token is invalid/expired, clear it and
// bounce to login instead of leaving the app in a broken authenticated state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const formData = new URLSearchParams();

    formData.append("username", email);
    formData.append("password", password);

    return api.post("/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  signup: (userData) => api.post("/signup", userData),

  getProfile: async () => {
    return api.get("/profile");
  },

  logout: () => {
    localStorage.removeItem("authToken");
  },

  isAuthenticated: () => Boolean(localStorage.getItem("authToken")),
};

export default api;
