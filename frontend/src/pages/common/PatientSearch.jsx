import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import {
  Search,
  Users,
  UserPlus,
  Clock,
  Calendar,
  Phone,
  FileText,
  AlertTriangle,
  Loader2,
  Stethoscope,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  X,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function PatientSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState([])

  // Modal to add a past patient to today's OPD Queue
  const [addQueueModal, setAddQueueModal] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [visitType, setVisitType] = useState('OPD')
  const [complaint, setComplaint] = useState('')
  const [submittingVisit, setSubmittingVisit] = useState(false)

  // Fetch doctors for the Add to Queue modal
  useEffect(() => {
    api.get('/staff/')
      .then(({ data }) => {
        const docs = data.filter(s => s.role === 'doctor' || s.role === 'owner')
        setDoctors(docs)
        if (docs.length > 0) {
          setSelectedDoctor(docs[0].staff_id)
        }
      })
      .catch(() => {})
  }, [])

  // Search patients by name, mobile, or ID with debounce
  const fetchPatients = async (searchTerm = '') => {
    setLoading(true)
    try {
      const qParam = searchTerm.trim() ? `?q=${encodeURIComponent(searchTerm.trim())}&limit=50` : '?limit=25'
      const { data } = await api.get(`/patients/${qParam}`)
      setPatients(data || [])
    } catch (err) {
      toast.error('Failed to search patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleOpenAddQueue = (patient) => {
    setAddQueueModal(patient)
    setComplaint('Regular Follow-up / OPD Consultation')
  }

  const handleConfirmAddQueue = async (e) => {
    e.preventDefault()
    if (!addQueueModal) return
    setSubmittingVisit(true)
    try {
      await api.post('/visits/', {
        patient_id: addQueueModal.patient_id,
        doctor_id: selectedDoctor || null,
        visit_type: visitType,
        chief_complaint: complaint || 'General OPD Consultation',
        referred_by: addQueueModal.referred_by || null,
      })
      toast.success(`Added ${addQueueModal.full_name} to today's queue!`)
      setAddQueueModal(null)
      // Navigate to queue if receptionist or doctor
      if (['receptionist', 'reception', 'cashier'].includes(user?.role?.toLowerCase())) {
        navigate('/receptionist/queue')
      } else if (user?.role === 'doctor') {
        navigate('/doctor/queue')
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add visit to queue')
    } finally {
      setSubmittingVisit(false)
    }
  }

  return (
    <Layout title="Search Previous Patients">
      <div className="max-w-5xl mx-auto">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-primary-700 rounded-2xl p-5 sm:p-6 text-white mb-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
                <Users size={16} />
                <span>Hospital Master Patient Directory</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">Search All Previous Patients</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
                Search any previous patient by their <strong>name</strong>, <strong>mobile number</strong>, or <strong>SEM Patient ID</strong>. View complete history or add returning patients to today's OPD queue.
              </p>
            </div>
            {['receptionist', 'reception', 'owner', 'manager', 'cashier'].includes(user?.role?.toLowerCase()) && (
              <button
                onClick={() => navigate('/receptionist/register')}
                className="btn-primary bg-white text-blue-700 hover:bg-blue-50 font-bold border-0 shadow-sm shrink-0 flex items-center gap-1.5"
              >
                <UserPlus size={16} />
                <span>Register New Patient</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Controls */}
        <div className="card mb-6 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search patient by name (e.g. Ramesh, Patil), mobile, or SEM ID..."
                className="input pl-10 pr-10 text-sm font-medium w-full py-2.5 bg-slate-50 focus:bg-white"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => fetchPatients(query)}
              className="btn-secondary shrink-0"
              title="Refresh search"
            >
              <RefreshCw size={15} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Quick Search Helper Badges */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 overflow-x-auto pb-1">
            <span className="font-semibold text-slate-700 shrink-0">Common search queries:</span>
            {['Patil', 'Jadhav', 'Shinde', 'Kulkarni', 'Deshmukh', 'Pawar'].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setQuery(n)}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors shrink-0"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count & Status */}
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
          <span>
            {query.trim() ? (
              <>Showing results matching <strong className="text-slate-800">"{query}"</strong> ({patients.length} found)</>
            ) : (
              <>Recently registered / active hospital patients ({patients.length})</>
            )}
          </span>
          {loading && (
            <span className="flex items-center gap-1.5 text-primary-600 font-semibold">
              <Loader2 size={13} className="animate-spin" /> Searching records...
            </span>
          )}
        </div>

        {/* Patient Cards List */}
        {loading && patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Loader2 className="animate-spin text-primary-600 mb-3" size={32} />
            <p className="text-sm font-bold text-slate-700">Searching hospital records...</p>
            <p className="text-xs text-slate-400 mt-1">Checking names, phone numbers, and past visit history</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search size={26} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No previous patients found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No hospital record found matching "{query}". Please check the spelling or register them as a new patient.
            </p>
            {['receptionist', 'reception', 'owner', 'manager'].includes(user?.role?.toLowerCase()) && (
              <button
                onClick={() => navigate('/receptionist/register')}
                className="btn-primary mt-4 mx-auto"
              >
                <UserPlus size={15} /> Register New Patient
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {patients.map(p => (
              <div
                key={p.patient_id}
                className="patient-card p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Patient Information */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-base leading-tight">
                      {p.full_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {p.age ? `${p.age}Y` : 'Age N/A'} / {p.gender?.[0]?.toUpperCase()}{p.gender?.slice(1)}
                    </span>
                    {p.blood_group && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        🩸 {p.blood_group}
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {p.patient_id}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Phone size={13} className="text-slate-400" />
                      +91 {p.mobile_number}
                    </span>
                    {p.address && (
                      <>
                        <span>&bull;</span>
                        <span className="truncate max-w-[200px]" title={p.address}>
                          📍 {p.address}
                        </span>
                      </>
                    )}
                    {p.referred_by && (
                      <>
                        <span>&bull;</span>
                        <span className="text-indigo-600 font-medium">
                          Ref: {p.referred_by}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Clinical & Visit History Chips */}
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs">
                    {/* Visits Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <Clock size={11} className="text-blue-600" />
                      <span>{p.total_visits ? `${p.total_visits} Previous Visits` : '1 Registered Visit'}</span>
                    </span>

                    {/* Last Visit Date */}
                    {p.last_visit_date && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-600 bg-slate-100">
                        <Calendar size={11} className="text-slate-400" />
                        <span>Last visited: {format(new Date(p.last_visit_date), 'd MMM yyyy')}</span>
                      </span>
                    )}

                    {/* Allergies / Chronic Conditions Alerts */}
                    {p.known_allergies && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle size={11} className="text-amber-600" />
                        <span>Allergy: {p.known_allergies}</span>
                      </span>
                    )}
                    {p.chronic_conditions && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                        <span>{p.chronic_conditions}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
                  {/* Add to Today's OPD Queue */}
                  <button
                    onClick={() => handleOpenAddQueue(p)}
                    className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-xs text-xs"
                    title="Send this previous patient to today's OPD Queue"
                  >
                    <PlusCircle size={14} />
                    <span>+ Add to Queue</span>
                  </button>

                  {/* View Medical History */}
                  <button
                    onClick={() => navigate(`/patient/${p.patient_id}`)}
                    className="btn-secondary btn-sm flex items-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 font-bold text-xs"
                    title="View complete medical history, previous prescriptions and diagnoses"
                  >
                    <FileText size={13} className="text-blue-600" />
                    <span>View History</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Previous Patient to OPD Queue */}
        {addQueueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-scale-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      Add Patient to Today's Queue
                    </h3>
                    <p className="text-xs text-slate-500">Sai Emergency &amp; Multispeciality Hospital</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddQueueModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Patient Snapshot */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-4 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900 text-sm">{addQueueModal.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Patient ID:</span>
                  <span className="font-mono font-bold text-blue-700">{addQueueModal.patient_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-medium text-slate-800">+91 {addQueueModal.mobile_number}</span>
                </div>
                {addQueueModal.referred_by && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Referred By:</span>
                    <span className="font-semibold text-indigo-700">{addQueueModal.referred_by}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmAddQueue} className="space-y-3.5">
                <div>
                  <label className="label text-xs font-semibold text-slate-700">Assigning Doctor *</label>
                  <select
                    className="input text-xs font-medium"
                    value={selectedDoctor}
                    onChange={e => setSelectedDoctor(e.target.value)}
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => {
                      const isVinay = d.full_name?.toLowerCase().includes('vinay')
                      const docName = d.full_name?.startsWith('Dr') ? d.full_name : `Dr. ${d.full_name}`
                      return (
                        <option key={d.staff_id} value={d.staff_id}>
                          {isVinay ? `👨‍⚕️ ${docName} (Direct Cash OPD)` : `🩺 ${docName} (${d.department || 'Consultant'})`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-semibold text-slate-700">Visit Type</label>
                  <select
                    className="input text-xs font-medium"
                    value={visitType}
                    onChange={e => setVisitType(e.target.value)}
                  >
                    <option value="OPD">OPD Consultation</option>
                    <option value="IPD">Inpatient (IPD / Admission)</option>
                    <option value="Emergency">Emergency Care</option>
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-semibold text-slate-700">Chief Complaint / Notes</label>
                  <input
                    type="text"
                    className="input text-xs"
                    value={complaint}
                    onChange={e => setComplaint(e.target.value)}
                    placeholder="e.g. Regular Follow-up, Fever, Knee pain"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAddQueueModal(null)}
                    disabled={submittingVisit}
                    className="btn-secondary w-1/3 justify-center text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingVisit}
                    className="btn-primary w-2/3 justify-center bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 shadow-md flex items-center gap-1.5"
                  >
                    {submittingVisit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>Add to OPD Queue</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
