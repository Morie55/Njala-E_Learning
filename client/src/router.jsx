import { useState, lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useUser } from './hooks/useUser'
import AppLayout from './components/layout/AppLayout'
import LoadingSkeleton from './components/ui/LoadingSkeleton'
import api from './lib/api'

// Fallback loader component for lazy-loaded routes
function PageLoader() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <LoadingSkeleton type="card" count={3} />
    </div>
  )
}

// Layout-aware loader — keeps sidebar/topbar visible while JS chunks download
function LayoutLoader() {
  const { role } = useUser()
  return (
    <AppLayout role={role}>
      <PageLoader />
    </AppLayout>
  )
}

// Lazy-loaded page components for optimal bundle code-splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const SignIn = lazy(() => import('./pages/auth/SignIn'))
const SignUp = lazy(() => import('./pages/auth/SignUp'))
const ActivateAccount = lazy(() => import('./pages/auth/ActivateAccount'))
const SelectRole = lazy(() => import('./pages/auth/SelectRole'))
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'))
const AccountRejected = lazy(() => import('./pages/auth/AccountRejected'))
const AwaitingApproval = lazy(() => import('./pages/auth/AwaitingApproval'))

// Student
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))
const MyCourses = lazy(() => import('./pages/student/MyCourses'))
const BrowseCourses = lazy(() => import('./pages/student/BrowseCourses'))
const CourseDetail = lazy(() => import('./pages/student/CourseDetail'))
const AssignmentSubmission = lazy(() => import('./pages/student/AssignmentSubmission'))
const StudentAssignments = lazy(() => import('./pages/student/Assignments'))
const Grades = lazy(() => import('./pages/student/Grades'))
const Profile = lazy(() => import('./pages/student/Profile'))
const StudentAttendance = lazy(() => import('./pages/student/Attendance'))
const StudentProgress = lazy(() => import('./pages/student/Progress'))
const StudentPayments = lazy(() => import('./pages/student/Payments'))
const CertificatePage = lazy(() => import('./pages/student/CertificatePage'))
const TakeQuiz = lazy(() => import('./pages/student/TakeQuiz'))

// Lecturer
const LecturerDashboard = lazy(() => import('./pages/lecturer/Dashboard'))
const CourseManagement = lazy(() => import('./pages/lecturer/CourseManagement'))
const EnrolledStudents = lazy(() => import('./pages/lecturer/EnrolledStudents'))
const CourseAssignments = lazy(() => import('./pages/lecturer/CourseAssignments'))
const CreateAssignment = lazy(() => import('./pages/lecturer/CreateAssignment'))
const GradeSubmissions = lazy(() => import('./pages/lecturer/GradeSubmissions'))
const UploadMaterial = lazy(() => import('./pages/lecturer/UploadMaterial'))
const PostAnnouncement = lazy(() => import('./pages/lecturer/PostAnnouncement'))
const LecturerSettings = lazy(() => import('./pages/lecturer/LecturerSettings'))
const AttendanceTracker = lazy(() => import('./pages/lecturer/AttendanceTracker'))
const CourseReport = lazy(() => import('./pages/lecturer/CourseReport'))
const CreateQuiz = lazy(() => import('./pages/lecturer/CreateQuiz'))

// Dept Head
const DeptDashboard = lazy(() => import('./pages/depthead/Dashboard'))
const CourseOversight = lazy(() => import('./pages/depthead/CourseOversight'))
const DeptHeadSettings = lazy(() => import('./pages/depthead/DeptHeadSettings'))
const DepartmentReport = lazy(() => import('./pages/admin/DepartmentReport'))

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const BulkImportUsers = lazy(() => import('./pages/admin/BulkImportUsers'))
const SchoolManagement = lazy(() => import('./pages/admin/SchoolManagement'))
const DepartmentManagement = lazy(() => import('./pages/admin/DepartmentManagement'))
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const PaymentManagement = lazy(() => import('./pages/admin/PaymentManagement'))
const AcademicCalendar = lazy(() => import('./pages/admin/AcademicCalendar'))

// Shared & Alumni
const DiscussionBoard = lazy(() => import('./pages/shared/DiscussionBoard'))
const DiscussionPost = lazy(() => import('./pages/shared/DiscussionPost'))
const Timetable = lazy(() => import('./pages/shared/Timetable'))
const Messages = lazy(() => import('./pages/shared/Messages'))
const AlumniDashboard = lazy(() => import('./pages/alumni/Dashboard'))

/** Requires Clerk sign-in. Redirects to /sign-in if not authenticated. */
function RequireAuth({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <LayoutLoader />
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return children
}

/** Route Guard for Role Selection page */
function SelectRoleGuard() {
  const { dbUser, status, isLoaded } = useUser()
  if (!isLoaded) return <PageLoader />
  if (!dbUser) return <Navigate to="/sign-in" replace />
  if (status === 'APPROVED' || status === 'ACTIVE') return <Navigate to="/dashboard" replace />
  if (status === 'REJECTED') return <Navigate to="/account-rejected" replace />
  if (status === 'PENDING') return <Navigate to="/awaiting-approval" replace />
  return <SelectRole />
}

/** Route Guard for Awaiting Approval page */
function AwaitingApprovalGuard() {
  const { dbUser, status, isLoaded } = useUser()
  if (!isLoaded) return <PageLoader />
  if (!dbUser) return <Navigate to="/sign-in" replace />
  if (status === 'APPROVED' || status === 'ACTIVE') return <Navigate to="/dashboard" replace />
  if (status === 'REJECTED') return <Navigate to="/account-rejected" replace />
  if (status === 'PENDING' && dbUser.mustChangePassword) return <Navigate to="/activate" replace />
  return <AwaitingApproval />
}

/** Ensures user account is approved before granting access to system routes */
function RequireApproved({ children }) {
  const { dbUser, status, isLoaded } = useUser()
  if (!isLoaded) return <LayoutLoader />
  if (!dbUser) return <Navigate to="/sign-in" replace />

  if (status === 'REJECTED') {
    return <Navigate to="/account-rejected" replace />
  }

  if (status === 'PENDING') {
    return dbUser.mustChangePassword
      ? <Navigate to="/activate" replace />
      : <Navigate to="/awaiting-approval" replace />
  }

  return children
}

/** Requires specific role(s). Redirects to /dashboard if wrong role. */
function RequireRole({ allowedRoles, children }) {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <LayoutLoader />
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />
  return children
}

/** Polymorphic /dashboard route — renders the role-appropriate dashboard. */
function RoleDashboard() {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <LayoutLoader />
  if (role === 'admin') return <AdminDashboard />
  if (role === 'dept_head') return <DeptDashboard />
  if (role === 'lecturer') return <LecturerDashboard />
  if (role === 'alumni') return <AlumniDashboard />
  return <StudentDashboard />
}

/** Polymorphic /courses route — student sees MyCourses, lecturer sees CourseManagement. */
function CoursesPage() {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <LayoutLoader />
  if (role === 'student' || role === 'alumni') return <MyCourses />
  if (role === 'lecturer' || role === 'admin') return <CourseManagement />
  if (role === 'dept_head') return <CourseOversight />
  return <MyCourses />
}

/** Polymorphic /settings route. */
function SettingsPage() {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <LayoutLoader />
  if (role === 'admin') return <SystemSettings />
  if (role === 'dept_head') return <DeptHeadSettings />
  if (role === 'lecturer') return <LecturerSettings />
  return <Navigate to="/dashboard" replace />
}

/** Polymorphic /payments route — student sees StudentPayments, admin/dept_head sees PaymentManagement. */
function PaymentsPage() {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <LayoutLoader />
  if (role === 'admin' || role === 'dept_head') return <PaymentManagement />
  return <StudentPayments />
}

/** Error boundary component for routes */
function RootErrorBoundary() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fbf9f8]">
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-8 max-w-md shadow-lg text-center">
        <div className="w-16 h-16 bg-[#ba1a1a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-[#ba1a1a]">warning</span>
        </div>
        <h2 className="text-[20px] font-bold text-[#03224d] mb-2">Something went wrong</h2>
        <p className="text-[14px] text-[#44474f] mb-6">An error occurred while loading this section.</p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="bg-[#03224d] text-white px-6 py-2.5 rounded text-[13px] font-bold hover:opacity-90 transition-opacity"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>,
    errorElement: <RootErrorBoundary />,
  },
  {
    path: '/sign-in/*',
    element: <Suspense fallback={<PageLoader />}><SignIn /></Suspense>,
  },
  {
    path: '/sign-up/*',
    element: <Suspense fallback={<PageLoader />}><SignUp /></Suspense>,
  },
  {
    path: '/activate',
    element: <RequireAuth><Suspense fallback={<PageLoader />}><ActivateAccount /></Suspense></RequireAuth>,
  },
  {
    path: '/select-role',
    element: <RequireAuth><Suspense fallback={<PageLoader />}><SelectRoleGuard /></Suspense></RequireAuth>,
  },
  {
    path: '/awaiting-approval',
    element: <RequireAuth><Suspense fallback={<PageLoader />}><AwaitingApprovalGuard /></Suspense></RequireAuth>,
  },
  {
    path: '/pending-approval',
    element: <RequireAuth><Suspense fallback={<PageLoader />}><AwaitingApprovalGuard /></Suspense></RequireAuth>,
  },
  {
    path: '/account-rejected',
    element: <RequireAuth><Suspense fallback={<PageLoader />}><AccountRejected /></Suspense></RequireAuth>,
  },

  {
    path: '/*',
    element: (
      <RequireAuth>
        <RequireApproved>
          <Suspense fallback={<LayoutLoader />}>
            <Outlet />
          </Suspense>
        </RequireApproved>
      </RequireAuth>
    ),
    errorElement: <RootErrorBoundary />,
    children: [
      { path: 'dashboard', element: <RoleDashboard /> },

      // ── Shared / Polymorphic ──
      { path: 'courses',  element: <CoursesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'payments', element: <RequireRole allowedRoles={['student', 'lecturer', 'dept_head', 'admin', 'alumni']}><PaymentsPage /></RequireRole> },

      // ── Student ──
      { path: 'courses/:id',   element: <RequireRole allowedRoles={['student', 'lecturer', 'dept_head', 'admin']}><CourseDetail /></RequireRole> },
      { path: 'browse-courses', element: <RequireRole allowedRoles={['student']}><BrowseCourses /></RequireRole> },
      { path: 'assignments',   element: <RequireRole allowedRoles={['student']}><StudentAssignments /></RequireRole> },
      {
        path: 'courses/:courseId/assignments/:id/submit',
        element: <RequireRole allowedRoles={['student']}><AssignmentSubmission /></RequireRole>,
      },
      { path: 'grades',        element: <RequireRole allowedRoles={['student', 'alumni', 'admin']}><Grades /></RequireRole> },
      { path: 'profile',       element: <Profile /> },
      { path: 'attendance',    element: <RequireRole allowedRoles={['student']}><StudentAttendance /></RequireRole> },
      { path: 'progress',      element: <RequireRole allowedRoles={['student']}><StudentProgress /></RequireRole> },
      { path: 'courses/:id/certificate', element: <RequireRole allowedRoles={['student']}><CertificatePage /></RequireRole> },
      { path: 'courses/:courseId/discussions',             element: <DiscussionBoard /> },
      { path: 'courses/:courseId/discussions/:postId',     element: <DiscussionPost /> },

      // ── Lecturer ──
      { path: 'courses/:id/students',                 element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><EnrolledStudents /></RequireRole> },
      { path: 'courses/:id/assignments',              element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><CourseAssignments /></RequireRole> },
      { path: 'courses/:id/assignments/new',          element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><CreateAssignment /></RequireRole> },
      { path: 'assignments/:id/submissions',          element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><GradeSubmissions /></RequireRole> },
      { path: 'materials/upload',                        element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><UploadMaterial /></RequireRole> },
      { path: 'courses/:id/materials/upload',         element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><UploadMaterial /></RequireRole> },
      { path: 'announcements/new',                    element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><PostAnnouncement /></RequireRole> },
      { path: 'courses/:courseId/attendance',         element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><AttendanceTracker /></RequireRole> },
      { path: 'courses/:id/report',                   element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><CourseReport /></RequireRole> },

      // ── Dept Head ──
      { path: 'oversight', element: <RequireRole allowedRoles={['dept_head','admin']}><CourseOversight /></RequireRole> },

      // ── Admin ──
      { path: 'users',              element: <RequireRole allowedRoles={['admin']}><UserManagement /></RequireRole> },
      { path: 'admin/bulk-import',  element: <RequireRole allowedRoles={['admin']}><BulkImportUsers /></RequireRole> },
      { path: 'schools',            element: <RequireRole allowedRoles={['admin']}><SchoolManagement /></RequireRole> },
      { path: 'departments',        element: <RequireRole allowedRoles={['admin']}><DepartmentManagement /></RequireRole> },
      { path: 'analytics',          element: <RequireRole allowedRoles={['admin']}><Analytics /></RequireRole> },
      { path: 'audit-logs',         element: <RequireRole allowedRoles={['admin']}><AuditLogs /></RequireRole> },
      { path: 'dept-report',        element: <RequireRole allowedRoles={['admin','dept_head']}><DepartmentReport /></RequireRole> },
      { path: 'academic-calendar',  element: <RequireRole allowedRoles={['student', 'lecturer', 'dept_head', 'admin', 'alumni']}><AcademicCalendar /></RequireRole> },

      // ── Shared Phase 5 ──
      { path: 'timetable',          element: <RequireRole allowedRoles={['student','lecturer','dept_head','admin','alumni']}><Timetable /></RequireRole> },
      { path: 'messages',           element: <RequireRole allowedRoles={['student','lecturer','dept_head','admin','alumni']}><Messages /></RequireRole> },

      // ── Quiz & Alumni Phase 5 ──
      { path: 'quizzes/create',     element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><CreateQuiz /></RequireRole> },
      { path: 'quizzes/:id/take',   element: <RequireRole allowedRoles={['student']}><TakeQuiz /></RequireRole> },
      { path: 'alumni/dashboard',   element: <RequireRole allowedRoles={['alumni','student','admin']}><AlumniDashboard /></RequireRole> },
    ],
  },
])

export default router
