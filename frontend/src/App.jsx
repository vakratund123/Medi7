import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Pages
import Login from './pages/Login'
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard'
import RegisterPatient from './pages/receptionist/RegisterPatient'
import OPDQueue from './pages/receptionist/OPDQueue'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import PatientHistory from './pages/doctor/PatientHistory'
import Consultation from './pages/doctor/Consultation'
import LabDashboard from './pages/lab/LabDashboard'
import RadioDashboard from './pages/radiology/RadioDashboard'
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard'
import Inventory from './pages/pharmacy/Inventory'
import OwnerDashboard from './pages/owner/OwnerDashboard'

const ROLE_HOME = {
  receptionist: '/receptionist/queue',
  doctor: '/doctor/queue',
  lab_technician: '/lab/orders',
  radiologist: '/radiology/orders',
  pharmacist: '/pharmacy/dashboard',
  owner: '/owner/dashboard',
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* Receptionist */}
        <Route path="/receptionist/*" element={
          <ProtectedRoute roles={['receptionist', 'owner']}>
            <Routes>
              <Route path="queue" element={<OPDQueue />} />
              <Route path="register" element={<RegisterPatient />} />
              <Route path="dashboard" element={<ReceptionistDashboard />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Doctor */}
        <Route path="/doctor/*" element={
          <ProtectedRoute roles={['doctor', 'owner']}>
            <Routes>
              <Route path="queue" element={<DoctorDashboard />} />
              <Route path="patient/:patientId" element={<PatientHistory />} />
              <Route path="consultation/:visitId" element={<Consultation />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Lab */}
        <Route path="/lab/*" element={
          <ProtectedRoute roles={['lab_technician', 'owner']}>
            <Routes>
              <Route path="orders" element={<LabDashboard />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Radiology */}
        <Route path="/radiology/*" element={
          <ProtectedRoute roles={['radiologist', 'owner']}>
            <Routes>
              <Route path="orders" element={<RadioDashboard />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Pharmacy */}
        <Route path="/pharmacy/*" element={
          <ProtectedRoute roles={['pharmacist', 'owner']}>
            <Routes>
              <Route path="dashboard" element={<PharmacyDashboard />} />
              <Route path="inventory" element={<Inventory />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Owner */}
        <Route path="/owner/*" element={
          <ProtectedRoute roles={['owner']}>
            <Routes>
              <Route path="dashboard" element={<OwnerDashboard />} />
            </Routes>
          </ProtectedRoute>
        } />

        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
