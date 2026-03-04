import { useState, useEffect, useCallback } from "react";
import { api, setToken, clearToken } from "../lib/api";

interface User {
  id: number;
  username: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Imamo token — proveri da li je validan
    api("/api/admin/me")
      .then((data) => setUser({ id: data.userId, username: "admin" }))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
