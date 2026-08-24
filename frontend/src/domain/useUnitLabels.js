import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";

const DEFAULT_TYPE = "university";

export function useUnitLabels(institutionType) {
  const { t } = useTranslation("units");
  const ownType = useAuthStore((state) => state.user?.institution?.type);
  const type = institutionType || ownType || DEFAULT_TYPE;

  const label = (key) =>
    t(`byInstitution.${type}.${key}`, {
      defaultValue: t(`byInstitution.${DEFAULT_TYPE}.${key}`),
    });

  return {
    type,
    singular: label("singular"),
    plural: label("plural"),
    pick: label("pick"),
    gradeSingular: label("gradeSingular"),
    gradePlural: label("gradePlural"),
    term: label("term"),
    typeName: t(`institutionType.${type}`, {
      defaultValue: t(`institutionType.${DEFAULT_TYPE}`),
    }),
    ofKind: (kind) => t(`kind.${kind}`, { defaultValue: label("singular") }),
  };
}
