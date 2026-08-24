import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Award,
  Clock,
  MailPlus,
  ShieldCheck,
  ShieldOff,
  Star,
} from "lucide-react";
import {
  useInviteTutor,
  useReviewMembership,
  useTutorsForVerification,
} from "../../data/useTutors";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalFooter,
  SkeletonCards,
  Textarea,
} from "../../ui";
import {
  EmptyState,
  ExportButton,
  FilterBar,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
} from "../../patterns";
import Avatar from "../../ui/Avatar";
import DateTime from "../../domain/DateTime";
import Money from "../../domain/Money";

const LIMIT = 10;

const STATUS_TONES = {
  pending: "warning",
  verified: "positive",
  rejected: "neutral",
};

function ReviewModal({ membership, status, onClose }) {
  const { t } = useTranslation("tutors");
  const [note, setNote] = useState("");
  const save = useReviewMembership(onClose);
  const approving = status === "verified";

  return (
    <Modal
      open
      onClose={onClose}
      title={t(approving ? "verification.approveTitle" : "verification.rejectTitle")}
      description={membership.tutor.name}
      size="sm"
    >
      <Textarea
        label={t("verification.note")}
        hint={t("verification.noteHint")}
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("verification.notePlaceholder")}
      />

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          variant={approving ? "success" : "danger"}
          block
          loading={save.isPending}
          onClick={() =>
            save.mutate({
              id: membership.id,
              status,
              ...(note.trim() ? { note: note.trim() } : {}),
            })
          }
        >
          {t(approving ? "verification.approve" : "verification.reject")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function InviteTutorModal({ onClose }) {
  const { t } = useTranslation("tutors");
  const [email, setEmail] = useState("");
  const invite = useInviteTutor(onClose);

  return (
    <Modal
      open
      onClose={onClose}
      title={t("verification.inviteTitle")}
      description={t("verification.inviteSubtitle")}
      size="sm"
    >
      <Input
        label={t("verification.inviteEmail")}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          disabled={!/.+@.+\..+/.test(email)}
          loading={invite.isPending}
          onClick={() => invite.mutate({ email: email.trim() })}
        >
          {t("verification.inviteSend")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function TutorVerification() {
  const { t } = useTranslation("tutors");
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState(null);
  const [inviting, setInviting] = useState(false);

  const { data, isLoading } = useTutorsForVerification({
    status: status || undefined,
    search: search || undefined,
    page,
    limit: LIMIT,
  });

  const memberships = data?.data || [];

  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <PageShell>
      <PageHeader
        title={t("verification.title")}
        subtitle={t("verification.subtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setInviting(true)}>
              <MailPlus size={16} />
              {t("verification.inviteTutor")}
            </Button>
            <ExportButton report="tutors" />
          </div>
        }
      />

      <SearchInput
        value={search}
        onChange={filter(setSearch)}
        placeholder={t("verification.searchPlaceholder")}
        label={t("verification.searchLabel")}
        className="mb-4"
      />

      <FilterBar
        value={status}
        onChange={filter(setStatus)}
        options={[
          { value: "", label: t("verification.all") },
          { value: "pending", label: t("verification.pending") },
          { value: "verified", label: t("verification.verified") },
          { value: "rejected", label: t("verification.rejected") },
        ]}
        className="mb-6"
      />

      {isLoading ? (
        <SkeletonCards count={4} />
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={Award}
          title={t("verification.emptyTitle")}
          description={t("verification.emptyBody")}
        />
      ) : (
        <>
          <div className="space-y-3">
            {memberships.map((membership, index) => {
              const { tutor } = membership;
              const invited = membership.origin === "institution";
              const waitingTutor = invited && membership.status === "pending";

              return (
                <motion.div
                  key={membership.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-3 min-w-0 flex-1">
                        <Avatar name={tutor.name} src={tutor.avatar} size="md" />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-content-primary truncate">
                              {tutor.name}
                            </span>
                            <Badge tone={STATUS_TONES[membership.status]}>
                              {membership.status === "verified" && (
                                <ShieldCheck size={13} />
                              )}
                              {t(`verification.${membership.status}`)}
                            </Badge>
                          </div>

                          <p className="text-sm text-content-secondary truncate">
                            {tutor.email}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-content-muted">
                            <span className="flex items-center gap-1">
                              <Star size={12} className="text-rating fill-rating" />
                              {Number(
                                tutor.tutorProfile?.averageRating || 0,
                              ).toFixed(1)}
                            </span>
                            <span>
                              {t("common:unit.session", {
                                count: tutor.tutorProfile?.totalSessions || 0,
                              })}
                            </span>
                            <span>
                              {t("common:unit.subject", {
                                count: tutor.tutorProfile?.subjects?.length || 0,
                              })}
                            </span>
                            <Money
                              value={tutor.tutorProfile?.hourlyRate}
                              className="font-medium text-brand"
                            />
                          </div>

                          <p className="text-xs text-content-muted mt-1">
                            {t(invited ? "verification.invitedOn" : "verification.requestedOn")}{" "}
                            <DateTime value={membership.requestedAt} />
                            {" · "}
                            {t(
                              invited
                                ? "verification.originInstitution"
                                : "verification.originTutor",
                            )}
                          </p>

                          {tutor.institution &&
                            tutor.institutionId !== membership.institution.id && (
                              <p className="text-xs text-content-muted">
                                {t("verification.homeInstitution")}:{" "}
                                {tutor.institution.name}
                              </p>
                            )}

                          {membership.note && (
                            <p className="text-xs text-content-muted mt-1">
                              {membership.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {waitingTutor ? (
                        <Badge tone="neutral">
                          <Clock size={13} />
                          {t("verification.waitingTutor")}
                        </Badge>
                      ) : membership.status === "verified" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setReviewing({ membership, status: "rejected" })
                          }
                        >
                          <ShieldOff size={14} />
                          {t("verification.reject")}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() =>
                              setReviewing({ membership, status: "verified" })
                            }
                          >
                            <ShieldCheck size={14} />
                            {t("verification.approve")}
                          </Button>
                          {membership.status === "pending" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setReviewing({ membership, status: "rejected" })
                              }
                            >
                              {t("verification.reject")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={data?.totalPages || 1}
            total={data?.total || 0}
            limit={LIMIT}
            onChange={setPage}
            noun={t("search.noun")}
          />
        </>
      )}

      {reviewing && (
        <ReviewModal
          membership={reviewing.membership}
          status={reviewing.status}
          onClose={() => setReviewing(null)}
        />
      )}
      {inviting && <InviteTutorModal onClose={() => setInviting(false)} />}
    </PageShell>
  );
}
