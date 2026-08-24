import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { SkeletonCards, SkeletonStats } from "./ui/Skeleton";
import { PageShell } from "./patterns/PageHeader";

const Landing = lazy(() => import("./pages/public/Landing"));
const Login = lazy(() => import("./pages/public/Login"));
const Register = lazy(() => import("./pages/public/Register"));
const NotFound = lazy(() => import("./pages/public/NotFound"));
const AcceptInvitation = lazy(() => import("./pages/public/AcceptInvitation"));
const ForgotPassword = lazy(() => import("./pages/public/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/public/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/public/VerifyEmail"));

const Account = lazy(() => import("./pages/account/Account"));

const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const TutorSearch = lazy(() => import("./pages/student/TutorSearch"));
const TutorProfile = lazy(() => import("./pages/student/TutorProfile"));
const BookSession = lazy(() => import("./pages/student/BookSession"));
const MySessions = lazy(() => import("./pages/student/MySessions"));
const MyWallet = lazy(() => import("./pages/student/MyWallet"));

const TutorDashboard = lazy(() => import("./pages/tutor/Dashboard"));
const TutorMySessions = lazy(() => import("./pages/tutor/MySessions"));
const TutorMyWallet = lazy(() => import("./pages/tutor/MyWallet"));
const TutorMyProfile = lazy(() => import("./pages/tutor/MyProfile"));
const TutorMyInstitutions = lazy(() => import("./pages/tutor/MyInstitutions"));

const InstitutionDashboard = lazy(() => import("./pages/institution/Dashboard"));
const InstitutionStudents = lazy(() => import("./pages/institution/Students"));
const InstitutionSubsidies = lazy(() => import("./pages/institution/Subsidies"));
const InstitutionUnits = lazy(() => import("./pages/institution/AcademicUnits"));
const InstitutionSubjects = lazy(() => import("./pages/institution/Subjects"));
const InstitutionSettings = lazy(() => import("./pages/institution/Settings"));
const InstitutionDomains = lazy(() => import("./pages/institution/Domains"));
const InstitutionTeam = lazy(() => import("./pages/institution/Team"));
const InstitutionImports = lazy(() => import("./pages/institution/Imports"));
const InstitutionTutors = lazy(
  () => import("./pages/institution/TutorVerification"),
);

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSessions = lazy(() => import("./pages/admin/Sessions"));
const AdminWithdrawals = lazy(() => import("./pages/admin/Withdrawals"));
const AdminInstitutions = lazy(() => import("./pages/admin/Institutions"));
const AdminInstitutionDetail = lazy(
  () => import("./pages/admin/InstitutionDetail"),
);
const AdminNewInstitution = lazy(() => import("./pages/admin/NewInstitution"));
const AdminPlans = lazy(() => import("./pages/admin/Plans"));

function RouteFallback() {
  return (
    <PageShell>
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <SkeletonCards count={4} />
      </div>
    </PageShell>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, token } = useAuthStore();
  if (token && user) return <RoleRedirect />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  const routes = {
    student: "/student/dashboard",
    tutor: "/tutor/dashboard",
    institution_admin: "/institution/dashboard",
    platform_admin: "/admin/dashboard",
  };
  return <Navigate to={routes[user?.role] || "/login"} replace />;
}

const RENAMED_ROUTES = {
  "/university/dashboard": "/institution/dashboard",
  "/university/students": "/institution/students",
  "/university/subsidies": "/institution/subsidies",
  "/university/faculties": "/institution/units",
  "/university/subjects": "/institution/subjects",
  "/admin/universities": "/admin/institutions",
};

function RedirectToInvitation() {
  const { token } = useParams();
  return <Navigate to={`/invitation/${token}`} replace />;
}

const protectedRoute = (path, roles, element) => (
  <Route
    key={path}
    path={path}
    element={<ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>}
  />
);

const INSTITUTION_ADMIN = ["institution_admin"];
const INSTITUTION_STAFF = ["institution_admin", "platform_admin"];
const PLATFORM_ADMIN = ["platform_admin"];

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/invitation/:token" element={<AcceptInvitation />} />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />

        {protectedRoute("/student/dashboard", ["student"], <StudentDashboard />)}
        {protectedRoute("/tutors", ["student"], <TutorSearch />)}
        {protectedRoute("/tutors/:id", ["student"], <TutorProfile />)}
        {protectedRoute("/tutors/:id/book", ["student"], <BookSession />)}
        {protectedRoute("/student/sessions", ["student"], <MySessions />)}
        {protectedRoute("/student/wallet", ["student"], <MyWallet />)}

        {protectedRoute("/tutor/dashboard", ["tutor"], <TutorDashboard />)}
        {protectedRoute("/tutor/sessions", ["tutor"], <TutorMySessions />)}
        {protectedRoute("/tutor/wallet", ["tutor"], <TutorMyWallet />)}
        {protectedRoute("/tutor/profile", ["tutor"], <TutorMyProfile />)}
        {protectedRoute(
          "/tutor/institutions",
          ["tutor"],
          <TutorMyInstitutions />,
        )}

        {protectedRoute(
          "/institution/dashboard",
          INSTITUTION_ADMIN,
          <InstitutionDashboard />,
        )}
        {protectedRoute(
          "/institution/students",
          INSTITUTION_STAFF,
          <InstitutionStudents />,
        )}
        {protectedRoute(
          "/institution/subsidies",
          INSTITUTION_STAFF,
          <InstitutionSubsidies />,
        )}
        {protectedRoute("/institution/units", INSTITUTION_ADMIN, <InstitutionUnits />)}
        {protectedRoute(
          "/institution/subjects",
          INSTITUTION_ADMIN,
          <InstitutionSubjects />,
        )}
        {protectedRoute(
          "/institution/settings",
          INSTITUTION_ADMIN,
          <InstitutionSettings />,
        )}
        {protectedRoute(
          "/institution/domains",
          INSTITUTION_ADMIN,
          <InstitutionDomains />,
        )}
        {protectedRoute("/institution/team", INSTITUTION_ADMIN, <InstitutionTeam />)}
        {protectedRoute(
          "/institution/tutors",
          INSTITUTION_ADMIN,
          <InstitutionTutors />,
        )}
        {protectedRoute(
          "/institution/import",
          INSTITUTION_ADMIN,
          <InstitutionImports />,
        )}

        {protectedRoute("/admin/dashboard", PLATFORM_ADMIN, <AdminDashboard />)}
        {protectedRoute("/admin/users", PLATFORM_ADMIN, <AdminUsers />)}
        {protectedRoute("/admin/sessions", PLATFORM_ADMIN, <AdminSessions />)}
        {protectedRoute("/admin/withdrawals", PLATFORM_ADMIN, <AdminWithdrawals />)}
        {protectedRoute("/admin/institutions", PLATFORM_ADMIN, <AdminInstitutions />)}
        {protectedRoute(
          "/admin/institutions/new",
          PLATFORM_ADMIN,
          <AdminNewInstitution />,
        )}
        {protectedRoute(
          "/admin/institutions/:id",
          PLATFORM_ADMIN,
          <AdminInstitutionDetail />,
        )}
        {protectedRoute("/admin/plans", PLATFORM_ADMIN, <AdminPlans />)}

        {Object.entries(RENAMED_ROUTES).map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="/invitacion/:token" element={<RedirectToInvitation />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
