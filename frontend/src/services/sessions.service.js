import api from "./api";

export const sessionsService = {
  getAll: () => api.get("/sessions"),
  getOne: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post("/sessions", data),
  confirm: (id) => api.put(`/sessions/${id}/confirm`),
  cancel: (id) => api.put(`/sessions/${id}/cancel`),
  complete: (id) => api.put(`/sessions/${id}/complete`),
};
