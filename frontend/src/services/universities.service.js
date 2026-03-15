import api from "./api";

export const universitiesService = {
  getFaculties: (params) => api.get("/universities/faculties", { params }),
  getSubjects: (params) => api.get("/universities/subjects", { params }),
  getSubjectsByFaculty: (id) =>
    api.get(`/universities/faculties/${id}/subjects`),
  getAnalytics: () => api.get("/universities/analytics"),
  getStudents: (params) => api.get("/universities/students", { params }),
  getSubsidies: () => api.get("/universities/subsidies"),
};
