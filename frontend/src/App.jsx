import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';

import LoginPage from './pages/auth/LoginPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassesPage from './pages/teacher/ClassesPage';
import ClassDetail from './pages/teacher/ClassDetail';
import AttendanceSession from './pages/teacher/AttendanceSession';
import ReportsPage from './pages/teacher/ReportsPage';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetail from './pages/student/StudentClassDetail';
import MarkAttendance from './pages/student/MarkAttendance';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loading-logo">Attend<span style={{ color: 'var(--accent2)' }}>X</span></div><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loading-logo">Attend<span style={{ color: 'var(--accent2)' }}>X</span></div><span className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace /> : <LoginPage />} />
      
      {/* Teacher Routes */}
      <Route path="/teacher/*" element={
        <ProtectedRoute role="teacher">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="class/:classId" element={<ClassDetail />} />
              <Route path="session/:classId" element={<AttendanceSession />} />
              <Route path="reports" element={<ReportsPage />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/student/*" element={
        <ProtectedRoute role="student">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="classes" element={<StudentClasses />} />
              <Route path="class/:classId" element={<StudentClassDetail />} />
              <Route path="attendance" element={<MarkAttendance />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
