import api from "./api";

export const reviewsService = {
  getTutorReviews: (tutorId, params) =>
    api.get(`/reviews/tutor/${tutorId}`, { params }),
  create: (data) => api.post("/reviews", data),
  remove: (id) => api.delete(`/reviews/${id}`),
};
