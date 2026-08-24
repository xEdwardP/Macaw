import { useMutation, useQuery } from "@tanstack/react-query";
import { usersService } from "../services/users.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

export function useUsers(params) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersService.getAll(params),
  });
}

export function useCreateCoordinator(onSuccess) {
  return useMutationWithToast({
    mutationFn: usersService.createCoordinator,
    success: "admin:toast.coordinatorCreated",
    invalidate: [queryKeys.users.all()],
    onSuccess,
  });
}

export function useToggleUser(onSuccess) {
  return useMutationWithToast({
    mutationFn: usersService.toggleActive,
    success: "admin:toast.userToggled",
    invalidate: [queryKeys.users.all()],
    onSuccess,
  });
}

export function useUpdatePreferences() {
  return useMutation({ mutationFn: usersService.updatePreferences });
}
