import { useQuery } from "@tanstack/react-query";
import { reviewsService } from "../services/reviews.service";
import { aiService } from "../services/ai.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

export function useTutorReviews(tutorId, params, options = {}) {
  return useQuery({
    queryKey: queryKeys.reviews.byTutor(tutorId, params),
    queryFn: () => reviewsService.getTutorReviews(tutorId, params),
    enabled: Boolean(tutorId),
    ...options,
  });
}

export function useCreateReview(onSuccess) {
  return useMutationWithToast({
    mutationFn: reviewsService.create,
    success: "tutors:toast.reviewPublished",
    invalidate: [queryKeys.reviews.all(), queryKeys.sessions.all()],
    onSuccess,
  });
}

export function useRecommendations(options = {}) {
  return useQuery({
    queryKey: queryKeys.ai.recommendations(),
    queryFn: aiService.getRecommendations,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useReviewSummary(tutorId, options = {}) {
  return useQuery({
    queryKey: queryKeys.ai.reviewSummary(tutorId),
    queryFn: () => aiService.getReviewSummary(tutorId),
    enabled: Boolean(tutorId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}
