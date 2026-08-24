import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CheckCircle, Download, FileUp, Upload } from "lucide-react";
import { institutionsService } from "../../services/institutions.service";
import { queryKeys } from "../../data/queryKeys";
import { translateError } from "../../i18n/translateError";
import { Alert, Badge, Button, Card, SkeletonText } from "../../ui";
import { PageHeader, PageShell } from "../../patterns";
import { useUnitLabels } from "../../domain/useUnitLabels";
import { cn } from "../../ui/cn";

const ENTITIES = {
  students: {
    columns: ["email", "name", "unitCode", "gradeCode", "program", "termNumber"],
    required: ["email", "name"],
    identity: "email",
  },
  subjects: {
    columns: ["code", "name", "unitCode", "termNumber", "credits", "isGeneral"],
    required: ["code", "name"],
    identity: "subject",
  },
};

const STATUS_TONES = {
  created: "positive",
  skipped: "warning",
  failed: "danger",
};

function sampleCsv(entity) {
  const { columns } = ENTITIES[entity];
  const example =
    entity === "students"
      ? ["ana@institucion.edu", "Ana Pérez", "ING", "", "Ingeniería", "1"]
      : ["MAT101", "Cálculo I", "ING", "1", "4", "false"];

  return `${columns.join(",")}\n${example.join(",")}\n`;
}

export default function Imports() {
  const { t } = useTranslation("institution");
  const unitLabel = useUnitLabels();
  const queryClient = useQueryClient();
  const fileInput = useRef(null);

  const [entity, setEntity] = useState("students");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [committed, setCommitted] = useState(null);

  const config = ENTITIES[entity];

  const send = (dryRun) =>
    entity === "students"
      ? institutionsService.importStudents(csv, { dryRun })
      : institutionsService.importSubjects(csv, { dryRun });

  const run = useMutation({
    mutationFn: ({ dryRun }) => send(dryRun),
    onSuccess: (report, { dryRun }) => {
      if (dryRun) {
        setPreview(report);
        setCommitted(null);
        return;
      }
      setCommitted(report);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.institution.all() });
      toast.success(t("imports.done", { count: report.created }));
    },
    onError: (error) => {
      setPreview(null);
      toast.error(translateError(error));
    },
  });

  const readFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setCommitted(null);
    file.text().then(setCsv);
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCsv(entity)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `macaw-${entity}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const rows = preview?.rows || [];
  const problems = rows.filter((row) => row.status !== "created");

  return (
    <PageShell width="max-w-4xl">
      <PageHeader title={t("imports.title")} subtitle={t("imports.subtitle")} />

      <div className="flex gap-2 mb-6">
        {Object.keys(ENTITIES).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={entity === value}
            onClick={() => {
              setEntity(value);
              setCsv("");
              setFileName("");
              setPreview(null);
              setCommitted(null);
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              entity === value
                ? "bg-brand-solid text-brand-contrast border-transparent"
                : "bg-surface text-content-secondary border-line-default hover:border-line-strong",
            )}
          >
            {t(`imports.entity.${value}`, { units: unitLabel.plural })}
          </button>
        ))}
      </div>

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-content-primary mb-2">
          {t("imports.fileTitle")}
        </h2>
        <p className="text-sm text-content-secondary mb-4">
          {t("imports.columnsHelp")}{" "}
          <span className="font-mono text-xs text-content-primary">
            {config.columns.join(", ")}
          </span>
          . {t("imports.requiredHelp")}{" "}
          <span className="font-mono text-xs text-content-primary">
            {config.required.join(", ")}
          </span>
          .
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label={t("imports.pickFile")}
            onChange={(event) => readFile(event.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            <FileUp size={16} />
            {t("imports.pickFile")}
          </Button>

          <Button variant="ghost" onClick={downloadSample}>
            <Download size={16} />
            {t("imports.sample")}
          </Button>

          {fileName && (
            <span className="text-sm text-content-secondary truncate">
              {fileName}
            </span>
          )}
        </div>

        {csv && (
          <Button
            className="mt-5"
            loading={run.isPending && run.variables?.dryRun}
            onClick={() => run.mutate({ dryRun: true })}
          >
            <Upload size={16} />
            {t("imports.preview")}
          </Button>
        )}
      </Card>

      {run.isPending && run.variables?.dryRun && (
        <Card className="p-6">
          <SkeletonText lines={4} />
        </Card>
      )}

      {preview && (
        <Card className="p-6">
          <h2 className="font-semibold text-content-primary mb-1">
            {t("imports.previewTitle")}
          </h2>
          <p className="text-sm text-content-secondary mb-4">
            {t("imports.previewNothingWritten")}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {["created", "skipped", "failed"].map((key) => (
              <div
                key={key}
                className="rounded-lg border border-line-default p-3 text-center"
              >
                <p className="text-2xl font-bold text-content-primary">
                  {preview[key]}
                </p>
                <p className="text-xs text-content-secondary">
                  {t(`imports.count.${key}`)}
                </p>
              </div>
            ))}
          </div>

          {problems.length > 0 && (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-content-secondary border-b border-line-default">
                    <th className="py-2 pr-4 font-medium">{t("imports.line")}</th>
                    <th className="py-2 pr-4 font-medium">
                      {t(`imports.identity.${entity}`)}
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      {t("common:field.status")}
                    </th>
                    <th className="py-2 font-medium">{t("imports.reason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((row) => (
                    <tr
                      key={`${row.row}-${row[config.identity] || ""}`}
                      className="border-b border-line-subtle last:border-0"
                    >
                      <td className="py-2 pr-4 tabular-nums text-content-muted">
                        {row.row}
                      </td>
                      <td className="py-2 pr-4 text-content-primary break-all">
                        {row[config.identity] || "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge tone={STATUS_TONES[row.status]}>
                          {t(`imports.count.${row.status}`)}
                        </Badge>
                      </td>
                      <td className="py-2 text-content-secondary">
                        {t(`errors:${row.code}`, { defaultValue: row.message })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.failed > 0 ? (
            <Alert tone="warning" className="mb-4">
              {t("imports.hasErrors", { count: preview.failed })}
            </Alert>
          ) : null}

          <Button
            block
            size="lg"
            disabled={preview.created === 0}
            loading={run.isPending && !run.variables?.dryRun}
            onClick={() => run.mutate({ dryRun: false })}
          >
            {t("imports.commit", { count: preview.created })}
          </Button>
        </Card>
      )}

      {committed && (
        <Card className="p-6 text-center">
          <CheckCircle className="mx-auto text-positive-content mb-3" size={48} />
          <h2 className="text-xl font-bold text-content-primary mb-1">
            {t("imports.doneTitle")}
          </h2>
          <p className="text-sm text-content-secondary">
            {t("imports.doneBody", {
              created: committed.created,
              skipped: committed.skipped,
            })}
          </p>
        </Card>
      )}
    </PageShell>
  );
}
