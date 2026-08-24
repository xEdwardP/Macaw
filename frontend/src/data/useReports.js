import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { institutionsService } from "../services/institutions.service";
import { translateError } from "../i18n/translateError";

const save = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function useDownloadReport() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ report, params }) =>
      institutionsService.downloadReport(report, params),
    onSuccess: (blob, { report }) => {
      const stamp = new Date().toISOString().slice(0, 10);
      save(blob, `macaw-${report}-${stamp}.csv`);
      toast.success(t("institution:reports.downloaded"));
    },
    onError: (error) => toast.error(translateError(error)),
  });
}
