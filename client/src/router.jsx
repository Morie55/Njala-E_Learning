import { useState } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useUser } from './hooks/useUser'
import LoadingSkeleton from './components/ui/LoadingSkeleton'
import api from './lib/api'

// Auth
import LandingPage from './pages/LandingPage'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import ActivateAccount from './pages/auth/ActivateAccount'

// Student
import StudentDashboard from './pages/student/Dashboard'
import MyCourses from './pages/student/MyCourses'
import BrowseCourses from './pages/student/BrowseCourses'
import CourseDetail from './pages/student/CourseDetail'
import AssignmentSubmission from './pages/student/AssignmentSubmission'
import StudentAssignments from './pages/student/Assignments'
import Grades from './pages/student/Grades'
import Profile from './pages/student/Profile'

// Lecturer
import LecturerDashboard from './pages/lecturer/Dashboard'
import CourseManagement from './pages/lecturer/CourseManagement'
import EnrolledStudents from './pages/lecturer/EnrolledStudents'
import CourseAssignments from './pages/lecturer/CourseAssignments'
import CreateAssignment from './pages/lecturer/CreateAssignment'
import GradeSubmissions from './pages/lecturer/GradeSubmissions'
import UploadMaterial from './pages/lecturer/UploadMaterial'
import PostAnnouncement from './pages/lecturer/PostAnnouncement'
import LecturerSettings from './pages/lecturer/LecturerSettings'

// Dept Head
import DeptDashboard from './pages/depthead/Dashboard'
import CourseOversight from './pages/depthead/CourseOversight'
import DeptHeadSettings from './pages/depthead/DeptHeadSettings'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import UserManagement from './pages/admin/UserManagement'
import BulkImportUsers from './pages/admin/BulkImportUsers'
import SchoolManagement from './pages/admin/SchoolManagement'
import DepartmentManagement from './pages/admin/DepartmentManagement'
import SystemSettings from './pages/admin/SystemSettings'
import Analytics from './pages/admin/Analytics'

/** Requires Clerk sign-in. Redirects to /sign-in if not authenticated. */
function RequireAuth({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton type="card" count={4} /></div>
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return children
}

/** Requires specific role(s). Redirects to /dashboard if wrong role. */
function RequireRole({ allowedRoles, children }) {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton type="card" count={4} /></div>
  if (!role) return null
  if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />
  return children
}

/** Redirects to the role-appropriate dashboard after sign-in */
function RoleDashboard() {
  const { role, isLoaded } = useUser()

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton type="card" count={4} /></div>
  if (role === 'student')   return <StudentDashboard />
  if (role === 'lecturer')  return <LecturerDashboard />
  if (role === 'dept_head') return <DeptDashboard />
  if (role === 'admin')     return <AdminDashboard />

  return (
    <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6 text-center">
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-8 max-w-lg shadow-lg">
        <div className="w-14 h-14 bg-[#1f3864]/10 rounded-full flex items-center justify-center mx-auto mb-3 text-[#03224d]">
          <span className="material-symbols-outlined text-3xl">account_circle</span>
        </div>
        <h2 className="text-[24px] font-bold text-[#03224d] mb-2">Account Role Pending</h2>
        <p className="text-[14px] text-[#44474f] mb-4">Your account is synced, but your assigned portal role is pending approval.</p>
        <p className="text-[12px] text-[#74777f]">Please contact an administrator if you require lecturer or department head permissions.</p>
      </div>
    </div>
  )
}

/** Polymorphic courses page based on user role */
function CoursesPage() {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton type="card" count={4} /></div>
  if (role === 'student') return <MyCourses />
  return <CourseManagement />
}

/** Polymorphic settings page based on user role */
function SettingsPage() {
  const { role, isLoaded } = useUser()
  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton type="card" count={4} /></div>
  if (role === 'student') return <Profile />
  if (role === 'lecturer') return <LecturerSettings />
  if (role === 'dept_head') return <DeptHeadSettings />
  return <SystemSettings />
}

function RootErrorBoundary() {
  return (
    <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6 text-center">
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-8 max-w-md shadow-sm">
        <div className="w-16 h-16 bg-[#ffdad6] rounded-full flex items-center justify-center mx-auto mb-4 text-[#93000a]">
          <span className="material-symbols-outlined text-3xl">error_outline</span>
        </div>
        <h2 className="text-[24px] font-bold text-[#03224d] mb-2">Page Not Found</h2>
        <p className="text-[14px] text-[#44474f] mb-6">The requested page does not exist or you do not have permission to view it.</p>
        <a href="/dashboard" className="inline-block bg-[#03224d] text-white px-6 py-2.5 rounded text-[14px] font-bold hover:opacity-90 transition-opacity">
          Return to Dashboard
        </a>
      </div>
    </div>
  )
}

/** Root route handler: shows LandingPage for guests, redirects to /dashboard for signed-in users */
function RootRoute() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton type="card" count={4} /></div>
  if (isSignedIn) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

const router = createBrowserRouter([
  { path: '/',         element: <RootRoute /> },
  { path: '/sign-in',  element: <SignIn /> },
  { path: '/sign-up',  element: <SignUp /> },
  { path: '/activate', element: <RequireAuth><ActivateAccount /></RequireAuth> },

  {
    path: '/',
    element: <RequireAuth><Outlet /></RequireAuth>,
    errorElement: <RootErrorBoundary />,
    children: [
      { path: 'dashboard', element: <RoleDashboard /> },

      // ── Shared / Polymorphic ──
      { path: 'courses',  element: <CoursesPage /> },
      { path: 'settings', element: <SettingsPage /> },

      // ── Student ──
      { path: 'courses/:id',   element: <RequireRole allowedRoles={['student']}><CourseDetail /></RequireRole> },
      { path: 'browse-courses', element: <RequireRole allowedRoles={['student']}><BrowseCourses /></RequireRole> },
      { path: 'assignments',   element: <RequireRole allowedRoles={['student']}><StudentAssignments /></RequireRole> },
      {
        path: 'courses/:courseId/assignments/:id/submit',
        element: <RequireRole allowedRoles={['student']}><AssignmentSubmission /></RequireRole>,
      },
      { path: 'grades',        element: <RequireRole allowedRoles={['student']}><Grades /></RequireRole> },
      { path: 'profile',       element: <RequireRole allowedRoles={['student']}><Profile /></RequireRole> },

      // ── Lecturer ──
      { path: 'courses/:id/students',                 element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><EnrolledStudents /></RequireRole> },
      { path: 'courses/:id/assignments',              element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><CourseAssignments /></RequireRole> },
      { path: 'courses/:id/assignments/new',          element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><CreateAssignment /></RequireRole> },
      { path: 'assignments/:id/submissions',          element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><GradeSubmissions /></RequireRole> },
      { path: 'courses/:id/materials/upload',         element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><UploadMaterial /></RequireRole> },
      { path: 'announcements/new',                    element: <RequireRole allowedRoles={['lecturer','dept_head','admin']}><PostAnnouncement /></RequireRole> },

      // ── Dept Head ──
      { path: 'oversight', element: <RequireRole allowedRoles={['dept_head','admin']}><CourseOversight /></RequireRole> },

      // ── Admin ──
      { path: 'users',              element: <RequireRole allowedRoles={['admin']}><UserManagement /></RequireRole> },
      { path: 'admin/bulk-import',  element: <RequireRole allowedRoles={['admin']}><BulkImportUsers /></RequireRole> },
      { path: 'schools',            element: <RequireRole allowedRoles={['admin']}><SchoolManagement /></RequireRole> },
      { path: 'departments',        element: <RequireRole allowedRoles={['admin']}><DepartmentManagement /></RequireRole> },
      { path: 'analytics',          element: <RequireRole allowedRoles={['admin']}><Analytics /></RequireRole> },
    ],
  },
])

export default router
