import api from "./api";

export const walletService = {
  getMyWallet: () => api.get("/wallet"),
  getTransactions: (params) => api.get("/wallet/transactions", { params }),
  recharge: (data) => api.post("/wallet/recharge", data),
  addSubsidy: (data) => api.post("/wallet/subsidy", data),
};
