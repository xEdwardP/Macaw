import api from "./api";

export const tutorsService = {
  getAll: (params) => api.get("/tutors", { params }),
  getOne: (id) => api.get(`/tutors/${id}`),
  getAvailability: (id) => api.get(`/tutors/${id}/availability`),
  getBookedSlots: (id, date) => api.get(`/tutors/${id}/booked-slots`, { params: { date } }),
  updateProfile: (data) => api.put("/tutors/profile", data),
  addSubject: (data) => api.post("/tutors/subjects", data),
  removeSubject: (id) => api.delete(`/tutors/subjects/${id}`),
  setAvailability: (slots) => api.post("/tutors/availability", { slots }),
};
