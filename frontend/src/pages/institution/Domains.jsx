import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Globe, Plus, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useAddDomain,
  useDomains,
  useMakeDomainPrimary,
  useRemoveDomain,
  useStartDomainVerification,
  useVerifyDomain,
} from "../../data/useInstitutionAdmin";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalFooter,
  SkeletonCards,
} from "../../ui";
import { ConfirmDialog, EmptyState, PageHeader, PageShell } from "../../patterns";
import DateTime from "../../domain/DateTime";

function AddDomainModal({ onClose }) {
  const { t } = useTranslation("institution");
  const [domain, setDomain] = useState("");
  const add = useAddDomain(onClose);

  return (
    <Modal open onClose={onClose} title={t("domains.add")} size="sm">
      <Input
        label={t("apply.domain")}
        placeholder="institucion.edu"
        hint={t("domains.addHint")}
        value={domain}
        onChange={(event) => setDomain(event.target.value)}
      />

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          disabled={!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain.trim())}
          loading={add.isPending}
          onClick={() => add.mutate({ domain: domain.trim().toLowerCase() })}
        >
          {t("common:action.add")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function VerifyModal({ domain, onClose }) {
  const { t } = useTranslation("institution");
  const [method, setMethod] = useState("dns");
  const [code, setCode] = useState("");

  const start = useStartDomainVerification();
  const verify = useVerifyDomain(onClose);

  const started = start.data?.method === method ? start.data : null;
  const record = started?.recordValue;

  const copy = () => {
    navigator.clipboard?.writeText(record);
    toast.success(t("common:action.copied"));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("domains.verifyTitle")}
      description={domain.domain}
    >
      <div className="flex gap-2 mb-5">
        {["dns", "email"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMethod(value)}
            aria-pressed={method === value}
            className={
              method === value
                ? "flex-1 py-2 rounded-lg text-sm font-medium bg-brand-solid text-brand-contrast"
                : "flex-1 py-2 rounded-lg text-sm font-medium bg-surface-sunken text-content-secondary"
            }
          >
            {t(`domains.method.${value}`)}
          </button>
        ))}
      </div>

      <p className="text-sm text-content-secondary mb-4">
        {t(`domains.methodHelp.${method}`, { domain: domain.domain })}
      </p>

      {!started ? (
        <Button
          block
          loading={start.isPending}
          onClick={() => start.mutate({ id: domain.id, method })}
        >
          {t(method === "dns" ? "domains.getCode" : "domains.sendCode")}
        </Button>
      ) : method === "dns" ? (
        <>
          <div className="bg-surface-sunken border border-line-default rounded-lg p-4">
            <p className="text-xs text-content-muted mb-1">
              {t("domains.txtRecord")}
            </p>
            <p className="font-mono text-sm text-content-primary break-all">
              {record}
            </p>
            <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={copy}>
              <Copy size={14} />
              {t("common:action.copy")}
            </Button>
          </div>

          <Alert tone="info" className="mt-4">
            {t("domains.dnsPropagation")}
          </Alert>

          <ModalFooter>
            <Button variant="secondary" block onClick={onClose}>
              {t("common:action.close")}
            </Button>
            <Button
              block
              loading={verify.isPending}
              onClick={() => verify.mutate({ id: domain.id, method: "dns" })}
            >
              {t("domains.verifyNow")}
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          <Alert tone="info" className="mb-4">
            {t("domains.emailSent", { email: started.sentTo })}
          </Alert>

          <Input
            label={t("domains.codeFromEmail")}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <ModalFooter>
            <Button variant="secondary" block onClick={onClose}>
              {t("common:action.close")}
            </Button>
            <Button
              block
              disabled={code.trim().length < 10}
              loading={verify.isPending}
              onClick={() =>
                verify.mutate({
                  id: domain.id,
                  method: "email",
                  token: code.trim(),
                })
              }
            >
              {t("domains.verifyNow")}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

export default function Domains() {
  const { t } = useTranslation("institution");
  const { data: domains, isLoading } = useDomains();
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [removing, setRemoving] = useState(null);

  const makePrimary = useMakeDomainPrimary();
  const remove = useRemoveDomain(() => setRemoving(null));

  return (
    <PageShell width="max-w-3xl">
      <PageHeader
        title={t("domains.title")}
        subtitle={t("domains.subtitle")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} />
            {t("domains.add")}
          </Button>
        }
      />

      <Alert tone="info" className="mb-6">
        {t("domains.whyVerify")}
      </Alert>

      {isLoading ? (
        <SkeletonCards count={2} />
      ) : (domains || []).length === 0 ? (
        <EmptyState
          icon={Globe}
          title={t("domains.empty")}
          description={t("domains.emptyBody")}
        />
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <Card key={domain.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-content-primary">
                      {domain.domain}
                    </span>
                    {domain.isPrimary && (
                      <Badge tone="brand">{t("domains.primary")}</Badge>
                    )}
                    <Badge tone={domain.verifiedAt ? "positive" : "warning"}>
                      {t(
                        domain.verifiedAt ? "domains.verified" : "domains.unverified",
                      )}
                    </Badge>
                  </div>

                  {domain.verifiedAt && (
                    <p className="text-xs text-content-muted mt-1">
                      {t("domains.verifiedOn")}{" "}
                      <DateTime value={domain.verifiedAt} /> ·{" "}
                      {t(`domains.method.${domain.verificationMethod || "manual"}`)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!domain.verifiedAt && (
                    <Button size="sm" onClick={() => setVerifying(domain)}>
                      <Check size={14} />
                      {t("domains.verify")}
                    </Button>
                  )}

                  {domain.verifiedAt && !domain.isPrimary && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => makePrimary.mutate(domain.id)}
                    >
                      <Star size={14} />
                      {t("domains.makePrimary")}
                    </Button>
                  )}

                  {!domain.isPrimary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common:action.delete")}
                      className="text-content-muted hover:text-danger-content"
                      onClick={() => setRemoving(domain)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {adding && <AddDomainModal onClose={() => setAdding(false)} />}
      {verifying && (
        <VerifyModal domain={verifying} onClose={() => setVerifying(null)} />
      )}
      {removing && (
        <ConfirmDialog
          open
          onClose={() => setRemoving(null)}
          title={t("domains.removeTitle")}
          description={removing.domain}
          tone="danger"
          confirmLabel={t("common:action.delete")}
          loading={remove.isPending}
          onConfirm={() => remove.mutate(removing.id)}
        >
          <p className="text-sm text-content-secondary">
            {t("domains.removeWarning")}
          </p>
        </ConfirmDialog>
      )}
    </PageShell>
  );
}
