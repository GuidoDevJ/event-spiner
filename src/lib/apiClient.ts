"use client";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const apiClient = axios.create();

// Inject the current access token on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let queue: QueueItem[] = [];

function drainQueue(err: unknown, token?: string) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  queue = [];
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while a refresh is in progress
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post("/api/v1/auth/refresh");
      const newToken: string = data.data.accessToken;
      const { user, setAuth } = useAuthStore.getState();
      setAuth(newToken, user);
      drainQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshErr) {
      drainQueue(refreshErr);
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") window.location.href = "/admin/login";
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
