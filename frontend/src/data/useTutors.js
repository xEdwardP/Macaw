import { useQuery } from "@tanstack/react-query";
import { tutorsService } from "../services/tutors.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

export function useTutors(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.list(params),
    queryFn: () => tutorsService.getAll(params),
    ...options,
  });
}

export function useTutor(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.detail(id),
    queryFn: () => tutorsService.getOne(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useTutorAvailability(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.availability(id),
    queryFn: () => tutorsService.getAvailability(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useBookedSlots(id, date, options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.bookedSlots(id, date),
    queryFn: () => tutorsService.getBookedSlots(id, date),
    enabled: Boolean(id && date),
    ...options,
  });
}

export function useUpdateTutorProfile(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.updateProfile,
    success: "tutors:toast.profileUpdated",
    invalidate: [queryKeys.tutors.all(), queryKeys.auth.profile()],
    onSuccess,
  });
}

export function useAddTutorSubject(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.addSubject,
    success: "tutors:toast.subjectAdded",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}

export function useRemoveTutorSubject(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.removeSubject,
    success: "tutors:toast.subjectRemoved",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}

export function useTutorsForVerification(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.verification(params),
    queryFn: () => tutorsService.listForVerification(params),
    ...options,
  });
}

export function useReviewMembership(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.reviewMembership,
    success: "tutors:toast.verificationSaved",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}

export function useInviteTutor(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.inviteTutor,
    success: "tutors:toast.tutorInvited",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}

export function useMyMemberships(options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.memberships(),
    queryFn: tutorsService.getMyMemberships,
    ...options,
  });
}

export function useJoinableInstitutions(options = {}) {
  return useQuery({
    queryKey: queryKeys.tutors.joinable(),
    queryFn: tutorsService.getJoinableInstitutions,
    ...options,
  });
}

export function useRequestMembership(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.requestMembership,
    success: "tutors:toast.membershipRequested",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}

export function useRespondToMembership(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.respondToMembership,
    success: "tutors:toast.membershipAnswered",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}

export function useSetAvailability(onSuccess) {
  return useMutationWithToast({
    mutationFn: tutorsService.setAvailability,
    success: "tutors:toast.availabilitySaved",
    invalidate: [queryKeys.tutors.all()],
    onSuccess,
  });
}
