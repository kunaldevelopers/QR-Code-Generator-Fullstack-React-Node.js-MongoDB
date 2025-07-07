import { useState, useEffect, createContext, useContext } from "react";
import toast from "react-hot-toast";
import apiClient from "../utils/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          // Verify token and get user data from backend
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Token verification failed:", error);
          // Clear invalid token
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiClient.login(email, password);

      const userData = {
        id: response.userId,
        email: response.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          response.email
        )}&background=3b82f6&color=fff`,
      };

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      toast.success("Login successful!");
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed");
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await apiClient.register(email, password);

      const userData = {
        id: response.userId,
        email: response.email,
        name: name || response.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name || response.email
        )}&background=3b82f6&color=fff`,
      };

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      toast.success("Registration successful!");
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed");
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
