import { BookOpen, GraduationCap, Shield, Users, UserCog, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import Badge from "../ui/Badge";

export const ROLES = {
  student: { tone: "info", icon: BookOpen },
  tutor: { tone: "brand", icon: GraduationCap },
  institution_admin: { tone: "warning", icon: Users },
  institution_staff: { tone: "neutral", icon: UserCog },
  guardian: { tone: "neutral", icon: Heart },
  platform_admin: { tone: "danger", icon: Shield },
};

export const ROLE_FILTER_VALUES = [
  "",
  "student",
  "tutor",
  "institution_admin",
  "institution_staff",
  "platform_admin",
];

export function useRoleFilterOptions() {
  const { t } = useTranslation();

  return ROLE_FILTER_VALUES.map((value) => ({
    value,
    label: t(`roleFilter.${value || "all"}`),
  }));
}

export default function RoleBadge({ role, withIcon = false, className }) {
  const { t } = useTranslation();
  const config = ROLES[role] || ROLES.student;
  const Icon = config.icon;

  return (
    <Badge tone={config.tone} className={className}>
      {withIcon && <Icon size={11} />}
      {t(`role.${role in ROLES ? role : "student"}`)}
    </Badge>
  );
}
