import api from "./api";
import { imageForm } from "./users.service";

export const institutionsService = {
  getPublic: () => api.get("/public/institutions"),
  resolveByDomain: (domain) =>
    api.get("/public/institutions/resolve", { params: { domain } }),

  getMine: () => api.get("/institutions/me"),
  updateMine: (data) => api.patch("/institutions/me", data),
  uploadLogo: (file) =>
    api.post("/institutions/me/logo", imageForm(file), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  downloadReport: (report, params) =>
    api.get(`/institutions/reports/${report}`, { params, responseType: "blob" }),
  getCurrencies: () => api.get("/institutions/currencies"),
  getPlans: () => api.get("/institutions/plans"),
  getAnalytics: () => api.get("/institutions/analytics"),
  getStudents: (params) => api.get("/institutions/students", { params }),
  getSubsidies: () => api.get("/institutions/subsidies"),
  getPlatformEarnings: () => api.get("/institutions/platform-earnings"),
  rechargeInstitution: (data) => api.post("/institutions/recharge", data),
  createOrder: (data) => api.post("/institutions/create-order", data),
  captureOrder: (data) => api.post("/institutions/capture-order", data),

  getList: (params) => api.get("/institutions", { params }),
  getById: (id) => api.get(`/institutions/${id}`),
  create: (data) => api.post("/institutions", data),
  update: (id, data) => api.put(`/institutions/${id}`, data),
  remove: (id) => api.delete(`/institutions/${id}`),
  changeStatus: (id, data) => api.patch(`/institutions/${id}/status`, data),

  getSubscription: () => api.get("/institutions/subscription"),
  assignPlan: (data) => api.post("/institutions/subscription", data),

  getAuditLogs: (params) => api.get("/institutions/audit-logs", { params }),

  getTemplates: (params) => api.get("/institutions/templates", { params }),
  applyTemplate: (code, data) =>
    api.post(`/institutions/templates/${code}/apply`, data),

  getDomains: () => api.get("/institutions/domains"),
  addDomain: (data) => api.post("/institutions/domains", data),
  removeDomain: (id) => api.delete(`/institutions/domains/${id}`),
  makeDomainPrimary: (id) => api.post(`/institutions/domains/${id}/primary`),
  startDomainVerification: (id, data) =>
    api.post(`/institutions/domains/${id}/verification`, data),
  verifyDomain: (id, data) => api.post(`/institutions/domains/${id}/verify`, data),

  getInvitations: (params) => api.get("/institutions/invitations", { params }),
  createInvitation: (data) => api.post("/institutions/invitations", data),
  createMember: (data) => api.post("/institutions/members", data),
  revokeInvitation: (id) => api.delete(`/institutions/invitations/${id}`),
  resendInvitation: (id) => api.post(`/institutions/invitations/${id}/resend`),

  importStudents: (csv, params) =>
    api.post("/institutions/imports/students", csv, {
      params,
      headers: { "Content-Type": "text/csv" },
    }),
  importSubjects: (csv, params) =>
    api.post("/institutions/imports/subjects", csv, {
      params,
      headers: { "Content-Type": "text/csv" },
    }),

  getAdminPlans: () => api.get("/institutions/admin/plans"),
  createPlan: (data) => api.post("/institutions/admin/plans", data),
  updatePlan: (id, data) => api.put(`/institutions/admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/institutions/admin/plans/${id}`),

  getExchangeRates: (params) =>
    api.get("/institutions/exchange-rates", { params }),
  createExchangeRate: (data) => api.post("/institutions/exchange-rates", data),

  getUnits: (params) => api.get("/institutions/units", { params }),
  getSubjectsByUnit: (id, params) =>
    api.get(`/institutions/units/${id}/subjects`, { params }),
  createUnit: (data) => api.post("/institutions/units", data),
  updateUnit: (id, data) => api.put(`/institutions/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/institutions/units/${id}`),

  getGradeLevels: (unitId) =>
    api.get(`/institutions/units/${unitId}/grade-levels`),
  createGradeLevel: (unitId, data) =>
    api.post(`/institutions/units/${unitId}/grade-levels`, data),
  updateGradeLevel: (id, data) =>
    api.put(`/institutions/grade-levels/${id}`, data),
  deleteGradeLevel: (id) => api.delete(`/institutions/grade-levels/${id}`),

  getSubjects: (params) => api.get("/institutions/subjects", { params }),
  createSubject: (data) => api.post("/institutions/subjects", data),
  updateSubject: (id, data) => api.put(`/institutions/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/institutions/subjects/${id}`),
  assignSubjectToUnit: (unitId, subjectId) =>
    api.post(`/institutions/units/${unitId}/subjects`, { subjectId }),
  removeSubjectFromUnit: (unitId, subjectId) =>
    api.delete(`/institutions/units/${unitId}/subjects/${subjectId}`),
};
