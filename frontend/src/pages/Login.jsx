import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Heart, Loader2, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_HOME = {
  receptionist: '/receptionist/queue',
  doctor: '/doctor/queue',
  lab_technician: '/lab/orders',
  radiologist: '/radiology/orders',
  pharmacist: '/pharmacy/dashboard',
  owner: '/owner/dashboard',
  manager: '/owner/dashboard',
}

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Enter email and password')
    setSubmitting(true)
    try {
      const data = await login(email, password)
      toast.success(`Welcome, ${data.full_name}!`)
      navigate(ROLE_HOME[data.role] || '/')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed. Check credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Heart size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">MEDI7</h1>
          <p className="text-primary-200 mt-1 text-sm">Sai Hospital · Digital Health System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Access your role-based dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="dr.priya@saihospital.in"
                  className="input pl-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="btn-primary btn-lg w-full justify-center mt-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Official Staff Logins (5 IDs)</p>
              <span className="text-[11px] text-primary-600 font-medium">WA: +919632219690</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ['Manager', 'manager@saihospital.in', 'Admin@123'],
                ['Doctor', 'doctor@saihospital.in', 'Doctor@123'],
                ['Reception', 'reception@saihospital.in', 'Recept@123'],
                ['Laboratory', 'laboratory@saihospital.in', 'Lab@1234'],
                ['Pharmacy', 'pharmacy@saihospital.in', 'Pharm@123'],
              ].map(([role, em, pw]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setEmail(em); setPassword(pw) }}
                  className="text-left px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-slate-100"
                >
                  <div className="font-semibold text-slate-800">{role}</div>
                  <div className="text-slate-400 text-[11px] truncate">{em}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-primary-300 text-xs mt-4">
          MEDI7 v1.0 · Powered by FastAPI + React · DPDP Act 2023 Compliant
        </p>
      </div>
    </div>
  )
}
