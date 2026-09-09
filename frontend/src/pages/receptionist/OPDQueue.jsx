import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import PatientCard from '../../components/PatientCard'
import StatusBadge from '../../components/StatusBadge'
import SearchBar from '../../components/SearchBar'
import BillLetterheadModal from '../../components/BillLetterheadModal'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshCw, UserPlus, Clock, CheckCircle, AlertCircle, Loader2, Receipt, Printer, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function OPDQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visits, setVisits] = useState([])
  const [patients, setPatients] = useState({})
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDoctor, setFilterDoctor] = useState('')
  
  // Selected Bill for Letterhead Print Modal
  const [activeBillModal, setActiveBillModal] = useState(null)
  const [markingPaid, setMarkingPaid] = useState(false)

  const fetchQueue = async () => {
    try {
      const params = filterDoctor ? `?doctor_id=${filterDoctor}` : ''
      const { data } = await api.get(`/visits/today${params}`)
      setVisits(data)

      // Fetch patient details for each unique patient_id
      const uniqueIds = [...new Set(data.map(v => v.patient_id))]
      const patientMap = {}
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const { data: p } = await api.get(`/patients/${id}`)
            patientMap[id] = p
          } catch {}
        })
      )
      setPatients(patientMap)
    } catch (err) {
      toast.error('Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenBill = async (visit) => {
    try {
      const { data: bill } = await api.get(`/bills/visit/${visit.visit_id}`)
      const patient = patients[visit.patient_id]
      setActiveBillModal({ bill, patient, visit })
    } catch (err) {
      toast.error('No bill generated yet for this consultation')
    }
  }

  const handleMarkPaid = async (billId, mode) => {
    setMarkingPaid(true)
    try {
      const { data: updated } = await api.patch(`/bills/${billId}/payment`, {
        payment_status: 'paid',
        payment_mode: mode,
      })
      toast.success(`Payment recorded as PAID via ${mode.toUpperCase()}`)
      setActiveBillModal(prev => prev ? { ...prev, bill: updated } : null)
    } catch (err) {
      toast.error('Failed to update payment status')
    } finally {
      setMarkingPaid(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [filterDoctor])

  const filtered = visits.filter(v => {
    const p = patients[v.patient_id]
    return !search || (p?.full_name?.toLowerCase().includes(search.toLowerCase()) || v.patient_id.includes(search))
  })

  const stats = {
    total: visits.length,
    waiting: visits.filter(v => v.status === 'waiting').length,
    inConsult: visits.filter(v => v.status === 'in_consultation').length,
    completed: visits.filter(v => v.status === 'completed').length,
  }

  return (
    <Layout title="OPD Queue">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Today', value: stats.total, icon: Clock, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Waiting', value: stats.waiting, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'In Consultation', value: stats.inConsult, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search patient..."
          className="flex-1 min-w-48"
        />
        <button onClick={fetchQueue} className="btn-secondary">
          <RefreshCw size={15} />
          Refresh
        </button>
        <button onClick={() => navigate('/receptionist/register')} className="btn-primary">
          <UserPlus size={15} />
          Register Patient
        </button>
      </div>

      {/* Date */}
      <div className="text-sm text-slate-500 mb-4">
        📅 {format(new Date(), 'EEEE, d MMMM yyyy')}
      </div>

      {/* Queue list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary-500" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Clock size={40} className="mx-auto text-slate-300 mb-3" />
          <div className="text-slate-500 font-medium">No patients in queue</div>
          <div className="text-sm text-slate-400 mt-1">Register a new patient to get started</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((visit, idx) => {
            const patient = patients[visit.patient_id]
            return (
              <div key={visit.visit_id} className="patient-card flex items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-primary-300 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{patient?.full_name || visit.patient_id}</span>
                      {patient?.age && <span className="text-xs text-slate-500">{patient.age}Y / {patient.gender?.[0]?.toUpperCase()}</span>}
                      <StatusBadge status={visit.status} />
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{visit.patient_id} · {visit.visit_type}</div>
                    {visit.chief_complaint && (
                      <div className="text-xs text-slate-600 mt-0.5 truncate">📋 {visit.chief_complaint}</div>
                    )}
                    {visit.referred_by && (
                      <div className="text-xs text-blue-600 font-medium mt-0.5">🩺 Ref by: {visit.referred_by}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {visit.status === 'completed' && (
                    <button
                      onClick={() => handleOpenBill(visit)}
                      className="btn-secondary btn-sm flex items-center gap-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                      title="View & Print Official Final Bill"
                    >
                      <Receipt size={14} className="text-blue-600" />
                      <span>Letterhead Bill</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bill Letterhead Modal */}
      {activeBillModal && (
        <div className="relative z-50">
          <BillLetterheadModal
            bill={activeBillModal.bill}
            patient={activeBillModal.patient}
            doctor={{ full_name: 'Rahul (MD)', department: 'Emergency & Multispeciality' }}
            visit={activeBillModal.visit}
            onClose={() => setActiveBillModal(null)}
          />

          {/* If Pending, Show Quick Collect Payment Bar floating above modal */}
          {activeBillModal.bill.payment_status === 'pending' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 print:hidden border border-slate-700">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertCircle size={15} /> Payment Pending: ₹{Number(activeBillModal.bill.net_amount).toFixed(2)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={markingPaid}
                  onClick={() => handleMarkPaid(activeBillModal.bill.bill_id, 'cash')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition-colors"
                >
                  Collect Cash
                </button>
                <button
                  disabled={markingPaid}
                  onClick={() => handleMarkPaid(activeBillModal.bill.bill_id, 'upi')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
                >
                  Collect UPI
                </button>
                <button
                  disabled={markingPaid}
                  onClick={() => handleMarkPaid(activeBillModal.bill.bill_id, 'card')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold text-white transition-colors"
                >
                  Collect Card
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
