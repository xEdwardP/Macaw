import Modal, { ModalFooter } from "../ui/Modal";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "primary",
  loading = false,
  children,
}) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      {children}

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose} disabled={loading}>
          {cancelLabel || t("action.cancel")}
        </Button>
        <Button variant={tone} block onClick={onConfirm} loading={loading}>
          {confirmLabel || t("action.confirm")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
