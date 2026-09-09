import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Users, Clock, AlertTriangle, Activity, RefreshCw, Loader2,
  BarChart3, UserCheck, FlaskConical, Pill, Scan, Download,
  FileSpreadsheet, Filter, Calendar, Stethoscope, Search
} from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_ICONS = {
  receptionist: Clock,
  doctor: Activity,
  lab_technician: FlaskConical,
  pharmacist: Pill,
  radiologist: Scan,
  owner: UserCheck,
  manager: UserCheck,
}

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'referrals'
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Referrals report state
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1) // 1-12
  const [filterDoc, setFilterDoc] = useState('')
  const [referralsData, setReferralsData] = useState({ total_referrals: 0, doctor_counts: [], referrals: [] })
  const [refLoading, setRefLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

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

  const fetchReferrals = async () => {
    setRefLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedYear) params.append('year', selectedYear)
      if (selectedMonth) params.append('month', selectedMonth)
      if (filterDoc) params.append('referring_doctor', filterDoc)

      const { data } = await api.get(`/owner/referrals?${params.toString()}`)
      setReferralsData(data)
    } catch {
      toast.error('Failed to load doctor referral records')
    } finally {
      setRefLoading(false)
    }
  }

  const handleDownloadCSV = async () => {
    setDownloading(true)
    try {
      const params = new URLSearchParams()
      if (selectedYear) params.append('year', selectedYear)
      if (selectedMonth) params.append('month', selectedMonth)
      if (filterDoc) params.append('referring_doctor', filterDoc)

      const response = await api.get(`/owner/referrals/export?${params.toString()}`, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const monthStr = selectedMonth ? String(selectedMonth).padStart(2, '0') : 'all'
      a.download = `sai_hospital_referrals_${selectedYear || 'all'}_${monthStr}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Monthly Referral Report downloaded!')
    } catch {
      toast.error('Failed to download CSV report')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab === 'referrals') {
      fetchReferrals()
    }
  }, [activeTab, selectedYear, selectedMonth])

  if (loading) return (
    <Layout title="Hospital Management Dashboard">
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
    <Layout title="Hospital Management Dashboard">
      {/* Tab Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity size={16} /> Hospital Overview
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'referrals'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Stethoscope size={16} /> Doctor Referrals & Monthly Export
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sai Multispecialty Hospital · Live</span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Today's OPD", value: stats?.today_opd, icon: Clock, color: 'text-primary-600', bg: 'bg-primary-50' },
              { label: 'Total Patients', value: stats?.total_patients, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Pending Consultations', value: stats?.pending_visits, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          {/* Quick Doctor Referrals Banner */}
          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Doctor Referral Reports</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Track patients referred by external doctors and download monthly reconciliation reports.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('referrals')}
                className="btn-primary text-sm whitespace-nowrap"
              >
                <FileSpreadsheet size={16} /> View Referrals & Export CSV
              </button>
            </div>
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={17} className="text-primary-500" /> Recent Staff Activity (DPDP Audit)
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
        </div>
      )}

      {/* TAB 2: DOCTOR REFERRALS & MONTHLY EXPORT */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="card bg-white p-5 border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Month Picker */}
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <select
                    className="input py-1.5 px-3 text-sm font-medium"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Year Picker */}
                <div>
                  <select
                    className="input py-1.5 px-3 text-sm font-medium"
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                {/* Filter by Doctor input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search doctor or clinic..."
                    className="input pl-8 py-1.5 text-sm"
                    value={filterDoc}
                    onChange={e => setFilterDoc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchReferrals()}
                  />
                </div>

                <button
                  onClick={fetchReferrals}
                  disabled={refLoading}
                  className="btn-secondary btn-sm"
                >
                  {refLoading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />} Filter
                </button>
              </div>

              {/* CSV Export Button */}
              <button
                onClick={handleDownloadCSV}
                disabled={downloading || referralsData.total_referrals === 0}
                className="btn-primary flex items-center justify-center gap-2 shadow-sm font-medium"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download Monthly Report (CSV)
              </button>
            </div>

            {/* Quick Referring Doctors Breakdown */}
            {referralsData.doctor_counts?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Top Referring Doctors for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}:
                </div>
                <div className="flex flex-wrap gap-2">
                  {referralsData.doctor_counts.map(({ doctor, count }) => (
                    <button
                      key={doctor}
                      onClick={() => { setFilterDoc(doctor); fetchReferrals(); }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                        filterDoc === doctor
                          ? 'bg-primary-600 text-white font-medium'
                          : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      <span>{doctor}</span>
                      <span className="font-bold bg-white/70 px-1.5 py-0.2 rounded-full text-[11px] text-slate-800">
                        {count}
                      </span>
                    </button>
                  ))}
                  {filterDoc && (
                    <button
                      onClick={() => { setFilterDoc(''); fetchReferrals(); }}
                      className="text-xs text-danger-600 underline ml-2 self-center hover:text-danger-800"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Referral Summary KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-primary-600">
                <Users size={18} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{referralsData.total_referrals}</div>
              <div className="text-xs text-slate-500">Referred Patients ({MONTH_NAMES[selectedMonth - 1]})</div>
            </div>

            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Stethoscope size={18} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{referralsData.doctor_counts?.length || 0}</div>
              <div className="text-xs text-slate-500">Active Referring Doctors / Sources</div>
            </div>

            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <FileSpreadsheet size={18} />
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate">
                {referralsData.doctor_counts?.[0]?.doctor || 'None'}
              </div>
              <div className="text-xs text-slate-500">
                Top Source ({referralsData.doctor_counts?.[0]?.count || 0} patients)
              </div>
            </div>
          </div>

          {/* Table of Referred Patients */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={17} className="text-primary-500" /> Patient Referral Records
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Showing {referralsData.referrals?.length || 0} records
              </span>
            </div>

            {refLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary-500" size={24} />
              </div>
            ) : referralsData.referrals?.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Stethoscope size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium text-slate-600">No referral records found</p>
                <p className="text-xs mt-1 text-slate-400">
                  Try selecting another month or clearing the doctor search filter.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient Name & ID</th>
                      <th>Contact</th>
                      <th>Referred By</th>
                      <th>Attending Doctor</th>
                      <th>Visit Type</th>
                      <th>Diagnosis / Complaint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralsData.referrals.map((r) => (
                      <tr key={r.visit_id}>
                        <td className="text-xs text-slate-600 whitespace-nowrap font-medium">{r.date}</td>
                        <td>
                          <div className="font-semibold text-slate-900 text-sm">{r.patient_name}</div>
                          <div className="font-mono text-xs text-primary-600">{r.patient_id}</div>
                        </td>
                        <td className="text-xs text-slate-600">
                          <div>{r.mobile_number}</div>
                          <div className="text-[11px] text-slate-400">{r.age ? `${r.age}Y` : ''} · {r.gender}</div>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {r.referred_by}
                          </span>
                        </td>
                        <td className="text-xs text-slate-700 font-medium">{r.doctor_name}</td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {r.visit_type}
                          </span>
                        </td>
                        <td className="text-xs text-slate-600 max-w-xs truncate" title={r.diagnosis !== '—' ? r.diagnosis : r.chief_complaint}>
                          {r.diagnosis !== '—' ? r.diagnosis : r.chief_complaint}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
