import api from "./api";

const imageForm = (file) => {
  const form = new FormData();
  form.append("image", file);
  return form;
};

export const usersService = {
  getAll: (params) => api.get("/users", { params }),
  createCoordinator: (data) => api.post("/users/coordinators", data),
  toggleActive: (id) => api.put(`/users/${id}/toggle`),
  updatePreferences: (preferences) =>
    api.patch("/users/me/preferences", preferences),
  updateProfile: (changes) => api.patch("/users/me", changes),
  uploadAvatar: (file) =>
    api.post("/users/me/avatar", imageForm(file), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export { imageForm };
