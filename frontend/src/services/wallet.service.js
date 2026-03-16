import api from "./api";

export const walletService = {
  getMyWallet: () => api.get("/wallet"),
  getTransactions: (params) => api.get("/wallet/transactions", { params }),
  recharge: (data) => api.post("/wallet/recharge", data),
  addSubsidy: (data) => api.post("/wallet/subsidy", data),
};

export const withdrawalService = {
  getAll: () => api.get("/withdrawals"),
  create: (data) => api.post("/withdrawals", data),
  approve: (id) => api.put(`/withdrawals/${id}/approve`),
  reject: (id, notes) => api.put(`/withdrawals/${id}/reject`, { notes }),
};
