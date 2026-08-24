import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MailPlus, RotateCw, Trash2, UserPlus, Users } from "lucide-react";
import {
  useCreateInvitation,
  useCreateMember,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "../../data/useInstitutionAdmin";
import { INVITABLE_ROLES } from "../../domain/institutionTypes";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalFooter,
  Select,
  SkeletonCards,
} from "../../ui";
import {
  ConfirmDialog,
  CopyLink,
  EmptyState,
  FilterBar,
  PageHeader,
  PageShell,
  Pagination,
} from "../../patterns";
import DateTime from "../../domain/DateTime";
import RoleBadge from "../../domain/RoleBadge";

const LIMIT = 10;
const STATUSES = ["pending", "accepted", "revoked", "expired"];
const STATUS_TONES = {
  pending: "warning",
  accepted: "positive",
  revoked: "neutral",
  expired: "danger",
};

function InviteModal({ onClose, onCreated }) {
  const { t } = useTranslation("institution");
  const [values, setValues] = useState({
    email: "",
    name: "",
    role: "institution_admin",
  });
  const invite = useCreateInvitation((invitation) => {
    onCreated(invitation);
    onClose();
  });

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Modal open onClose={onClose} title={t("team.invite")} size="sm">
      <div className="space-y-4">
        <Input
          label={t("team.inviteEmail")}
          type="email"
          value={values.email}
          onChange={set("email")}
          required
        />
        <Input
          label={t("team.inviteName")}
          hint={t("team.inviteNameHint")}
          value={values.name}
          onChange={set("name")}
        />
        <Select
          label={t("team.inviteRole")}
          value={values.role}
          onChange={set("role")}
          options={INVITABLE_ROLES.map((value) => ({
            value,
            label: t(`common:role.${value}`),
          }))}
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          disabled={!/.+@.+\..+/.test(values.email)}
          loading={invite.isPending}
          onClick={() =>
            invite.mutate({
              email: values.email.trim(),
              name: values.name.trim() || undefined,
              role: values.role,
            })
          }
        >
          {t("team.send")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

const EMPTY_MEMBER = { name: "", email: "", password: "", role: "tutor" };

function CreateMemberModal({ onClose }) {
  const { t } = useTranslation("institution");
  const [values, setValues] = useState(EMPTY_MEMBER);
  const create = useCreateMember(onClose);

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const complete =
    values.name.trim().length > 1 &&
    /.+@.+\..+/.test(values.email) &&
    values.password.length >= 8;

  return (
    <Modal
      open
      onClose={onClose}
      title={t("member.createTitle")}
      description={t("member.createSubtitle")}
      size="sm"
    >
      <div className="space-y-4">
        <Input
          label={t("member.name")}
          value={values.name}
          onChange={set("name")}
          required
        />
        <Input
          label={t("member.email")}
          type="email"
          value={values.email}
          onChange={set("email")}
          required
        />
        <Select
          label={t("member.role")}
          value={values.role}
          onChange={set("role")}
          options={["tutor", "student"].map((value) => ({
            value,
            label: t(`common:role.${value}`),
          }))}
        />
        <Input
          label={t("member.password")}
          type="password"
          hint={t("member.passwordHint")}
          value={values.password}
          onChange={set("password")}
          required
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          disabled={!complete}
          loading={create.isPending}
          onClick={() =>
            create.mutate({
              name: values.name.trim(),
              email: values.email.trim(),
              password: values.password,
              role: values.role,
            })
          }
        >
          {t("member.submit")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function Team() {
  const { t } = useTranslation("institution");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [lastLink, setLastLink] = useState(null);

  const { data, isLoading } = useInvitations({
    status: status || undefined,
    page,
    limit: LIMIT,
  });

  const resend = useResendInvitation((invitation) => setLastLink(invitation));
  const revoke = useRevokeInvitation(() => setRevoking(null));

  const invitations = data?.data || [];

  return (
    <PageShell width="max-w-3xl">
      <PageHeader
        title={t("team.title")}
        subtitle={t("team.subtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <UserPlus size={16} />
              {t("member.create")}
            </Button>
            <Button onClick={() => setInviting(true)}>
              <MailPlus size={16} />
              {t("team.invite")}
            </Button>
          </div>
        }
      />

      <FilterBar
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        options={[
          { value: "", label: t("team.allStatuses") },
          ...STATUSES.map((value) => ({
            value,
            label: t(`team.status.${value}`),
          })),
        ]}
        className="mb-6"
      />

      {lastLink?.acceptUrl && (
        <Alert tone="info" title={t("team.linkTitle")} className="mb-6">
          <p className="mb-2">
            {t("team.linkBody", { email: lastLink.email })}
          </p>
          <CopyLink value={lastLink.acceptUrl} />
        </Alert>
      )}

      {isLoading ? (
        <SkeletonCards count={4} />
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("team.empty")}
          description={t("team.emptyBody")}
        />
      ) : (
        <>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-content-primary truncate">
                        {invitation.email}
                      </span>
                      <RoleBadge role={invitation.role} />
                      <Badge tone={STATUS_TONES[invitation.status]}>
                        {t(`team.status.${invitation.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-content-muted mt-1">
                      {invitation.status === "pending"
                        ? t("team.expiresOn")
                        : t("team.sentOn")}{" "}
                      <DateTime
                        value={
                          invitation.status === "pending"
                            ? invitation.expiresAt
                            : invitation.createdAt
                        }
                      />
                    </p>
                  </div>

                  {invitation.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={
                          resend.isPending && resend.variables === invitation.id
                        }
                        onClick={() => resend.mutate(invitation.id)}
                      >
                        <RotateCw size={14} />
                        {t("team.resend")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("team.revoke")}
                        className="text-content-muted hover:text-danger-content"
                        onClick={() => setRevoking(invitation)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={data?.totalPages || 1}
            total={data?.total || 0}
            limit={LIMIT}
            onChange={setPage}
            noun={t("team.noun")}
          />
        </>
      )}

      {inviting && (
        <InviteModal
          onClose={() => setInviting(false)}
          onCreated={setLastLink}
        />
      )}
      {creating && <CreateMemberModal onClose={() => setCreating(false)} />}
      {revoking && (
        <ConfirmDialog
          open
          onClose={() => setRevoking(null)}
          title={t("team.revokeTitle")}
          description={revoking.email}
          tone="danger"
          confirmLabel={t("team.revoke")}
          loading={revoke.isPending}
          onConfirm={() => revoke.mutate(revoking.id)}
        >
          <p className="text-sm text-content-secondary">
            {t("team.revokeWarning")}
          </p>
        </ConfirmDialog>
      )}
    </PageShell>
  );
}
