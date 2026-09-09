import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, ClipboardList, FlaskConical,
  Scan, Pill, BarChart3, LogOut, Menu, X, ChevronRight,
  Activity, Heart
} from 'lucide-react'
import clsx from 'clsx'

const NAV_BY_ROLE = {
  receptionist: [
    { label: 'OPD Queue', icon: ClipboardList, path: '/receptionist/queue' },
    { label: 'Register Patient', icon: Users, path: '/receptionist/register' },
  ],
  doctor: [
    { label: 'My Queue', icon: ClipboardList, path: '/doctor/queue' },
  ],
  lab_technician: [
    { label: 'Lab Orders', icon: FlaskConical, path: '/lab/orders' },
  ],
  radiologist: [
    { label: 'Radiology Orders', icon: Scan, path: '/radiology/orders' },
  ],
  pharmacist: [
    { label: 'Dispense', icon: Pill, path: '/pharmacy/dashboard' },
    { label: 'Inventory', icon: BarChart3, path: '/pharmacy/inventory' },
  ],
  owner: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/owner/dashboard' },
    { label: 'OPD Queue', icon: ClipboardList, path: '/receptionist/queue' },
    { label: 'Register Patient', icon: Users, path: '/receptionist/register' },
    { label: 'Doctor Queue', icon: Activity, path: '/doctor/queue' },
    { label: 'Lab Orders', icon: FlaskConical, path: '/lab/orders' },
    { label: 'Radiology', icon: Scan, path: '/radiology/orders' },
    { label: 'Pharmacy', icon: Pill, path: '/pharmacy/dashboard' },
  ],
  manager: [
    { label: 'Dashboard & Referrals', icon: LayoutDashboard, path: '/owner/dashboard' },
    { label: 'OPD Queue', icon: ClipboardList, path: '/receptionist/queue' },
    { label: 'Register Patient', icon: Users, path: '/receptionist/register' },
    { label: 'Doctor Queue', icon: Activity, path: '/doctor/queue' },
    { label: 'Lab Orders', icon: FlaskConical, path: '/lab/orders' },
    { label: 'Radiology', icon: Scan, path: '/radiology/orders' },
    { label: 'Pharmacy', icon: Pill, path: '/pharmacy/dashboard' },
  ],
}

const ROLE_COLORS = {
  receptionist: 'bg-violet-600',
  doctor: 'bg-blue-600',
  lab_technician: 'bg-emerald-600',
  radiologist: 'bg-orange-600',
  pharmacist: 'bg-pink-600',
  owner: 'bg-slate-800',
  manager: 'bg-indigo-700',
}

const ROLE_LABELS = {
  receptionist: 'Reception',
  doctor: 'Doctor',
  lab_technician: 'Laboratory',
  radiologist: 'Radiologist',
  pharmacist: 'Pharmacy',
  owner: 'Admin / Owner',
  manager: 'Manager',
}

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = NAV_BY_ROLE[user?.role] || []

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-base leading-tight">MEDI7</div>
            <div className="text-[11px] text-slate-500 font-medium">Sai Hospital · +919632219690</div>
          </div>
        </div>

        {/* User badge */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className={clsx('inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-white text-xs font-semibold', ROLE_COLORS[user?.role])}>
            {ROLE_LABELS[user?.role]}
          </div>
          <div className="mt-1.5 text-sm font-medium text-slate-800 truncate">{user?.full_name}</div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setSidebarOpen(false) }}
              className={clsx(
                'sidebar-link w-full text-left',
                location.pathname === path ? 'sidebar-link-active' : 'sidebar-link-inactive'
              )}
            >
              <Icon size={17} />
              <span>{label}</span>
              {location.pathname === path && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button onClick={logout} className="sidebar-link sidebar-link-inactive w-full text-danger-600 hover:bg-danger-50">
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3.5 flex items-center gap-4 shrink-0">
          <button className="lg:hidden text-slate-600 hover:text-slate-900" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="font-semibold text-slate-800 text-base">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
              <Activity size={14} className="text-success-500" />
              <span>System Online</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
