import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { queryKeys } from "./queryKeys";

export function useSyncProfile() {
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: authService.profile,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const { data } = query;

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  return query;
}
