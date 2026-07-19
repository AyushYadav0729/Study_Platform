import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
};

export default api;