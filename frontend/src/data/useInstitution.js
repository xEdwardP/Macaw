import { useQuery } from "@tanstack/react-query";
import { institutionsService } from "../services/institutions.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

export function useMyInstitution(options = {}) {
  return useQuery({
    queryKey: queryKeys.institution.mine(),
    queryFn: institutionsService.getMine,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useInstitutionByDomain(domain) {
  return useQuery({
    queryKey: queryKeys.institution.byDomain(domain),
    queryFn: () => institutionsService.resolveByDomain(domain).catch(() => null),
    enabled: Boolean(domain),
  });
}

export function useAnalytics(options = {}) {
  return useQuery({
    queryKey: queryKeys.institution.analytics(),
    queryFn: institutionsService.getAnalytics,
    ...options,
  });
}

export function useInstitutionStudents(params) {
  return useQuery({
    queryKey: queryKeys.institution.students(params),
    queryFn: () => institutionsService.getStudents(params),
  });
}

export function useSubsidies() {
  return useQuery({
    queryKey: queryKeys.institution.subsidies(),
    queryFn: institutionsService.getSubsidies,
  });
}

export function useInstitutions(params) {
  return useQuery({
    queryKey: queryKeys.institution.list(params),
    queryFn: () => institutionsService.getList(params),
  });
}

export function usePlatformEarnings() {
  return useQuery({
    queryKey: queryKeys.institution.platformEarnings(),
    queryFn: institutionsService.getPlatformEarnings,
  });
}

export function useUnits(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.institution.units(params),
    queryFn: () => institutionsService.getUnits(params),
    ...options,
  });
}

export function useUnitSubjects(unitId, params, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.institution.unitSubjects(unitId), params],
    queryFn: () => institutionsService.getSubjectsByUnit(unitId, params),
    enabled: Boolean(unitId),
    ...options,
  });
}

export function useSubjects(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.institution.subjects(params),
    queryFn: () => institutionsService.getSubjects(params),
    ...options,
  });
}

const institutionKeys = [
  queryKeys.institution.all(),
  queryKeys.institution.analytics(),
];

export function useRechargeInstitution(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.rechargeInstitution,
    success: "institution:toast.balanceRecharged",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useCreateUnit(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.createUnit,
    success: "institution:toast.unitCreated",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useUpdateUnit(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) => institutionsService.updateUnit(id, data),
    success: "institution:toast.unitUpdated",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useDeleteUnit(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.deleteUnit,
    success: "institution:toast.unitDeleted",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useCreateSubject(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.createSubject,
    success: "institution:toast.subjectCreated",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useUpdateSubject(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) => institutionsService.updateSubject(id, data),
    success: "institution:toast.subjectUpdated",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useDeleteSubject(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.deleteSubject,
    success: "institution:toast.subjectDeleted",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useAssignSubjectToUnit(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ unitId, subjectId }) =>
      institutionsService.assignSubjectToUnit(unitId, subjectId),
    success: "institution:toast.subjectAssigned",
    invalidate: institutionKeys,
    onSuccess,
  });
}

export function useRemoveSubjectFromUnit(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ unitId, subjectId }) =>
      institutionsService.removeSubjectFromUnit(unitId, subjectId),
    success: "institution:toast.subjectUnassigned",
    invalidate: institutionKeys,
    onSuccess,
  });
}
