import api from "./api";

export const universitiesService = {
  getFaculties: (params) => api.get("/universities/faculties", { params }),
  getSubjects: (params) => api.get("/universities/subjects", { params }),
  getSubjectsByFaculty: (id) =>
    api.get(`/universities/faculties/${id}/subjects`),
  getAnalytics: () => api.get("/universities/analytics"),
  getStudents: (params) => api.get("/universities/students", { params }),
  getSubsidies: () => api.get("/universities/subsidies"),
  rechargeUniversity: (data) => api.post("/universities/recharge", data),
  getList: () => api.get("/universities/list"),
  createUniversityOrder: (data) => api.post("/universities/create-order", data),
  captureUniversityOrder: (data) =>
    api.post("/universities/capture-order", data),
};
