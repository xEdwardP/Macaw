import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Building, Check, Clock, Plus, ShieldCheck, X } from "lucide-react";
import {
  useJoinableInstitutions,
  useMyMemberships,
  useRequestMembership,
  useRespondToMembership,
} from "../../data/useTutors";
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  ModalFooter,
  Select,
  SkeletonCards,
} from "../../ui";
import { EmptyState, PageHeader, PageShell } from "../../patterns";
import DateTime from "../../domain/DateTime";

const STATUS_TONES = {
  pending: "warning",
  verified: "positive",
  rejected: "neutral",
};

function RequestModal({ onClose }) {
  const { t } = useTranslation("tutors");
  const [institutionId, setInstitutionId] = useState("");
  const { data, isLoading } = useJoinableInstitutions();
  const request = useRequestMembership(onClose);

  const institutions = data?.data || [];

  return (
    <Modal
      open
      onClose={onClose}
      title={t("memberships.requestTitle")}
      description={t("memberships.requestSubtitle")}
      size="sm"
    >
      {!isLoading && institutions.length === 0 ? (
        <Alert tone="info">{t("memberships.noneJoinable")}</Alert>
      ) : (
        <Select
          label={t("memberships.pickInstitution")}
          placeholder={t("memberships.pickInstitution")}
          value={institutionId}
          onChange={(event) => setInstitutionId(event.target.value)}
          options={institutions.map((institution) => ({
            value: institution.id,
            label: institution.name,
          }))}
          required
        />
      )}

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          disabled={!institutionId}
          loading={request.isPending}
          onClick={() => request.mutate({ institutionId })}
        >
          {t("memberships.send")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function MyInstitutions() {
  const { t } = useTranslation("tutors");
  const [requesting, setRequesting] = useState(false);

  const { data, isLoading } = useMyMemberships();
  const respond = useRespondToMembership();

  const memberships = data?.data || [];
  const verified = memberships.filter((row) => row.status === "verified");

  return (
    <PageShell width="max-w-3xl">
      <PageHeader
        title={t("memberships.title")}
        subtitle={t("memberships.subtitle")}
        actions={
          <Button onClick={() => setRequesting(true)}>
            <Plus size={16} />
            {t("memberships.request")}
          </Button>
        }
      />

      {!isLoading && memberships.length > 0 && verified.length === 0 && (
        <Alert tone="warning" title={t("memberships.blockedTitle")} className="mb-6">
          {t("memberships.blockedBody")}
        </Alert>
      )}

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={Building}
          title={t("memberships.empty")}
          description={t("memberships.emptyBody")}
        />
      ) : (
        <div className="space-y-3">
          {memberships.map((membership, index) => {
            const invited =
              membership.origin === "institution" &&
              membership.status === "pending";

            return (
              <motion.div
                key={membership.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-content-primary truncate">
                          {membership.institution.name}
                        </span>
                        <Badge tone={STATUS_TONES[membership.status]}>
                          {membership.status === "verified" && (
                            <ShieldCheck size={13} />
                          )}
                          {t(`memberships.status.${membership.status}`)}
                        </Badge>
                      </div>

                      {invited ? (
                        <p className="text-sm text-content-secondary mt-1">
                          {t("memberships.invitedBody", {
                            institution: membership.institution.name,
                          })}
                        </p>
                      ) : membership.status === "pending" ? (
                        <p className="text-sm text-content-secondary mt-1 flex items-center gap-1.5">
                          <Clock size={13} className="text-content-muted" />
                          {t("memberships.waiting", {
                            institution: membership.institution.name,
                          })}
                        </p>
                      ) : null}

                      {membership.status === "rejected" && membership.note && (
                        <p className="text-sm text-content-secondary mt-1">
                          {t("memberships.rejectedNote", { note: membership.note })}
                        </p>
                      )}

                      <p className="text-xs text-content-muted mt-1">
                        <DateTime value={membership.requestedAt} />
                      </p>
                    </div>

                    {invited && (
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          loading={
                            respond.isPending &&
                            respond.variables?.id === membership.id
                          }
                          onClick={() =>
                            respond.mutate({ id: membership.id, accept: true })
                          }
                        >
                          <Check size={14} />
                          {t("memberships.accept")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            respond.mutate({ id: membership.id, accept: false })
                          }
                        >
                          <X size={14} />
                          {t("memberships.decline")}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {requesting && <RequestModal onClose={() => setRequesting(false)} />}
    </PageShell>
  );
}
