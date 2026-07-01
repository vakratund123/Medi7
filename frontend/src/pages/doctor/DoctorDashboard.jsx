import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import PatientCard from '../../components/PatientCard'
import SearchBar from '../../components/SearchBar'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2, Users, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visits, setVisits] = useState([])
  const [patients, setPatients] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const filtered = visits.filter(v => {
    const p = patients[v.patient_id]
    return !search || p?.full_name?.toLowerCase().includes(search.toLowerCase()) || v.patient_id.includes(search)
  })

  const waiting = filtered.filter(v => v.status === 'waiting')
  const inConsult = filtered.filter(v => v.status === 'in_consultation')
  const done = filtered.filter(v => v.status === 'completed')

  return (
    <Layout title="My Patient Queue">
      <div className="flex items-center gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search patient..." className="flex-1" />
        <button onClick={fetchQueue} className="btn-secondary">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary-500" size={28} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Waiting */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse-slow" /> Waiting ({waiting.length})
              </h3>
              <div className="space-y-2">
                {waiting.map(v => (
                  <PatientCard
                    key={v.visit_id}
                    visit={v}
                    patient={patients[v.patient_id]}
                    onClick={() => navigate(`/doctor/patient/${v.patient_id}?visit=${v.visit_id}`)}
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
                  <PatientCard key={v.visit_id} visit={v} patient={patients[v.patient_id]}
                    onClick={() => navigate(`/doctor/patient/${v.patient_id}?visit=${v.visit_id}`)} />
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
                  <PatientCard key={v.visit_id} visit={v} patient={patients[v.patient_id]}
                    onClick={() => navigate(`/doctor/patient/${v.patient_id}`)} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="card text-center py-16">
              <Users size={40} className="mx-auto text-slate-300 mb-3" />
              <div className="text-slate-500 font-medium">No patients assigned today</div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
