import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { processPendingNotifications } from './services/notificationService'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { ClassAttendance } from './pages/ClassAttendance'
import { AttendanceSuccess } from './pages/AttendanceSuccess'
import { StudentsDirectory } from './pages/StudentsDirectory'
import { StudentForm } from './pages/StudentForm'
import { StudentDetails } from './pages/StudentDetails'
import { AttendanceHistory } from './pages/AttendanceHistory'
import { NotificationHistory } from './pages/NotificationHistory'
import { Analytics } from './pages/Analytics'
import { CustomMessage } from './pages/CustomMessage'
import { Settings } from './pages/Settings'

/**
 * Background runner that automatically processes pending 30-second notifications
 */
const NotificationDaemon: React.FC = () => {
  useEffect(() => {
    // Process on launch
    processPendingNotifications()

    // High-precision 1-second background daemon for strict 30-second automated dispatch
    const interval = setInterval(() => {
      processPendingNotifications()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center text-xs text-slate-500">
        Authenticating session...
      </div>
    )
  }

  if (!user || !user.isAuthenticated || user.email?.toLowerCase() !== 'spracademy18@gmail.com') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationDaemon />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/:className"
            element={
              <ProtectedRoute>
                <ClassAttendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance-success"
            element={
              <ProtectedRoute>
                <AttendanceSuccess />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentsDirectory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/add"
            element={
              <ProtectedRoute>
                <StudentForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/edit/:id"
            element={
              <ProtectedRoute>
                <StudentForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <StudentDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AttendanceHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/custom-message"
            element={
              <ProtectedRoute>
                <CustomMessage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
