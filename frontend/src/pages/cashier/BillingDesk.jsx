import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import BillLetterheadModal from '../../components/BillLetterheadModal'
import EditBillModal from '../../components/EditBillModal'
import SearchBar from '../../components/SearchBar'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import {
  Receipt,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Printer,
  Smartphone,
  Banknote,
  CreditCard,
  User,
  Calendar,
  Stethoscope,
  MessageSquare,
  X,
  Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function BillingDesk() {
  const { user } = useAuth()
  const [bills, setBills] = useState([])
  const [stats, setStats] = useState({
    total_pending_count: 0,
    total_pending_amount: 0,
    total_collected_today: 0,
    today_cash: 0,
    today_upi: 0,
    today_card: 0,
    total_bills_count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'paid' | 'all'

  // Modal states
  const [activeBillModal, setActiveBillModal] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [collectingBill, setCollectingBill] = useState(null)
  const [collectMode, setCollectMode] = useState('cash')
  const [collectNotes, setCollectNotes] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [billsRes, statsRes] = await Promise.all([
        api.get('/bills/'),
        api.get('/bills/stats/summary'),
      ])
      setBills(billsRes.data || [])
      setStats(statsRes.data || {})
    } catch (err) {
      toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 20000)
    return () => clearInterval(interval)
  }, [])

  const handleCollectPayment = async (billId, mode, notes) => {
    setSubmittingPayment(true)
    try {
      const { data: updated } = await api.patch(`/bills/${billId}/payment`, {
        payment_status: 'paid',
        payment_mode: mode || collectMode,
        notes: notes || collectNotes || undefined,
      })
      toast.success(`Payment of ₹${Number(updated.net_amount).toFixed(2)} received via ${(mode || collectMode).toUpperCase()}!`)
      setCollectingBill(null)
      setCollectNotes('')
      // Refresh list & stats
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to record payment')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleOpenPrintModal = (bill) => {
    const patientObj = {
      full_name: bill.patient_name || bill.patient_id,
      patient_id: bill.patient_id,
      age: bill.patient_age,
      gender: bill.patient_gender,
      mobile_number: bill.patient_mobile,
    }
    const doctorObj = {
      full_name: bill.doctor_name || 'Dr. Rahul Nirmale',
      department: bill.doctor_department || 'Emergency & Multispeciality',
      reg_no: 'BLG03043ALHL3',
    }
    const visitObj = {
      visit_id: bill.visit_id,
      visit_type: bill.visit_type || 'OPD',
      diagnosis: bill.diagnosis,
    }
    setActiveBillModal({ bill, patient: patientObj, doctor: doctorObj, visit: visitObj })
  }

  const handleOpenEditModal = (bill) => {
    const patientObj = {
      full_name: bill.patient_name || bill.patient_id,
      patient_id: bill.patient_id,
      age: bill.patient_age,
      gender: bill.patient_gender,
      mobile_number: bill.patient_mobile,
    }
    const doctorObj = {
      staff_id: bill.doctor_id,
      full_name: bill.doctor_name || 'Dr. Rahul Nirmale',
      department: bill.doctor_department || 'Emergency & Multispeciality',
    }
    const visitObj = {
      visit_id: bill.visit_id,
      visit_type: bill.visit_type || 'OPD',
      diagnosis: bill.diagnosis,
    }
    setEditingBill({ bill, patient: patientObj, doctor: doctorObj, visit: visitObj })
  }

  const handleResendWhatsApp = async (b) => {
    try {
      const toastId = `wa-${b.bill_id}`
      toast.loading(`Sending WhatsApp bill to ${b.patient_mobile || 'patient'}...`, { id: toastId })
      await api.post(`/whatsapp/resend/bill/${b.bill_id}`)
      toast.success(`WhatsApp bill & PDF sent to ${b.patient_name || 'patient'}!`, { id: toastId })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'WhatsApp sending failed', { id: `wa-${b.bill_id}` })
    }
  }

  // Filter bills
  const filtered = bills.filter((b) => {
    // Tab filter
    if (activeTab === 'pending' && b.payment_status?.toLowerCase() !== 'pending') return false
    if (activeTab === 'paid' && b.payment_status?.toLowerCase() !== 'paid') return false

    // Search filter
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      b.bill_number?.toLowerCase().includes(term) ||
      b.patient_id?.toLowerCase().includes(term) ||
      b.patient_name?.toLowerCase().includes(term) ||
      b.patient_mobile?.toLowerCase().includes(term) ||
      b.doctor_name?.toLowerCase().includes(term)
    )
  })

  return (
    <Layout title="Billing & Cashier Desk">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Receipt className="text-emerald-600" size={26} />
            Billing & Cashier Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect consultation & procedure charges, print letterhead receipts, and reconcile collections.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            📅 {format(new Date(), 'EEE, d MMMM yyyy')}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary btn-sm flex items-center gap-1.5"
            title="Refresh billing data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pending Collections */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`cursor-pointer stat-card transition-all border ${
            activeTab === 'pending' ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/40' : 'hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock size={19} />
            </div>
            {stats.total_pending_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-900">
            ₹{stats.total_pending_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            {stats.total_pending_count} Pending Collection{stats.total_pending_count === 1 ? '' : 's'}
          </div>
        </div>

        {/* Collected Today */}
        <div
          onClick={() => setActiveTab('paid')}
          className={`cursor-pointer stat-card transition-all border ${
            activeTab === 'paid' ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/40' : 'hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <IndianRupee size={19} />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Today
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-900">
            ₹{stats.total_collected_today?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            Total Collected Today
          </div>
        </div>

        {/* UPI / Digital */}
        <div className="stat-card border hover:border-blue-300">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Smartphone size={19} />
            </div>
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              UPI & Card
            </span>
          </div>
          <div className="text-2xl font-black text-blue-900">
            ₹{(stats.today_upi + stats.today_card)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            UPI: ₹{stats.today_upi} · Card: ₹{stats.today_card}
          </div>
        </div>

        {/* Cash in Counter */}
        <div className="stat-card border hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Banknote size={19} />
            </div>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">
              Drawer Cash
            </span>
          </div>
          <div className="text-2xl font-black text-slate-800">
            ₹{stats.today_cash?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            Cash Collected Today
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="card mb-4 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={13} className={activeTab === 'pending' ? 'text-amber-600' : ''} />
            <span>Awaiting Payment</span>
            {stats.total_pending_count > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                {stats.total_pending_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('paid')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'paid'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 size={13} className={activeTab === 'paid' ? 'text-emerald-600' : ''} />
            <span>Paid / Cleared</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt size={13} />
            <span>All Bills ({stats.total_bills_count})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by Patient Name, ID, or Bill #..."
          />
        </div>
      </div>

      {/* Bills Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-56 card">
          <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
          <p className="text-xs text-slate-500 font-medium">Loading bills & collections...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          {activeTab === 'pending' ? (
            <>
              <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
              <div className="text-base font-bold text-slate-800">All Payments Cleared!</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                There are no pending consultation or procedure bills awaiting payment right now.
              </p>
            </>
          ) : (
            <>
              <Receipt size={44} className="mx-auto text-slate-300 mb-3" />
              <div className="text-base font-bold text-slate-700">No Bills Found</div>
              <p className="text-xs text-slate-400 mt-1">
                {search ? `No records matched "${search}"` : 'No billing records available in this view.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const isPending = b.payment_status?.toLowerCase() === 'pending'
            return (
              <div
                key={b.bill_id}
                className={`card p-4 transition-all border ${
                  isPending
                    ? 'border-amber-300/80 bg-amber-50/20 hover:border-amber-400 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Patient & Bill Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Receipt size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">
                          {b.patient_name || b.patient_id}
                        </span>
                        {b.patient_age && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                            {b.patient_age}Y · {b.patient_gender?.[0]?.toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {b.patient_id}
                        </span>
                        {b.visit_type && (
                          <span
                            className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              b.visit_type === 'IPD'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {b.visit_type}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <Stethoscope size={13} className="text-blue-500" />
                          {b.doctor_name || 'Doctor'} {b.doctor_department ? `(${b.doctor_department})` : ''}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-slate-600">Bill #: {b.bill_number}</span>
                        <span>·</span>
                        <span>
                          {b.created_at
                            ? format(new Date(b.created_at), 'dd MMM yyyy, hh:mm a')
                            : 'Today'}
                        </span>
                      </div>

                      {/* Items preview */}
                      {b.items && b.items.length > 0 && (
                        <div className="text-xs text-slate-600 mt-2 bg-slate-50/80 p-2 rounded-lg border border-slate-100 flex flex-wrap gap-x-3 gap-y-1">
                          {b.items.map((it, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <strong className="text-slate-700">{it.name}</strong>
                              <span className="text-slate-400">× {it.quantity || 1}</span>
                              <span className="text-slate-500 font-semibold">₹{it.total || it.unit_price}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount, Status & Quick Collect Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Net Amount</div>
                      <div
                        className={`text-2xl font-black tracking-tight ${
                          isPending ? 'text-amber-800' : 'text-slate-900'
                        }`}
                      >
                        ₹{Number(b.net_amount).toFixed(2)}
                      </div>
                      <div className="mt-0.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting Payment
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            PAID · {b.payment_mode?.toUpperCase() || 'CASH'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 border border-amber-200 transition-colors shadow-2xs"
                        title="Edit bill items, rates, and discounts"
                      >
                        <Edit3 size={13} className="text-amber-700" />
                        <span>Edit</span>
                      </button>

                      {isPending ? (
                        <button
                          onClick={() => {
                            setCollectingBill(b)
                            setCollectMode('cash')
                            setCollectNotes('')
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
                        >
                          <IndianRupee size={15} />
                          <span>Collect Payment</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenPrintModal(b)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors"
                          title="Print official receipt"
                        >
                          <Printer size={14} className="text-slate-600" />
                          <span>Receipt</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleResendWhatsApp(b)}
                        className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200/70"
                        title={`Send Bill ${b.bill_number} to Patient WhatsApp (${b.patient_mobile || ''})`}
                      >
                        <MessageSquare size={16} />
                      </button>

                      <button
                        onClick={() => handleOpenPrintModal(b)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="View Letterhead Bill"
                      >
                        <Receipt size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Collect Payment Modal */}
      {collectingBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <IndianRupee size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Collect Patient Payment</h3>
                  <p className="text-xs text-slate-400">Bill #: {collectingBill.bill_number}</p>
                </div>
              </div>
              <button
                onClick={() => setCollectingBill(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-xs text-slate-500 font-medium">Total Amount Due</div>
              <div className="text-3xl font-black text-emerald-900 mt-0.5">
                ₹{Number(collectingBill.net_amount).toFixed(2)}
              </div>
              <div className="text-xs text-slate-600 mt-1 font-semibold">
                Patient: {collectingBill.patient_name || collectingBill.patient_id}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label text-xs font-bold text-slate-700 mb-2">
                  Select Payment Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: 'cash', label: 'Cash', icon: Banknote },
                    { mode: 'upi', label: 'UPI / QR', icon: Smartphone },
                    { mode: 'card', label: 'Card / POS', icon: CreditCard },
                  ].map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCollectMode(mode)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        collectMode === mode
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label text-xs font-semibold text-slate-700">
                  Optional Note / Reference #
                </label>
                <input
                  className="input text-xs"
                  placeholder="e.g. UTR / UPI reference ID or remarks"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollectingBill(null)}
                  className="btn-secondary flex-1 justify-center text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingPayment}
                  onClick={() =>
                    handleCollectPayment(
                      collectingBill.bill_id,
                      collectMode,
                      collectNotes
                    )
                  }
                  className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-xs py-2.5 font-bold shadow-md flex items-center gap-1.5"
                >
                  {submittingPayment ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>Confirm Received</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Letterhead Print Modal */}
      {activeBillModal && (
        <BillLetterheadModal
          bill={activeBillModal.bill}
          patient={activeBillModal.patient}
          doctor={activeBillModal.doctor}
          visit={activeBillModal.visit}
          onClose={() => setActiveBillModal(null)}
          onBillUpdated={fetchData}
        />
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <EditBillModal
          bill={editingBill.bill}
          patient={editingBill.patient}
          doctor={editingBill.doctor}
          visit={editingBill.visit}
          onClose={() => setEditingBill(null)}
          onSaveSuccess={fetchData}
        />
      )}
    </Layout>
  )
}
