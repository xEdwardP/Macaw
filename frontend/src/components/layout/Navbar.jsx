import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bird, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { NotificationBell } from "./NotificationsBell"; 

const NAV_LINKS = {
  student: [
    { label: "Inicio", to: "/student/dashboard" },
    { label: "Tutores", to: "/tutors" },
    { label: "Sesiones", to: "/student/sessions" },
    { label: "Wallet", to: "/student/wallet" },
  ],
  tutor: [
    { label: "Inicio", to: "/tutor/dashboard" },
    { label: "Sesiones", to: "/tutor/sessions" },
    { label: "Wallet", to: "/tutor/wallet" },
    { label: "Mi perfil", to: "/tutor/profile" },
  ],
  university: [
    { label: "Dashboard", to: "/university/dashboard" },
    { label: "Estudiantes", to: "/university/students" },
    { label: "Subsidios", to: "/university/subsidies" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Universidades", to: "/admin/universities" },
    { label: "Facultades", to: "/admin/faculties" },
    { label: "Materias", to: "/admin/subjects" },
    { label: "Usuarios", to: "/admin/users" },
    { label: "Sesiones", to: "/admin/sessions" },
    { label: "Retiros", to: "/admin/withdrawals" },
  ],
};

export default function Navbar() {
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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Bird className="text-orange-600" size={26} />
            <span className="text-xl font-bold text-orange-600">Macaw</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive(link.to)
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Sección de usuario + campanita */}
          <div className="hidden md:flex items-center gap-3">
            {/* Campanita de notificaciones */}
            {user && <NotificationBell userId={user.id} />}

            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-orange-100 flex items-center
                justify-center text-orange-600 font-bold text-sm"
              >
                {user?.name?.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.name?.split(" ")[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500
              hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="space-y-1 mb-4">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive(link.to)
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 pt-4 border-t border-gray-100">
              {user && <NotificationBell userId={user.id} />}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-orange-100 flex items-center
                  justify-center text-orange-600 font-bold text-sm"
                >
                  {user?.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600"
              >
                <LogOut size={16} />
                Salir
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}