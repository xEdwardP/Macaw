import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Landing from "./pages/public/Landing";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import TutorSearch from "./pages/student/TutorSearch";

import StudentDashboard from "./pages/student/Dashboard";
import TutorDashboard from "./pages/tutor/Dashboard";
import UniversityDashboard from "./pages/university/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import TutorProfile from "./pages/student/TutorProfile";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/login" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  const routes = {
    student: "/student/dashboard",
    tutor: "/tutor/dashboard",
    university: "/university/dashboard",
    admin: "/admin/dashboard",
  };
  return <Navigate to={routes[user?.role] || "/login"} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutors"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <TutorSearch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutors/:id"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <TutorProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutor/dashboard"
        element={
          <ProtectedRoute allowedRoles={["tutor"]}>
            <TutorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/university/dashboard"
        element={
          <ProtectedRoute allowedRoles={["university"]}>
            <UniversityDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
