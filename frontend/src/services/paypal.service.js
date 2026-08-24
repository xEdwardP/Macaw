import api from "./api";

export const paypalService = {
  createOrder: (data) => api.post("/paypal/create-order", data),
  captureOrder: (data) => api.post("/paypal/capture-order", data),
};
