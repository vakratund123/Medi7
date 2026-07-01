import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, Clock, AlertTriangle, Activity, RefreshCw, Loader2, BarChart3, UserCheck, FlaskConical, Pill, Scan } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_ICONS = {
  receptionist: Clock,
  doctor: Activity,
  lab_technician: FlaskConical,
  pharmacist: Pill,
  radiologist: Scan,
  owner: UserCheck,
}

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

export default function OwnerDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/owner/stats')
      setStats(data)
    } catch {
      toast.error('Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <Layout title="Owner Dashboard">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={28} />
      </div>
    </Layout>
  )

  const doctorChartData = stats?.doctor_stats?.map(d => ({
    name: d.doctor.replace('Dr. ', ''),
    patients: d.count,
  })) || []

  const staffRoleData = Object.entries(stats?.staff_by_role || {}).map(([role, count]) => ({
    role: role.replace('_', ' '),
    count,
  }))

  return (
    <Layout title="Owner Dashboard">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's OPD", value: stats?.today_opd, icon: Clock, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Total Patients', value: stats?.total_patients, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Pending Visits', value: stats?.pending_visits, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Low Stock Alerts', value: stats?.low_stock_alerts, icon: AlertTriangle, color: 'text-danger-600', bg: 'bg-danger-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={20} className={color} />
            </div>
            <div className="text-3xl font-bold text-slate-800">{value ?? '—'}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Doctor-wise patients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 size={17} className="text-primary-500" /> Patients by Doctor (Today)
            </h3>
          </div>
          {doctorChartData.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No consultations today</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={doctorChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="patients" radius={[6, 6, 0, 0]}>
                  {doctorChartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Staff by role */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserCheck size={17} className="text-primary-500" /> Active Staff by Role
          </h3>
          <div className="space-y-2">
            {staffRoleData.map(({ role, count }) => {
              const Icon = ROLE_ICONS[role.replace(' ', '_')] || Activity
              return (
                <div key={role} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Icon size={15} className="text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800 capitalize">{role}</div>
                  </div>
                  <div className="text-lg font-bold text-slate-700">{count}</div>
                </div>
              )
            })}
            {staffRoleData.length === 0 && <div className="text-sm text-slate-400 text-center py-4">No staff data</div>}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Activity size={17} className="text-primary-500" /> Recent Staff Activity
          </h3>
          <button onClick={fetchStats} className="btn-secondary btn-sm">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Record</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_activity || []).map((log, i) => (
                <tr key={i}>
                  <td><span className="font-medium text-slate-800 capitalize">{log.action?.replace(/_/g, ' ')}</span></td>
                  <td className="capitalize text-slate-500">{log.entity || '—'}</td>
                  <td className="font-mono text-xs text-slate-400">{log.entity_id?.slice(0, 16) || '—'}</td>
                  <td className="text-xs text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}</td>
                </tr>
              ))}
              {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                <tr><td colSpan={4} className="text-center text-slate-400 py-6">No recent activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
