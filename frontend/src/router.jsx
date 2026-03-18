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
import BookSession from "./pages/student/BookSession";
import MySessions from "./pages/student/MySessions";
import MyWallet from "./pages/student/MyWallet";
import TutorMySessions from "./pages/tutor/MySessions";
import TutorMyWallet from "./pages/tutor/MyWallet";
import TutorMyProfile from "./pages/tutor/MyProfile";
import UniversityStudents from "./pages/university/Students";
import UniversitySubsidies from "./pages/university/Subsidies";
import AdminUsers from "./pages/admin/Users";
import AdminSessions from "./pages/admin/Sessions";
import AdminWithdrawals from "./pages/admin/Withdrawals";
import AdminUniversities from "./pages/admin/Universities";
import UniversityFaculties from "./pages/university/Faculties";
import UniversitySubjects from "./pages/university/Subjects";

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

      {/* Student routes */}

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
        path="/tutors/:id/book"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <BookSession />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/sessions"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <MySessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/wallet"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <MyWallet />
          </ProtectedRoute>
        }
      />

      {/* Tutor routes */}

      <Route
        path="/tutor/dashboard"
        element={
          <ProtectedRoute allowedRoles={["tutor"]}>
            <TutorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutor/sessions"
        element={
          <ProtectedRoute allowedRoles={["tutor"]}>
            <TutorMySessions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutor/wallet"
        element={
          <ProtectedRoute allowedRoles={["tutor"]}>
            <TutorMyWallet />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutor/profile"
        element={
          <ProtectedRoute allowedRoles={["tutor"]}>
            <TutorMyProfile />
          </ProtectedRoute>
        }
      />

      {/* University routes */}

      <Route
        path="/university/dashboard"
        element={
          <ProtectedRoute allowedRoles={["university"]}>
            <UniversityDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/university/students"
        element={
          <ProtectedRoute allowedRoles={["university", "admin"]}>
            <UniversityStudents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/university/subsidies"
        element={
          <ProtectedRoute allowedRoles={["university", "admin"]}>
            <UniversitySubsidies />
          </ProtectedRoute>
        }
      />

      <Route
        path="/university/faculties"
        element={
          <ProtectedRoute allowedRoles={["university"]}>
            <UniversityFaculties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/subjects"
        element={
          <ProtectedRoute allowedRoles={["university"]}>
            <UniversitySubjects />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sessions"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/withdrawals"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminWithdrawals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/universities"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUniversities />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
