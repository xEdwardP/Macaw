import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

const withoutEmpty = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.params) config.params = withoutEmpty(config.params);
  return config;
});

const unwrap = (payload) =>
  payload && typeof payload === "object" && "success" in payload
    ? payload.data
    : payload;

const readErrorPayload = async (data) => {
  if (!(data instanceof Blob)) return data;

  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
};

api.interceptors.response.use(
  (res) => unwrap(res.data),
  async (err) => {
    const isLoginAttempt = err.config?.url?.includes("/auth/login");

    if (err.response?.status === 401 && !isLoginAttempt) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }

    const payload = await readErrorPayload(err.response?.data);

    err.status = err.response?.status || null;
    err.code = payload?.error?.code || null;
    err.params = payload?.error?.params || null;
    err.userMessage = payload?.message || err.message;

    return Promise.reject(err);
  },
);

export default api;
