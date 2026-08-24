import api from "./api";

export const aiService = {
  getRecommendations: () => api.get("/ai/recommendations"),
  getReviewSummary: (tutorId) => api.get(`/ai/review-summary/${tutorId}`),
};
