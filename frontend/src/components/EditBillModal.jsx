import { useState, useEffect } from 'react'
import { X, Plus, Trash2, CheckCircle2, Loader2, Receipt, Sparkles, Building2, Stethoscope, AlertCircle, IndianRupee } from 'lucide-react'
import ChargeDropdown from './ChargeDropdown'
import { HOSPITAL_TARIFF } from '../data/hospitalTariffData'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function EditBillModal({ bill, patient, doctor, visit, onClose, onSaveSuccess }) {
  const [items, setItems] = useState([])
  const [discount, setDiscount] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [stayType, setStayType] = useState('OPD')

  // Initialize from existing bill or sensible defaults
  useEffect(() => {
    if (bill) {
      if (Array.isArray(bill.items) && bill.items.length > 0) {
        setItems(
          bill.items.map((it) => ({
            name: it.name || 'Hospital Service',
            category: it.category || 'General',
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
          }))
        )
      } else {
        setItems([
          {
            name: 'Consulting Fees',
            category: 'Consultation',
            quantity: 1,
            unit_price: 200,
            total: 200,
          },
        ])
      }
      setDiscount(Number(bill.discount) || 0)
      setPaymentStatus(bill.payment_status || 'pending')
      setPaymentMode(bill.payment_mode || 'cash')
      setNotes(bill.notes || '')
    } else {
      // Default new bill
      setItems([
        {
          name: 'Consulting Fees',
          category: 'Consultation',
          quantity: 1,
          unit_price: 200,
          total: 200,
        },
      ])
    }

    if (visit?.visit_type?.toUpperCase() === 'IPD' || visit?.status === 'admitted') {
      setStayType('IPD')
    } else {
      setStayType('OPD')
    }
  }, [bill, visit])

  // Item modifications
  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, [field]: value }
        const qty = field === 'quantity' ? Number(value) || 1 : Number(item.quantity) || 1
        const price = field === 'unit_price' ? Number(value) || 0 : Number(item.unit_price) || 0
        updated.total = qty * price
        return updated
      })
    )
  }

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddCustomRow = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        category: stayType === 'IPD' ? 'Bed Charges' : 'Consultation',
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ])
  }

  const handleSelectTariffCharge = (charge) => {
    const todayTag = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
    const finalName = stayType === 'IPD' && charge.is_ipd ? `${todayTag} ${charge.name}` : charge.name

    setItems((prev) => [
      ...prev,
      {
        name: finalName,
        category: charge.category,
        quantity: 1,
        unit_price: charge.unit_price,
        total: charge.unit_price,
      },
    ])
    toast.success(`Added "${charge.name}" (₹${charge.unit_price}) to bill`)
  }

  // Financial calculations
  const subtotal = items.reduce((sum, it) => sum + (Number(it.total) || 0), 0)
  const discountVal = Math.max(0, Number(discount) || 0)
  const netAmount = Math.max(0, subtotal - discountVal)

  // Save changes
  const handleSaveBill = async () => {
    const validItems = items.filter((it) => it.name.trim())
    if (validItems.length === 0) {
      return toast.error('Please add at least one bill item')
    }

    setSaving(true)
    try {
      let savedBill = null

      if (bill?.bill_id) {
        // Update existing bill via PUT
        const { data } = await api.put(`/bills/${bill.bill_id}`, {
          items: validItems,
          subtotal,
          discount: discountVal,
          tax: 0,
          net_amount: netAmount,
          payment_status: paymentStatus,
          payment_mode: paymentMode,
          notes: notes.trim() || undefined,
        })
        savedBill = data
        toast.success(`Bill ${savedBill.bill_number} successfully updated!`)
      } else {
        // Create new bill via POST
        const payload = {
          visit_id: visit?.visit_id,
          patient_id: patient?.patient_id || visit?.patient_id,
          doctor_id: doctor?.staff_id || visit?.doctor_id || '00000000-0000-0000-0000-000000000000',
          items: validItems,
          subtotal,
          discount: discountVal,
          tax: 0,
          net_amount: netAmount,
          payment_status: paymentStatus,
          payment_mode: paymentMode,
          notes: notes.trim() || undefined,
        }
        const { data } = await api.post('/bills/', payload)
        savedBill = data
        toast.success(`Bill ${savedBill.bill_number} generated!`)
      }

      if (onSaveSuccess) onSaveSuccess(savedBill)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save bill changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800">
                  {bill ? `Edit Bill — ${bill.bill_number}` : 'Create / Edit Patient Bill'}
                </h2>
                {stayType === 'IPD' ? (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                    <Building2 size={12} /> Inpatient (IPD)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                    <Stethoscope size={12} /> Outpatient (OPD)
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                Patient: <strong className="text-slate-700">{patient?.full_name || 'Patient'}</strong> ({patient?.patient_id || 'ID'}) · {patient?.age ? `${patient.age}Y` : ''} {patient?.gender || ''}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Tariff Charge Dropdown */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select &amp; Add Hospital Tariff Charges:
            </label>
            <ChargeDropdown onSelectCharge={handleSelectTariffCharge} stayType={stayType} />

            {/* Quick Chips for Most Common Items */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase text-slate-400">Quick Add:</span>
              {[
                { name: 'Consulting Fees', category: 'Consultation', rate: 200 },
                { name: 'Follow-up Charges', category: 'Consultation', rate: 100 },
                { name: 'Injection Charges', category: 'Procedure', rate: 100 },
                { name: 'E.C.G. Test', category: 'Diagnostics', rate: 300 },
                { name: 'Dressing (Minor)', category: 'Procedure', rate: 300 },
                { name: 'Dressing (Major)', category: 'Procedure', rate: 500 },
                { name: 'Nebuliser Charges', category: 'Procedure', rate: 100 },
                { name: 'GRBS (Sugar Test)', category: 'Diagnostics', rate: 50 },
                { name: 'General Ward (Daily)', category: 'Bed Charges', rate: 2750 },
                { name: 'Special Room (Single)', category: 'Bed Charges', rate: 3000 },
                { name: 'ICU Charges (Daily)', category: 'Bed Charges', rate: 5500 },
                { name: 'Consultant Visit', category: 'Consultation', rate: 500 },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleSelectTariffCharge({
                      name: p.name,
                      category: p.category,
                      unit_price: p.rate,
                      is_ipd: p.rate > 1000,
                    })
                  }
                  className="px-2 py-0.8 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Plus size={10} className="text-emerald-600" />
                  <span>{p.name}</span>
                  <strong className="text-slate-900">₹{p.rate}</strong>
                </button>
              ))}
            </div>
          </div>

          {/* Items Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Bill Particulars &amp; Services ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddCustomRow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
              >
                <Plus size={13} /> Add Custom Line
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl"
                >
                  {/* Service Description */}
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase sm:hidden mb-0.5">
                      Service / Particulars
                    </label>
                    <input
                      type="text"
                      className="input text-xs py-1.5 font-medium"
                      placeholder="e.g. Consulting Fees"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase sm:hidden mb-0.5">
                      Category
                    </label>
                    <select
                      className="input text-xs py-1.5"
                      value={item.category}
                      onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                    >
                      <option value="Consultation">Consultation</option>
                      <option value="Procedure">Procedure</option>
                      <option value="Diagnostics">Diagnostics</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Bed Charges">Bed Charges</option>
                      <option value="Emergency">Emergency</option>
                      <option value="General">General</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Qty */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase sm:hidden mb-0.5">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input text-xs py-1.5 text-center font-bold"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </div>

                  {/* Rate / Unit Price */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase sm:hidden mb-0.5">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input text-xs py-1.5 font-bold text-slate-900"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    />
                  </div>

                  {/* Line Total */}
                  <div className="col-span-10 sm:col-span-1 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase sm:hidden block">
                      Total
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      ₹{Number(item.total).toFixed(0)}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-2 sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing, Discount, Notes & Payment Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="input text-xs font-semibold"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs font-bold text-slate-700">
                    Payment Status
                  </label>
                  <select
                    className="input text-xs font-semibold"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="pending">Pending (Unpaid)</option>
                    <option value="paid">Paid (Cleared)</option>
                    <option value="partially_paid">Partially Paid</option>
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-bold text-slate-700">
                    Payment Mode
                  </label>
                  <select
                    className="input text-xs font-semibold"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / QR (GPay/PhonePe)</option>
                    <option value="card">Card / POS</option>
                    <option value="insurance">Insurance / TPA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-slate-700">
                  Remarks / Notes on Bill
                </label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="e.g. OPD Consultation &amp; Wound Dressing"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Total Calculation Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl flex flex-col justify-between shadow-md">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold text-white">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-rose-300 font-medium">
                    <span>Discount Applied:</span>
                    <span>- ₹{discountVal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>GST / Tax:</span>
                  <span>₹0.00</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/80 mt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Net Amount:
                  </span>
                  <span className="text-2xl font-black text-white">
                    ₹{netAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {paymentStatus} ({paymentMode?.toUpperCase()})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveBill}
            className="btn-primary text-xs px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle2 size={15} />
            )}
            <span>Save &amp; Update Official Bill</span>
          </button>
        </div>
      </div>
    </div>
  )
}
