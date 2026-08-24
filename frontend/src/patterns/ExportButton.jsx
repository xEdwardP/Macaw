import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useDownloadReport } from "../data/useReports";
import Button from "../ui/Button";

export default function ExportButton({ report, params, variant = "secondary" }) {
  const { t } = useTranslation();
  const download = useDownloadReport();

  return (
    <Button
      variant={variant}
      loading={download.isPending}
      onClick={() => download.mutate({ report, params })}
    >
      <Download size={16} />
      <span className="hidden sm:block">{t("institution:reports.export")}</span>
    </Button>
  );
}
