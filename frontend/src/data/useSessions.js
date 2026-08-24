import { useQuery } from "@tanstack/react-query";
import { sessionsService } from "../services/sessions.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

const affected = [
  queryKeys.sessions.all(),
  queryKeys.wallet.all(),
  queryKeys.institution.analytics(),
];

export function useSessions(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.sessions.list(params),
    queryFn: () => sessionsService.getAll(params),
    ...options,
  });
}

export function useSession(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => sessionsService.getOne(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: sessionsService.create,
    success: "sessions:toast.booked",
    invalidate: affected,
    onSuccess,
  });
}

export function useConfirmSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: sessionsService.confirm,
    success: "sessions:toast.confirmed",
    invalidate: affected,
    onSuccess,
  });
}

export function useCancelSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: sessionsService.cancel,
    success: "sessions:toast.cancelled",
    invalidate: affected,
    onSuccess,
  });
}

export function useCompleteSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: sessionsService.complete,
    success: "sessions:toast.completed",
    invalidate: affected,
    onSuccess,
  });
}

export function useStudentConfirmSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: sessionsService.studentConfirm,
    success: "sessions:toast.releasedPayment",
    invalidate: affected,
    onSuccess,
  });
}

export function useDisputeSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, reason }) => sessionsService.dispute(id, reason),
    success: "sessions:toast.reported",
    invalidate: affected,
    onSuccess,
  });
}

export function useResolveSession(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, favorOf }) => sessionsService.resolve(id, favorOf),
    success: "sessions:toast.disputeResolved",
    invalidate: affected,
    onSuccess,
  });
}
