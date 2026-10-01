import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import PatientCard from '../../components/PatientCard'
import StatusBadge from '../../components/StatusBadge'
import SearchBar from '../../components/SearchBar'
import BillLetterheadModal from '../../components/BillLetterheadModal'
import EditBillModal from '../../components/EditBillModal'
import PrescriptionLetterheadModal from '../../components/PrescriptionLetterheadModal'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { RefreshCw, UserPlus, Clock, CheckCircle, AlertCircle, Loader2, Receipt, Printer, IndianRupee, Edit3, Plus, Banknote, FileText, CheckCircle2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function OPDQueue() {
  const { user } = useAuth()
  const canViewBill = ['manager', 'owner', 'doctor', 'cashier', 'admin', 'receptionist', 'reception'].includes(user?.role?.toLowerCase())
  const navigate = useNavigate()
  const [visits, setVisits] = useState([])
  const [patients, setPatients] = useState({})
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDoctor, setFilterDoctor] = useState('')
  
  // Selected Bill for Letterhead Print Modal or Edit Modal
  const [activeBillModal, setActiveBillModal] = useState(null)
  const [editingBillModal, setEditingBillModal] = useState(null)
  const [markingPaid, setMarkingPaid] = useState(false)

  // Prescription Letterhead Modal
  const [activeRxModal, setActiveRxModal] = useState(null)

  // Quick Cash Collection & Mark Completed Modal (e.g. for Dr. Vinay J Nirmale OPD)
  const [collectCashModal, setCollectCashModal] = useState(null)
  const [consultationFee, setConsultationFee] = useState(200)
  const [collectPaymentMode, setCollectPaymentMode] = useState('cash')
  const [submittingCash, setSubmittingCash] = useState(false)

  useEffect(() => {
    // Fetch doctors list for doctor names & filter tabs
    api.get('/staff/').then(({ data }) => {
      const docs = data.filter(s => s.role === 'doctor' || s.role === 'owner')
      setDoctors(docs)
    }).catch(() => {})
  }, [])

  const getVisitDoctor = (visit) => {
    if (visit?.doctor_id) {
      const found = doctors.find(d => d.staff_id === visit.doctor_id)
      if (found) return found
    }
    return { staff_id: visit?.doctor_id, full_name: 'Dr. Rahul Nirmale', department: 'Emergency & Multispeciality' }
  }

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
    if (!canViewBill) return
    try {
      const { data: bill } = await api.get(`/bills/visit/${visit.visit_id}`)
      const patient = patients[visit.patient_id]
      const doctor = getVisitDoctor(visit)
      setActiveBillModal({ bill, patient, visit, doctor })
    } catch (err) {
      // If no bill yet, offer to create one
      handleOpenEditBill(visit)
    }
  }

  const handleOpenEditBill = async (visit) => {
    if (!canViewBill) return
    const patient = patients[visit.patient_id]
    const doctor = getVisitDoctor(visit)
    try {
      const { data: bill } = await api.get(`/bills/visit/${visit.visit_id}`)
      setEditingBillModal({
        bill,
        patient,
        doctor,
        visit,
      })
    } catch (err) {
      setEditingBillModal({
        bill: null,
        patient,
        doctor,
        visit,
      })
    }
  }

  const handleOpenPrescription = (visit) => {
    const patient = patients[visit.patient_id]
    const doctor = getVisitDoctor(visit)
    setActiveRxModal({ patient, visit, doctor })
  }

  const handleOpenCollectCash = (visit) => {
    const patient = patients[visit.patient_id]
    const doctor = getVisitDoctor(visit)
    setConsultationFee(200)
    setCollectPaymentMode('cash')
    setCollectCashModal({ patient, visit, doctor })
  }

  const handleConfirmCollectCash = async () => {
    if (!collectCashModal) return
    const { patient, visit, doctor } = collectCashModal
    const fee = Number(consultationFee) || 0
    setSubmittingCash(true)
    try {
      const docTitle = doctor?.full_name?.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`
      const particularName = `OPD Consultation Charges — ${docTitle}`

      // Check if bill exists
      let bill = null
      try {
        const { data: existing } = await api.get(`/bills/visit/${visit.visit_id}`)
        bill = existing
      } catch {}

      if (bill) {
        await api.put(`/bills/${bill.bill_id}`, {
          items: [{ name: particularName, quantity: 1, rate: fee, amount: fee }],
          subtotal: fee,
          discount: 0,
          tax: 0,
          net_amount: fee,
        })
        await api.patch(`/bills/${bill.bill_id}/payment`, {
          payment_status: 'paid',
          payment_mode: collectPaymentMode,
          notes: `Consultation fee collected at reception by ${user?.full_name || 'Receptionist'}`
        })
      } else {
        const { data: newBill } = await api.post('/bills/', {
          patient_id: patient.patient_id,
          visit_id: visit.visit_id,
          doctor_id: doctor.staff_id || visit.doctor_id,
          items: [{ name: particularName, quantity: 1, rate: fee, amount: fee }],
          subtotal: fee,
          discount: 0,
          tax: 0,
          net_amount: fee,
        })
        await api.patch(`/bills/${newBill.bill_id}/payment`, {
          payment_status: 'paid',
          payment_mode: collectPaymentMode,
          notes: `Consultation fee collected at reception by ${user?.full_name || 'Receptionist'}`
        })
        bill = newBill
      }

      // Mark visit completed
      await api.put(`/visits/${visit.visit_id}`, {
        status: 'completed',
      })

      toast.success(`₹${fee} cash fees collected & visit completed for ${patient.full_name}!`)
      setCollectCashModal(null)
      fetchQueue()

      // Prompt to view & print bill
      if (bill) {
        try {
          const { data: updatedBill } = await api.get(`/bills/visit/${visit.visit_id}`)
          setActiveBillModal({ bill: updatedBill, patient, visit, doctor })
        } catch {}
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to complete cash payment')
    } finally {
      setSubmittingCash(false)
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
          placeholder="Search patient name, SEM-ID..."
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

      {/* Doctor Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
        <button
          type="button"
          onClick={() => setFilterDoctor('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
            filterDoctor === ''
              ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
          }`}
        >
          All Doctors ({visits.length})
        </button>

        {doctors.map(d => {
          const isVinay = d.full_name?.toLowerCase().includes('vinay')
          const count = visits.filter(v => v.doctor_id === d.staff_id).length
          const isSelected = filterDoctor === d.staff_id
          const docLabel = d.full_name?.startsWith('Dr') ? d.full_name : `Dr. ${d.full_name}`

          return (
            <button
              key={d.staff_id}
              type="button"
              onClick={() => setFilterDoctor(d.staff_id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                isSelected
                  ? isVinay
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : isVinay
                    ? 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span>{isVinay ? '👨‍⚕️ ' + docLabel + ' (Cash OPD)' : '🩺 ' + docLabel}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Date */}
      <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
        <span>📅 {format(new Date(), 'EEEE, d MMMM yyyy')}</span>
        <span className="text-[11px] text-slate-400">Sai Emergency &amp; Multispeciality Hospital &bull; OPD Desk</span>
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
            const doc = getVisitDoctor(visit)
            const isVinay = doc?.full_name?.toLowerCase().includes('vinay')

            return (
              <div
                key={visit.visit_id}
                className={`patient-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border rounded-xl hover:border-primary-300 transition-colors ${
                  isVinay ? 'border-emerald-200/80 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0 mt-0.5 sm:mt-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {patient?.full_name || visit.patient_id}
                      </span>
                      {patient?.age && (
                        <span className="text-xs text-slate-500">
                          {patient.age}Y / {patient.gender?.[0]?.toUpperCase()}
                        </span>
                      )}
                      <StatusBadge status={visit.status} />

                      {/* Doctor Tag */}
                      {isVinay ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[11px] font-bold rounded-md border border-emerald-300">
                          👨‍⚕️ Dr. Vinay J Nirmale (Direct Cash OPD)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 text-[11px] font-semibold rounded-md border border-blue-200">
                          🩺 {doc?.full_name || 'Dr. Rahul Nirmale'}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700">{visit.patient_id}</span>
                      <span>&bull;</span>
                      <span>{visit.visit_type}</span>
                      {visit.created_at && (
                        <>
                          <span>&bull;</span>
                          <span>Registered {format(new Date(visit.created_at), 'hh:mm a')}</span>
                        </>
                      )}
                    </div>

                    {visit.chief_complaint && (
                      <div className="text-xs text-slate-600 mt-0.5 truncate">📋 {visit.chief_complaint}</div>
                    )}
                    {visit.referred_by && (
                      <div className="text-xs text-blue-600 font-medium mt-0.5">🩺 Ref by: {visit.referred_by}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Collect Cash & Complete Button for waiting patients */}
                  {visit.status === 'waiting' && (
                    <button
                      onClick={() => handleOpenCollectCash(visit)}
                      className="btn-primary btn-sm flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs text-xs"
                      title="Patient returned: Collect consultation fee and mark visit completed"
                    >
                      <Banknote size={14} />
                      <span>Collect Cash &amp; Complete</span>
                    </button>
                  )}

                  {/* Prescription Print Option for every patient */}
                  <button
                    onClick={() => handleOpenPrescription(visit)}
                    className="btn-secondary btn-sm flex items-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 font-bold shadow-2xs text-xs"
                    title="View &amp; Print Official Prescription Letterhead"
                  >
                    <FileText size={13} className="text-blue-600" />
                    <span>Print Rx</span>
                  </button>

                  {/* Bill Particulars / Edit Bill */}
                  {canViewBill && (
                    <button
                      onClick={() => handleOpenEditBill(visit)}
                      className="btn-secondary btn-sm flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 font-semibold shadow-2xs text-xs"
                      title="Edit or Add Bill Particulars for Patient"
                    >
                      <Edit3 size={13} className="text-amber-600" />
                      <span>{visit.status === 'completed' || visit.status === 'admitted' ? 'Edit Bill' : 'Bill'}</span>
                    </button>
                  )}

                  {canViewBill && visit.status === 'admitted' && (
                    <button
                      onClick={() => handleOpenBill(visit)}
                      className="btn-secondary btn-sm flex items-center gap-1 text-purple-700 hover:text-purple-800 hover:bg-purple-50 border-purple-300 font-semibold shadow-xs text-xs"
                      title="View &amp; Print Current Running Interim Bill"
                    >
                      <Receipt size={14} className="text-purple-600" />
                      <span>Running Bill</span>
                    </button>
                  )}

                  {canViewBill && visit.status === 'completed' && (
                    <button
                      onClick={() => handleOpenBill(visit)}
                      className="btn-secondary btn-sm flex items-center gap-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 font-bold shadow-xs text-xs"
                      title="View &amp; Print Official Final Bill"
                    >
                      <Receipt size={14} className="text-blue-600" />
                      <span>Final Bill</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Prescription Letterhead Modal for Doctor & Receptionist */}
      {activeRxModal && (
        <PrescriptionLetterheadModal
          patient={activeRxModal.patient}
          visit={activeRxModal.visit}
          doctor={activeRxModal.doctor}
          onClose={() => setActiveRxModal(null)}
          onPrescriptionSaved={fetchQueue}
        />
      )}

      {/* Quick Collect Cash & Mark Completed Modal */}
      {collectCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Banknote size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Collect Cash &amp; Complete Visit
                  </h3>
                  <p className="text-xs text-slate-500">Reception Counter &bull; Instant Cash Receipt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectCashModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Patient & Doctor Card */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900 text-sm">{collectCashModal.patient.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient ID:</span>
                <span className="font-mono font-bold text-blue-700">{collectCashModal.patient.patient_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-emerald-800">
                  {collectCashModal.doctor?.full_name?.startsWith('Dr')
                    ? collectCashModal.doctor.full_name
                    : `Dr. ${collectCashModal.doctor?.full_name || 'Vinay J Nirmale'}`}
                </span>
              </div>
              {collectCashModal.visit.chief_complaint && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Complaint:</span>
                  <span className="text-slate-700 italic">{collectCashModal.visit.chief_complaint}</span>
                </div>
              )}
            </div>

            {/* Consultation Fee Input */}
            <div className="mb-4">
              <label className="label text-xs font-bold text-slate-700">Consultation Fee (₹)</label>
              <div className="relative">
                <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={consultationFee}
                  onChange={e => setConsultationFee(e.target.value)}
                  className="input pl-10 text-lg font-bold text-slate-900"
                  placeholder="200"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 mt-2">
                {[100, 200, 300, 500].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setConsultationFee(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      Number(consultationFee) === amt
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="mb-5">
              <label className="label text-xs font-bold text-slate-700">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['cash', '💵 Cash'],
                  ['upi', '📱 UPI / QR'],
                  ['card', '💳 Card'],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCollectPaymentMode(mode)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      collectPaymentMode === mode
                        ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollectCashModal(null)}
                className="btn-secondary w-1/3 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCollectCash}
                disabled={submittingCash}
                className="btn-primary w-2/3 justify-center bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 shadow-md flex items-center gap-1.5"
              >
                {submittingCash ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Confirm ₹{consultationFee} &amp; Complete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Letterhead Modal */}
      {canViewBill && activeBillModal && (
        <div className="relative z-50">
          <BillLetterheadModal
            bill={activeBillModal.bill}
            patient={activeBillModal.patient}
            doctor={activeBillModal.doctor || { full_name: 'Rahul (MD)', department: 'Emergency & Multispeciality' }}
            visit={activeBillModal.visit}
            onClose={() => setActiveBillModal(null)}
            onBillUpdated={fetchQueue}
          />

          {/* If Pending, Show Quick Collect Payment Bar floating above modal */}
          {activeBillModal.bill?.payment_status === 'pending' && (
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

      {/* Edit Bill Modal for Receptionist & Doctor */}
      {canViewBill && editingBillModal && (
        <EditBillModal
          bill={editingBillModal.bill}
          patient={editingBillModal.patient}
          doctor={editingBillModal.doctor}
          visit={editingBillModal.visit}
          onClose={() => setEditingBillModal(null)}
          onSaveSuccess={() => {
            fetchQueue()
            setEditingBillModal(null)
          }}
        />
      )}
    </Layout>
  )
}
