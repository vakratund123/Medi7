import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import PatientCard from '../../components/PatientCard'
import PrescriptionLetterheadModal from '../../components/PrescriptionLetterheadModal'
import SearchBar from '../../components/SearchBar'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2, Users, RefreshCw, Search, FileText, Calendar, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visits, setVisits] = useState([])
  const [patients, setPatients] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeRxModal, setActiveRxModal] = useState(null)

  // Previous patients search state
  const [previousPatients, setPreviousPatients] = useState([])
  const [searchingPrevious, setSearchingPrevious] = useState(false)

  const handleOpenRx = (visit, p) => {
    setActiveRxModal({
      visit,
      patient: p || patients[visit?.patient_id],
      doctor: user,
    })
  }

  const fetchQueue = async () => {
    try {
      const { data } = await api.get(`/visits/today?doctor_id=${user.staff_id}`)
      setVisits(data)
      const uniqueIds = [...new Set(data.map(v => v.patient_id))]
      const patientMap = {}
      await Promise.all(uniqueIds.map(async (id) => {
        try {
          const { data: p } = await api.get(`/patients/${id}`)
          patientMap[id] = p
        } catch {}
      }))
      setPatients(patientMap)
    } catch {
      toast.error('Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-search previous hospital patients when doctor types a name
  useEffect(() => {
    const q = search.trim()
    if (q.length >= 2) {
      setSearchingPrevious(true)
      const timer = setTimeout(async () => {
        try {
          const { data } = await api.get(`/patients/?q=${encodeURIComponent(q)}&limit=10`)
          const todayPatientIds = new Set(visits.map(v => v.patient_id))
          const pastOnly = (data || []).filter(p => !todayPatientIds.has(p.patient_id))
          setPreviousPatients(pastOnly)
        } catch {
          setPreviousPatients([])
        } finally {
          setSearchingPrevious(false)
        }
      }, 350)
      return () => clearTimeout(timer)
    } else {
      setPreviousPatients([])
    }
  }, [search, visits])

  const filtered = visits.filter(v => {
    const p = patients[v.patient_id]
    return !search || p?.full_name?.toLowerCase().includes(search.toLowerCase()) || v.patient_id.includes(search)
  })

  const admitted = filtered.filter(v => v.status === 'admitted' || (v.visit_type?.toUpperCase() === 'IPD' && v.status !== 'completed'))
  const waiting = filtered.filter(v => v.status === 'waiting' && v.status !== 'admitted')
  const inConsult = filtered.filter(v => v.status === 'in_consultation')
  const done = filtered.filter(v => v.status === 'completed')

  return (
    <Layout title="My Patient Queue">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search today's queue or any previous patient by name..."
          className="flex-1 min-w-48"
        />
        <button onClick={fetchQueue} className="btn-secondary shrink-0">
          <RefreshCw size={15} /> Refresh
        </button>
        <button
          onClick={() => navigate('/patients')}
          className="btn-secondary text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 font-bold shrink-0 flex items-center gap-1.5"
        >
          <Search size={15} />
          <span>All Patients Directory</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary-500" size={28} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admitted Patients (IPD / Ward Beds) */}
          {admitted.length > 0 && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                  🏥 Currently Admitted Inpatients (IPD / Wards) ({admitted.length})
                </span>
                <span className="text-[11px] font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">
                  Active Multi-Day Stays
                </span>
              </h3>
              <div className="space-y-2">
                {admitted.map(v => {
                  const admissionDate = new Date(v.visit_date || v.created_at)
                  const diffDays = Math.max(1, Math.ceil((new Date() - admissionDate) / (1000 * 60 * 60 * 24)))
                  return (
                    <div key={v.visit_id} className="relative">
                      <PatientCard
                        visit={v}
                        patient={patients[v.patient_id]}
                        onClick={() => navigate(`/doctor/consultation/${v.visit_id}`)}
                        onPrintRx={handleOpenRx}
                      />
                      <div className="absolute right-28 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 pointer-events-none">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg border border-purple-300 shadow-sm">
                          Day {diffDays} Admitted &bull; Click for Daily Round
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Waiting */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse-slow" /> OPD Waiting ({waiting.length})
              </h3>
              <div className="space-y-2">
                {waiting.map(v => (
                  <PatientCard
                    key={v.visit_id}
                    visit={v}
                    patient={patients[v.patient_id]}
                    onClick={() => navigate(`/doctor/patient/${v.patient_id}?visit=${v.visit_id}`)}
                    onPrintRx={handleOpenRx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Consultation */}
          {inConsult.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> In Consultation ({inConsult.length})
              </h3>
              <div className="space-y-2">
                {inConsult.map(v => (
                  <PatientCard
                    key={v.visit_id}
                    visit={v}
                    patient={patients[v.patient_id]}
                    onClick={() => navigate(`/doctor/patient/${v.patient_id}?visit=${v.visit_id}`)}
                    onPrintRx={handleOpenRx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" /> Completed ({done.length})
              </h3>
              <div className="space-y-2">
                {done.map(v => (
                  <PatientCard
                    key={v.visit_id}
                    visit={v}
                    patient={patients[v.patient_id]}
                    onClick={() => navigate(`/doctor/patient/${v.patient_id}`)}
                    onPrintRx={handleOpenRx}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="card text-center py-16">
              <Users size={40} className="mx-auto text-slate-300 mb-3" />
              <div className="text-slate-500 font-medium">No patients found in today's active queue</div>
              <div className="text-xs text-slate-400 mt-1">Check previous hospital records below or view all patients</div>
            </div>
          )}

          {/* Previous Patients Section when searching */}
          {search.trim().length >= 2 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Search size={15} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Previous Hospital Patients Matching "{search}" ({previousPatients.length} found)
                  </h3>
                </div>
                {searchingPrevious && (
                  <span className="text-xs text-primary-600 flex items-center gap-1 font-medium">
                    <Loader2 size={12} className="animate-spin" /> Searching records...
                  </span>
                )}
              </div>

              {previousPatients.length === 0 && !searchingPrevious ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                  No previous patient records found matching "{search}".
                </div>
              ) : (
                <div className="space-y-2">
                  {previousPatients.map(prevP => (
                    <div
                      key={prevP.patient_id}
                      className="p-3.5 bg-gradient-to-r from-blue-50/40 to-white border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{prevP.full_name}</span>
                          <span className="text-xs text-slate-600 font-medium">
                            {prevP.age ? `${prevP.age}Y` : ''} / {prevP.gender?.[0]?.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {prevP.patient_id}
                          </span>
                          {prevP.total_visits > 0 && (
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              {prevP.total_visits} Previous Visits
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>📱 +91 {prevP.mobile_number}</span>
                          {prevP.last_visit_date && <span>&bull; Last visited: {prevP.last_visit_date}</span>}
                          {prevP.known_allergies && <span className="text-rose-600 font-medium">&bull; Allergy: {prevP.known_allergies}</span>}
                          {prevP.chronic_conditions && <span className="text-purple-600 font-medium">&bull; {prevP.chronic_conditions}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/patient/${prevP.patient_id}`)}
                          className="btn-primary btn-sm bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                          title="Open previous medical history, prescriptions and diagnoses"
                        >
                          <FileText size={13} />
                          <span>View Medical History</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeRxModal && (
        <PrescriptionLetterheadModal
          prescription={activeRxModal.prescription}
          visit={activeRxModal.visit}
          patient={activeRxModal.patient}
          doctor={activeRxModal.doctor || user}
          onClose={() => setActiveRxModal(null)}
        />
      )}
    </Layout>
  )
}
