import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import { usersService } from "../services/users.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";
import { useAuthStore } from "../store/authStore";

export function useForgotPassword(onSuccess) {
  return useMutation({ mutationFn: authService.forgotPassword, onSuccess });
}

export function useResetPassword(onSuccess) {
  return useMutationWithToast({
    mutationFn: authService.resetPassword,
    success: "auth:password.reset",
    onSuccess,
  });
}

export function useChangePassword(onSuccess) {
  return useMutationWithToast({
    mutationFn: authService.changePassword,
    success: "auth:password.changed",
    onSuccess,
  });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: authService.verifyEmail });
}

export function useResendVerification() {
  return useMutationWithToast({
    mutationFn: authService.resendVerification,
    success: "auth:verify.sent",
  });
}

export function useUpdateProfile(onSuccess) {
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutationWithToast({
    mutationFn: usersService.updateProfile,
    success: "auth:profile.saved",
    invalidate: [queryKeys.auth.profile(), queryKeys.tutors.all()],
    onSuccess: (data) => {
      updateUser(data);
      onSuccess?.(data);
    },
  });
}

export function useUploadAvatar(onSuccess) {
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutationWithToast({
    mutationFn: usersService.uploadAvatar,
    success: "auth:profile.avatarSaved",
    invalidate: [queryKeys.auth.profile(), queryKeys.tutors.all()],
    onSuccess: (data) => {
      updateUser(data);
      onSuccess?.(data);
    },
  });
}
