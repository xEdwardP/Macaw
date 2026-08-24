import { useQuery } from "@tanstack/react-query";
import { institutionsService } from "../services/institutions.service";
import { queryKeys } from "./queryKeys";
import { useMutationWithToast } from "./useMutationWithToast";

const scope = [queryKeys.institution.all()];
const scopeWithProfile = [
  queryKeys.institution.all(),
  queryKeys.auth.profile(),
];

export function useInstitution(id) {
  return useQuery({
    queryKey: queryKeys.institution.detail(id),
    queryFn: () => institutionsService.getById(id),
    enabled: Boolean(id),
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: queryKeys.institution.currencies(),
    queryFn: institutionsService.getCurrencies,
    staleTime: 60 * 60 * 1000,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.institution.plans(),
    queryFn: institutionsService.getPlans,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: queryKeys.institution.adminPlans(),
    queryFn: institutionsService.getAdminPlans,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.institution.subscription(),
    queryFn: institutionsService.getSubscription,
  });
}

export function useTemplates(type) {
  return useQuery({
    queryKey: queryKeys.institution.templates(type),
    queryFn: () => institutionsService.getTemplates({ type }),
  });
}

export function useDomains() {
  return useQuery({
    queryKey: queryKeys.institution.domains(),
    queryFn: institutionsService.getDomains,
  });
}

export function useInvitations(params) {
  return useQuery({
    queryKey: queryKeys.institution.invitations(params),
    queryFn: () => institutionsService.getInvitations(params),
  });
}

export function useAuditLogs(params) {
  return useQuery({
    queryKey: queryKeys.institution.auditLogs(params),
    queryFn: () => institutionsService.getAuditLogs(params),
  });
}

export function useGradeLevels(unitId) {
  return useQuery({
    queryKey: queryKeys.institution.gradeLevels(unitId),
    queryFn: () => institutionsService.getGradeLevels(unitId),
    enabled: Boolean(unitId),
  });
}

export function useUpdateMyInstitution(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.updateMine,
    success: "institution:toast.profileUpdated",
    invalidate: scopeWithProfile,
    onSuccess,
  });
}

export function useUploadInstitutionLogo(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.uploadLogo,
    success: "institution:toast.logoUpdated",
    invalidate: scopeWithProfile,
    onSuccess,
  });
}

export function useCreateInstitution(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.create,
    success: "institution:toast.created",
    invalidate: scope,
    onSuccess,
  });
}

export function useUpdateInstitution(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) => institutionsService.update(id, data),
    success: "institution:toast.profileUpdated",
    invalidate: scope,
    onSuccess,
  });
}

export function useChangeInstitutionStatus(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) => institutionsService.changeStatus(id, data),
    success: "institution:toast.statusChanged",
    invalidate: scope,
    onSuccess,
  });
}

export function useAssignPlan(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.assignPlan,
    success: "institution:toast.planAssigned",
    invalidate: scope,
    onSuccess,
  });
}

export function useApplyTemplate(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ code, ...data }) =>
      institutionsService.applyTemplate(code, data),
    success: "institution:toast.templateApplied",
    invalidate: scope,
    onSuccess,
  });
}

export function useAddDomain(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.addDomain,
    success: "institution:toast.domainAdded",
    invalidate: scope,
    onSuccess,
  });
}

export function useRemoveDomain(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.removeDomain,
    success: "institution:toast.domainRemoved",
    invalidate: scope,
    onSuccess,
  });
}

export function useMakeDomainPrimary(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.makeDomainPrimary,
    success: "institution:toast.domainPrimary",
    invalidate: scope,
    onSuccess,
  });
}

export function useStartDomainVerification(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) =>
      institutionsService.startDomainVerification(id, data),
    success: "institution:toast.verificationStarted",
    invalidate: scope,
    onSuccess,
  });
}

export function useVerifyDomain(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) => institutionsService.verifyDomain(id, data),
    success: "institution:toast.domainVerified",
    invalidate: scopeWithProfile,
    onSuccess,
  });
}

export function useCreateInvitation(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.createInvitation,
    success: "institution:toast.invitationSent",
    invalidate: scope,
    onSuccess,
  });
}

export function useCreateMember(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.createMember,
    success: "institution:member.created",
    invalidate: scope,
    onSuccess,
  });
}

export function useRevokeInvitation(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.revokeInvitation,
    success: "institution:toast.invitationRevoked",
    invalidate: scope,
    onSuccess,
  });
}

export function useResendInvitation(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.resendInvitation,
    success: "institution:toast.invitationResent",
    invalidate: scope,
    onSuccess,
  });
}

export function useCreateGradeLevel(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ unitId, ...data }) =>
      institutionsService.createGradeLevel(unitId, data),
    success: "institution:toast.gradeCreated",
    invalidate: scope,
    onSuccess,
  });
}

export function useUpdateGradeLevel(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) =>
      institutionsService.updateGradeLevel(id, data),
    success: "institution:toast.gradeUpdated",
    invalidate: scope,
    onSuccess,
  });
}

export function useDeleteGradeLevel(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.deleteGradeLevel,
    success: "institution:toast.gradeDeleted",
    invalidate: scope,
    onSuccess,
  });
}

export function useCreatePlan(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.createPlan,
    success: "admin:toast.planCreated",
    invalidate: scope,
    onSuccess,
  });
}

export function useUpdatePlan(onSuccess) {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }) => institutionsService.updatePlan(id, data),
    success: "admin:toast.planUpdated",
    invalidate: scope,
    onSuccess,
  });
}

export function useDeletePlan(onSuccess) {
  return useMutationWithToast({
    mutationFn: institutionsService.deletePlan,
    success: "admin:toast.planDeleted",
    invalidate: scope,
    onSuccess,
  });
}
