import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bird, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import PreferencesMenu from "./PreferencesMenu";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../../ui/Avatar";
import Button from "../../ui/Button";

const NAV_LINKS = {
  student: [
    { key: "home", to: "/student/dashboard" },
    { key: "tutors", to: "/tutors" },
    { key: "sessions", to: "/student/sessions" },
    { key: "wallet", to: "/student/wallet" },
  ],
  tutor: [
    { key: "home", to: "/tutor/dashboard" },
    { key: "sessions", to: "/tutor/sessions" },
    { key: "wallet", to: "/tutor/wallet" },
    { key: "myProfile", to: "/tutor/profile" },
    { key: "myInstitutions", to: "/tutor/institutions" },
  ],
  institution_admin: [
    { key: "dashboard", to: "/institution/dashboard" },
    { key: "students", to: "/institution/students" },
    { key: "tutors", to: "/institution/tutors" },
    { key: "subsidies", to: "/institution/subsidies" },
    { key: "units", to: "/institution/units" },
    { key: "subjects", to: "/institution/subjects" },
    { key: "team", to: "/institution/team" },
    { key: "settings", to: "/institution/settings" },
  ],
  platform_admin: [
    { key: "dashboard", to: "/admin/dashboard" },
    { key: "institutions", to: "/admin/institutions" },
    { key: "plans", to: "/admin/plans" },
    { key: "users", to: "/admin/users" },
    { key: "sessions", to: "/admin/sessions" },
    { key: "withdrawals", to: "/admin/withdrawals" },
  ],
};

export default function Navbar() {
  const { t } = useTranslation("nav");
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = NAV_LINKS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (to) => location.pathname === to;

  return (
    <nav className="bg-surface border-b border-line-default sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <Bird className="text-brand" size={26} />
            <span className="text-xl font-bold text-brand hidden sm:block">
              Macaw
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${
                    isActive(link.to)
                      ? "bg-brand-surface text-brand"
                      : "text-content-secondary hover:bg-surface-muted hover:text-content-primary"
                  }`}
              >
                {t(`link.${link.key}`)}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <NotificationBell />
            <UserMenu user={user} onSignOut={handleLogout} />
          </div>

          <NotificationBell className="md:hidden ml-auto" />

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            className="md:hidden p-2 rounded-lg text-content-secondary hover:bg-surface-muted"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden py-4 border-t border-line-subtle">
            <div className="space-y-1 mb-4">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive(link.to)
                        ? "bg-brand-surface text-brand"
                        : "text-content-secondary hover:bg-surface-muted"
                    }`}
                >
                  {t(`link.${link.key}`)}
                </Link>
              ))}
            </div>
            <div className="px-4 pb-4">
              <PreferencesMenu stacked />
            </div>
            <div className="flex items-center justify-between px-4 pt-4 border-t border-line-subtle gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={user?.name} size="sm" />
                <span className="text-sm font-medium text-content-primary truncate">
                  {user?.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-danger-content flex-shrink-0"
              >
                {t("signOut")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
