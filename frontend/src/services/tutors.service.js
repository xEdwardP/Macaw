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
  listForVerification: (params) => api.get("/tutors/verification", { params }),
  reviewMembership: ({ id, ...body }) =>
    api.patch(`/tutors/verification/${id}`, body),
  inviteTutor: (body) => api.post("/tutors/verification/invite", body),
  getMyMemberships: () => api.get("/tutors/memberships"),
  getJoinableInstitutions: () => api.get("/tutors/memberships/joinable"),
  requestMembership: (body) => api.post("/tutors/memberships", body),
  respondToMembership: ({ id, accept }) =>
    api.post(`/tutors/memberships/${id}/respond`, { accept }),
};
