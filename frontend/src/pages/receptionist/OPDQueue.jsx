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
import { RefreshCw, UserPlus, Clock, CheckCircle, AlertCircle, Loader2, Receipt, Printer, IndianRupee, Edit3, Plus, Banknote, FileText, CheckCircle2, X, Trash2, AlertTriangle, Search, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function OPDQueue() {
  const { user } = useAuth()
  const canViewBill = ['manager', 'owner', 'doctor', 'cashier', 'admin', 'receptionist', 'reception'].includes(user?.role?.toLowerCase())
  const canDelete = ['manager', 'owner', 'doctor', 'cashier', 'admin', 'receptionist', 'reception'].includes(user?.role?.toLowerCase())
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

  // Delete Duplicate / Mistake Entry Modal
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteReason, setDeleteReason] = useState('Duplicate entry by mistake')
  const [deletePatientRecord, setDeletePatientRecord] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Previous patients search state
  const [previousPatients, setPreviousPatients] = useState([])
  const [searchingPrevious, setSearchingPrevious] = useState(false)
  const [addQueueModal, setAddQueueModal] = useState(null)
  const [selectedQueueDoctor, setSelectedQueueDoctor] = useState('')
  const [queueVisitType, setQueueVisitType] = useState('OPD')
  const [queueComplaint, setQueueComplaint] = useState('General OPD Consultation')
  const [submittingAddQueue, setSubmittingAddQueue] = useState(false)

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

  // Helper to detect if a visit is a duplicate entry in today's queue
  const getDuplicateVisits = (visit) => {
    const p = patients[visit.patient_id]
    return visits.filter(other => {
      if (other.visit_id === visit.visit_id) return false
      if (other.patient_id === visit.patient_id) return true
      const otherP = patients[other.patient_id]
      if (p?.mobile_number && otherP?.mobile_number && p.mobile_number === otherP.mobile_number) return true
      if (p?.full_name && otherP?.full_name && p.full_name.trim().toLowerCase() === otherP.full_name.trim().toLowerCase()) return true
      return false
    })
  }

  const handleOpenDeleteModal = (visit, dups) => {
    const patient = patients[visit.patient_id]
    const doctor = getVisitDoctor(visit)
    const detectedDups = dups && dups.length > 0 ? dups : getDuplicateVisits(visit)
    setDeleteReason('Duplicate entry by mistake')
    setDeletePatientRecord(true)
    setDeleteModal({
      visit,
      patient,
      doctor,
      duplicates: detectedDups,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal) return
    const { visit, patient } = deleteModal
    setDeleting(true)
    try {
      const { data } = await api.delete(`/visits/${visit.visit_id}`, {
        params: {
          delete_patient: deletePatientRecord,
          reason: deleteReason,
        }
      })
      toast.success(data.message || `Deleted entry for ${patient?.full_name || 'patient'}`)
      setDeleteModal(null)
      await fetchQueue()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete entry')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [filterDoctor])

  // Debounced search for previous patients across the hospital
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setPreviousPatients([])
      setSearchingPrevious(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearchingPrevious(true)
      try {
        const { data } = await api.get(`/patients/?q=${encodeURIComponent(q)}&limit=10`)
        // Filter out patients who are already in today's active queue
        const todayPatientIds = new Set(visits.map(v => v.patient_id))
        setPreviousPatients(data.filter(p => !todayPatientIds.has(p.patient_id)))
      } catch (err) {
        console.error('Failed to search previous patients', err)
      } finally {
        setSearchingPrevious(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, visits])

  const handleOpenAddQueue = (patient) => {
    setSelectedQueueDoctor(filterDoctor || doctors[0]?.staff_id || '')
    setQueueVisitType('OPD')
    setQueueComplaint('General OPD Consultation')
    setAddQueueModal(patient)
  }

  const handleConfirmAddQueue = async () => {
    if (!addQueueModal) return
    setSubmittingAddQueue(true)
    try {
      await api.post('/visits/', {
        patient_id: addQueueModal.patient_id,
        doctor_id: selectedQueueDoctor || null,
        visit_type: queueVisitType,
        chief_complaint: queueComplaint || 'General OPD Consultation',
      })
      toast.success(`${addQueueModal.full_name} added to OPD queue!`)
      setAddQueueModal(null)
      setSearch('')
      await fetchQueue()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add patient to queue')
    } finally {
      setSubmittingAddQueue(false)
    }
  }

  const filtered = visits.filter(v => {
    const p = patients[v.patient_id]
    return !search || (p?.full_name?.toLowerCase().includes(search.toLowerCase()) || v.patient_id.includes(search))
  })

  const duplicateVisitsCount = visits.filter(v => getDuplicateVisits(v).length > 0).length

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

      {/* Duplicate Entries Detected Banner */}
      {duplicateVisitsCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="w-7 h-7 rounded-lg bg-amber-200/80 flex items-center justify-center shrink-0 text-amber-800">
              <AlertTriangle size={16} />
            </span>
            <span>
              <strong>Attention Receptionist:</strong> Found <strong>{duplicateVisitsCount} duplicate queue {duplicateVisitsCount === 1 ? 'entry' : 'entries'}</strong> today. Look for rows highlighted in pink with the <strong>"Duplicate Entry"</strong> badge and click <strong>"Delete Duplicate"</strong> to clean them up.
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-1 bg-amber-200/90 font-bold rounded-lg text-amber-800 shrink-0">
            {duplicateVisitsCount} {duplicateVisitsCount === 1 ? 'Duplicate' : 'Duplicates'}
          </span>
        </div>
      )}

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
        <button onClick={() => navigate('/patients')} className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm">
          <Search size={15} className="text-primary-600" />
          <span>Patient Directory</span>
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
            const duplicates = getDuplicateVisits(visit)
            const isDuplicate = duplicates.length > 0

            return (
              <div
                key={visit.visit_id}
                className={`patient-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border rounded-xl hover:border-primary-300 transition-colors ${
                  isDuplicate
                    ? 'border-rose-300 bg-rose-50/30 ring-1 ring-rose-200'
                    : isVinay
                      ? 'border-emerald-200/80 bg-emerald-50/20'
                      : 'border-slate-200'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 sm:mt-0 ${
                    isDuplicate ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>
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

                      {/* Duplicate Badge */}
                      {isDuplicate && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-md border border-rose-300 animate-pulse"
                          title="Accidental double entry detected for this patient"
                        >
                          <AlertTriangle size={11} className="text-rose-600 shrink-0" />
                          <span>Duplicate Entry</span>
                        </span>
                      )}

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

                  {/* Delete Button for Receptionist / Authorized Staff */}
                  {canDelete && (
                    <button
                      onClick={() => handleOpenDeleteModal(visit, duplicates)}
                      className={`btn-sm flex items-center gap-1 font-bold shadow-2xs text-xs rounded-lg px-2.5 py-1.5 transition-all ${
                        isDuplicate
                          ? 'text-white bg-rose-600 hover:bg-rose-700 border border-rose-600 shadow-xs'
                          : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                      }`}
                      title={isDuplicate ? 'Delete duplicate entry' : 'Delete mistake entry from queue'}
                    >
                      <Trash2 size={13} className={isDuplicate ? 'text-white' : 'text-rose-600'} />
                      <span>{isDuplicate ? 'Delete Duplicate' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Search Previous Hospital Patients matching query */}
      {search.trim().length >= 2 && (
        <div className="mt-8 border-t-2 border-dashed border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                <Search size={14} />
              </span>
              <h3 className="text-sm font-bold text-slate-800">
                Previous Hospital Patients matching "{search.trim()}"
              </h3>
              {searchingPrevious && <Loader2 size={14} className="animate-spin text-primary-600 ml-1" />}
            </div>
            <button
              onClick={() => navigate(`/patients?q=${encodeURIComponent(search.trim())}`)}
              className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 hover:underline"
            >
              Open Full Directory &rarr;
            </button>
          </div>

          {previousPatients.length === 0 ? (
            !searchingPrevious && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                No previous patients found matching "{search}". If this is a new patient, click <strong>"Register Patient"</strong> above.
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {previousPatients.map((p) => (
                <div
                  key={p.patient_id}
                  className="p-3.5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 hover:border-primary-300 rounded-xl flex items-center justify-between gap-3 transition-shadow shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">{p.full_name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                        {p.patient_id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{p.age ? `${p.age}y` : ''} {p.gender ? `• ${p.gender}` : ''}</span>
                      {p.mobile_number && <span>• 📞 {p.mobile_number}</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>Visits: <strong className="text-slate-700">{p.total_visits || 1}</strong></span>
                      {p.last_visit_date && <span>• Last: {p.last_visit_date}</span>}
                      {p.blood_group && <span>• {p.blood_group}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/patient/${p.patient_id}`)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      title="View medical history"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddQueue(p)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <PlusCircle size={14} />
                      <span>+ Add to Queue</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Delete Duplicate / Mistake Entry Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Delete Queue Entry
                  </h3>
                  <p className="text-xs text-slate-500">Remove accidental duplicate or mistake entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* If duplicate detected, show informative alert */}
            {deleteModal.duplicates?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl mb-4 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Double Entry Detected!</p>
                  <p className="text-amber-800 mt-0.5">
                    Another entry for this patient is in today's queue. Deleting this entry will leave the original entry active.
                  </p>
                </div>
              </div>
            )}

            {/* Patient Details Card */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {deleteModal.patient?.full_name || 'Patient'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient ID:</span>
                <span className="font-mono font-bold text-blue-700">
                  {deleteModal.visit.patient_id}
                </span>
              </div>
              {deleteModal.patient?.mobile_number && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-medium text-slate-800">
                    +91 {deleteModal.patient.mobile_number}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Doctor / Desk:</span>
                <span className="font-semibold text-slate-800">
                  {deleteModal.doctor?.full_name || 'OPD Desk'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={deleteModal.visit.status} />
              </div>
              {deleteModal.visit.chief_complaint && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Complaint:</span>
                  <span className="text-slate-700 italic truncate max-w-[220px]">
                    {deleteModal.visit.chief_complaint}
                  </span>
                </div>
              )}
            </div>

            {/* Deletion Reason */}
            <div className="mb-4">
              <label className="label text-xs font-semibold text-slate-700">Reason for Deletion</label>
              <select
                className="input text-xs"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
              >
                <option value="Duplicate entry by mistake">Duplicate entry by mistake</option>
                <option value="Accidentally registered twice">Accidentally registered twice</option>
                <option value="Wrong patient or doctor selected">Wrong patient or doctor selected</option>
                <option value="Patient cancelled / left hospital">Patient cancelled / left hospital</option>
                <option value="Test / demo entry">Test / demo entry</option>
              </select>
            </div>

            {/* Also Delete Duplicate Patient Record Checkbox */}
            <div className="mb-4">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/50 border border-rose-200 cursor-pointer hover:bg-rose-50 transition-colors">
                <input
                  type="checkbox"
                  checked={deletePatientRecord}
                  onChange={e => setDeletePatientRecord(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">
                    Also delete duplicate patient profile ({deleteModal.visit.patient_id})
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    Recommended when the receptionist created a duplicate patient record. If this patient has other historical visits or paid bills, the profile will be safely preserved.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="btn-secondary w-1/3 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn-primary w-2/3 justify-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 shadow-md flex items-center gap-1.5"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deleting ? 'Deleting Entry...' : 'Confirm Delete Entry'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Returning Patient to Today's OPD Queue Modal */}
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
                    Add to Today's OPD Queue
                  </h3>
                  <p className="text-xs text-slate-500">Fast check-in for returning patient</p>
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

            {/* Patient card */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-900 text-sm">{addQueueModal.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient ID:</span>
                <span className="font-mono font-bold text-blue-700">{addQueueModal.patient_id}</span>
              </div>
              {addQueueModal.mobile_number && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-medium text-slate-800">+91 {addQueueModal.mobile_number}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Demographics:</span>
                <span className="text-slate-700 font-medium">
                  {addQueueModal.age ? `${addQueueModal.age} yrs` : 'N/A'} • {addQueueModal.gender || 'N/A'} • {addQueueModal.blood_group || 'No BG'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Previous Visits:</span>
                <span className="font-bold text-emerald-700">{addQueueModal.total_visits || 1} visits</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="label text-xs font-semibold text-slate-700">Assign Doctor</label>
                <select
                  className="input text-xs"
                  value={selectedQueueDoctor}
                  onChange={e => setSelectedQueueDoctor(e.target.value)}
                >
                  <option value="">Any Available Doctor</option>
                  {doctors.map(d => (
                    <option key={d.staff_id} value={d.staff_id}>
                      {d.full_name?.startsWith('Dr') ? d.full_name : `Dr. ${d.full_name}`} ({d.department || 'Consultant'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs font-semibold text-slate-700">Visit Type</label>
                <select
                  className="input text-xs"
                  value={queueVisitType}
                  onChange={e => setQueueVisitType(e.target.value)}
                >
                  <option value="OPD">OPD Consultation</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="label text-xs font-semibold text-slate-700">Chief Complaint / Notes</label>
                <input
                  type="text"
                  className="input text-xs"
                  value={queueComplaint}
                  onChange={e => setQueueComplaint(e.target.value)}
                  placeholder="e.g. Fever, Cough, Follow up check"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddQueueModal(null)}
                disabled={submittingAddQueue}
                className="btn-secondary w-1/3 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddQueue}
                disabled={submittingAddQueue}
                className="btn-primary w-2/3 justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 shadow-md flex items-center gap-1.5"
              >
                {submittingAddQueue ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                <span>{submittingAddQueue ? 'Adding to Queue...' : 'Confirm Add to OPD'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
