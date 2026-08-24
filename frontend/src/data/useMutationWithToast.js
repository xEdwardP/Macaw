import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { translateError } from "../i18n/translateError";

export function useMutationWithToast({
  mutationFn,
  success,
  invalidate = [],
  onSuccess,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (success) toast.success(t(success));
      for (const key of invalidate)
        queryClient.invalidateQueries({ queryKey: key });
      onSuccess?.(data, variables);
    },
    onError: (err) => toast.error(translateError(err)),
  });
}
