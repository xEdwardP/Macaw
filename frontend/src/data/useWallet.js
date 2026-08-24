import { useQuery } from "@tanstack/react-query";
import { walletService, withdrawalService } from "../services/wallet.service";
import { paypalService } from "../services/paypal.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

const affected = [
  queryKeys.wallet.all(),
  queryKeys.institution.analytics(),
  queryKeys.withdrawals.all(),
];

export function useMyWallet(options = {}) {
  return useQuery({
    queryKey: queryKeys.wallet.mine(),
    queryFn: walletService.getMyWallet,
    ...options,
  });
}

export function useTransactions(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.wallet.transactions(params),
    queryFn: () => walletService.getTransactions(params),
    ...options,
  });
}

export function useWithdrawals(options = {}) {
  return useQuery({
    queryKey: queryKeys.withdrawals.list(),
    queryFn: withdrawalService.getAll,
    ...options,
  });
}

export function useRecharge(onSuccess) {
  return useMutationWithToast({
    mutationFn: walletService.recharge,
    success: "wallet:toast.recharged",
    invalidate: affected,
    onSuccess,
  });
}

export function useAddSubsidy(onSuccess) {
  return useMutationWithToast({
    mutationFn: walletService.addSubsidy,
    success: "wallet:toast.subsidyApplied",
    invalidate: [...affected, queryKeys.institution.all()],
    onSuccess,
  });
}

export function useRequestWithdrawal(onSuccess) {
  return useMutationWithToast({
    mutationFn: withdrawalService.create,
    success: "wallet:toast.withdrawalRequested",
    invalidate: affected,
    onSuccess,
  });
}

export function useApproveWithdrawal(onSuccess) {
  return useMutationWithToast({
    mutationFn: withdrawalService.approve,
    success: "wallet:toast.withdrawalApproved",
    invalidate: affected,
    onSuccess,
  });
}

export function useRejectWithdrawal(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, notes }) => withdrawalService.reject(id, notes),
    success: "wallet:toast.withdrawalRejected",
    invalidate: affected,
    onSuccess,
  });
}

export function usePaypalOrder() {
  return {
    createOrder: (amount) =>
      paypalService.createOrder({ amount }).then((order) => order.id),
    captureOrder: (orderId) => paypalService.captureOrder({ orderId }),
  };
}
