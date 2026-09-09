import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Plus, Trash2, CheckCircle, Loader2, FlaskConical, Scan, FileText, Receipt, Printer, IndianRupee } from 'lucide-react'
import BillLetterheadModal from '../../components/BillLetterheadModal'
import toast from 'react-hot-toast'

const FREQUENCIES = ['1-0-0', '0-1-0', '0-0-1', '1-1-0', '1-0-1', '0-1-1', '1-1-1', 'SOS']
const COMMON_TESTS = ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'HbA1c', 'Thyroid Profile', 'Urine Routine', 'Blood Sugar Fasting', 'Electrolytes', 'CRP', 'D-Dimer']
const SCAN_TYPES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography']

const PRESET_CHARGES = [
  { name: 'Consultation Fee', category: 'Consultation', price: 300 },
  { name: 'Emergency Assessment', category: 'Emergency', price: 500 },
  { name: 'Routine Follow-up', category: 'Consultation', price: 200 },
  { name: 'ECG Test & Report', category: 'Diagnostics', price: 300 },
  { name: 'Wound Dressing / Minor Suture', category: 'Procedure', price: 250 },
  { name: 'IV Infusion / Injection Charges', category: 'Nursing', price: 150 },
  { name: 'Day Care Observation Bed', category: 'Bed Charges', price: 800 },
  { name: 'Nebulization Charges', category: 'Procedure', price: 100 },
]

import MedicineAutocomplete from '../../components/MedicineAutocomplete'
import { HOSPITAL_LAB_TARIFF } from '../../data/labTariffData'

function MedicineRow({ med, onChange, onRemove }) {
  const set = (k) => (e) => onChange({ ...med, [k]: e.target.value })

  const handleSelectTablet = (tablet) => {
    onChange({
      ...med,
      medicine_name: tablet.name,
      dosage: tablet.dosage || med.dosage,
      frequency: tablet.frequency || med.frequency,
      duration_days: tablet.duration_days || med.duration_days,
      instructions: tablet.instructions || med.instructions,
    })
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl mb-2">
      <div className="col-span-12 sm:col-span-4">
        <label className="label text-xs">Medicine / Tablet Name</label>
        <MedicineAutocomplete
          value={med.medicine_name}
          onChange={(val) => onChange({ ...med, medicine_name: val })}
          onSelectTablet={handleSelectTablet}
          placeholder="Type 'm' for Metformin, 'p' for Paracetamol..."
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <label className="label text-xs">Dosage</label>
        <input className="input" placeholder="500mg" value={med.dosage} onChange={set('dosage')} />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <label className="label text-xs">Frequency</label>
        <select className="input" value={med.frequency} onChange={set('frequency')}>
          {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>
      <div className="col-span-6 sm:col-span-1">
        <label className="label text-xs">Days</label>
        <input className="input" type="number" min="1" placeholder="5" value={med.duration_days} onChange={set('duration_days')} />
      </div>
      <div className="col-span-5 sm:col-span-2">
        <label className="label text-xs">Instructions</label>
        <input className="input" placeholder="After food" value={med.instructions} onChange={set('instructions')} />
      </div>
      <div className="col-span-1 pb-0.5">
        <button type="button" onClick={onRemove} className="btn btn-danger btn-sm w-full justify-center h-[38px]" title="Remove medicine">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

const newMed = () => ({ medicine_name: '', dosage: '', frequency: '1-1-1', duration_days: 5, instructions: '' })
const newBillItem = () => ({ name: '', category: 'Consultation', quantity: 1, unit_price: 0, total: 0 })

export default function Consultation() {
  const { visitId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visit, setVisit] = useState(null)
  const [patient, setPatient] = useState(null)
  const [medicines, setMedicines] = useState([newMed()])
  const [tests, setTests] = useState([])
  const [scans, setScans] = useState([])
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  
  // Doctor Billing state
  const [billItems, setBillItems] = useState([
    { name: 'Doctor Consultation Fee', category: 'Consultation', quantity: 1, unit_price: 300, total: 300 }
  ])
  const [discount, setDiscount] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [billingNotes, setBillingNotes] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [createdBill, setCreatedBill] = useState(null)
  const [showBillModal, setShowBillModal] = useState(false)

  useEffect(() => {
    api.get(`/visits/${visitId}`).then(async ({ data: v }) => {
      setVisit(v)
      if (v.diagnosis) setDiagnosis(v.diagnosis)
      if (v.notes) setNotes(v.notes)
      if (v.follow_up_date) setFollowUp(v.follow_up_date)
      const { data: p } = await api.get(`/patients/${v.patient_id}`)
      setPatient(p)
      
      // Check if bill already exists
      try {
        const { data: b } = await api.get(`/bills/visit/${visitId}`)
        if (b) {
          setCreatedBill(b)
          if (b.items && b.items.length > 0) setBillItems(b.items)
          if (b.discount) setDiscount(b.discount)
          if (b.payment_status) setPaymentStatus(b.payment_status)
          if (b.payment_mode) setPaymentMode(b.payment_mode)
        }
      } catch (err) {
        // No existing bill yet, keep defaults
      }
    }).catch(() => toast.error('Visit not found'))
  }, [visitId])

  const [labSearch, setLabSearch] = useState('')
  const [showTariffDropdown, setShowTariffDropdown] = useState(false)

  const toggleTest = (t) => setTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const toggleScan = (s) => setScans(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSyncLabsToBill = () => {
    if (tests.length === 0) return toast.error('No lab tests selected yet')
    let added = 0
    tests.forEach(testName => {
      const already = billItems.some(b => b.name.toLowerCase() === testName.toLowerCase())
      if (!already) {
        let item = HOSPITAL_LAB_TARIFF.find(t => t.name.toLowerCase() === testName.toLowerCase())
        if (!item) {
          const lower = testName.toLowerCase()
          if (lower === 'cbc') item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('CBC'))
          else if (lower === 'lft') item = HOSPITAL_LAB_TARIFF.find(t => t.name === 'LFT')
          else if (lower === 'kft') item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('CREATININE') || t.name.includes('UREA'))
          else if (lower.includes('lipid')) item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('LIPID') || t.name.includes('CHOLESTEROL'))
          else if (lower.includes('hba1c')) item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('GLYCOSYLATED') || t.name.includes('HAEMOGLOBIN'))
          else if (lower.includes('thyroid')) item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('TSH'))
          else if (lower.includes('sugar')) item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('SUGAR') || t.name.includes('BSF'))
          else if (lower.includes('urine')) item = HOSPITAL_LAB_TARIFF.find(t => t.name.includes('URINE REPORT') || t.name.includes('URINARY'))
          else item = HOSPITAL_LAB_TARIFF.find(t => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()))
        }
        const price = item ? item.rate : 100
        setBillItems(prev => [
          ...prev,
          { name: testName, category: 'Diagnostics', quantity: 1, unit_price: price, total: price }
        ])
        added++
      }
    })
    if (added > 0) toast.success(`Added ${added} lab test(s) to final bill with hospital tariff`)
    else toast.success('Selected tests are already in the bill')
  }

  // Billing helpers
  const handleItemChange = (idx, field, value) => {
    setBillItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      const qty = field === 'quantity' ? Number(value) || 1 : item.quantity
      const price = field === 'unit_price' ? Number(value) || 0 : item.unit_price
      updated.total = qty * price
      return updated
    }))
  }

  const handleAddPreset = (preset) => {
    setBillItems(prev => [
      ...prev,
      { name: preset.name, category: preset.category, quantity: 1, unit_price: preset.price, total: preset.price }
    ])
  }

  const subtotal = billItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  const netAmount = Math.max(0, subtotal - (Number(discount) || 0))

  const handleSave = async () => {
    if (!diagnosis) return toast.error('Please enter a diagnosis')
    const validMeds = medicines.filter(m => m.medicine_name.trim())
    const validBills = billItems.filter(b => b.name.trim())
    setSubmitting(true)
    try {
      // Update visit
      await api.put(`/visits/${visitId}`, {
        status: 'completed',
        diagnosis,
        notes,
        follow_up_date: followUp || null,
      })

      // Create prescription
      if (validMeds.length > 0) {
        await api.post('/prescriptions/', {
          visit_id: visitId,
          patient_id: visit.patient_id,
          doctor_id: user.staff_id,
          medicines: validMeds.map(m => ({ ...m, duration_days: parseInt(m.duration_days) || 5 })),
        })
      }

      // Create lab orders
      if (tests.length > 0) {
        await api.post('/lab/orders/', {
          visit_id: visitId,
          patient_id: visit.patient_id,
          ordered_by: user.staff_id,
          tests,
        })
      }

      // Create radiology orders
      for (const scan of scans) {
        await api.post('/radiology/orders/', {
          patient_id: visit.patient_id,
          visit_id: visitId,
          scan_type: scan,
          ordered_by: user.staff_id,
        })
      }

      // Create or update Final Bill with Doctor Pricing
      if (validBills.length > 0) {
        const { data: billRes } = await api.post('/bills/', {
          visit_id: visitId,
          patient_id: visit.patient_id,
          doctor_id: user.staff_id,
          items: validBills,
          subtotal,
          discount: Number(discount) || 0,
          tax: 0,
          net_amount: netAmount,
          payment_status: paymentStatus,
          payment_mode: paymentMode,
          notes: billingNotes,
        })
        setCreatedBill(billRes)
      }

      setSaved(true)
      toast.success('Consultation & Final Bill saved! Sent to patient WhatsApp.')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save consultation')
    } finally {
      setSubmitting(false)
    }
  }

  if (saved) return (
    <Layout title="Consultation & Bill Saved">
      <div className="max-w-lg mx-auto card text-center py-10">
        <CheckCircle size={52} className="text-emerald-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Consultation Completed!</h2>
        <p className="text-slate-600 text-sm mb-6">
          Prescription &amp; Final Bill generated on official Sai Emergency Hospital Letterhead.
        </p>

        {createdBill && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Bill Reference:</span>
              <strong className="text-slate-900">{createdBill.bill_number}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Net Amount:</span>
              <strong className="text-blue-700 text-sm">₹{Number(createdBill.net_amount).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className={`font-bold uppercase ${createdBill.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {createdBill.payment_status} ({createdBill.payment_mode || 'CASH'})
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {createdBill && (
            <button
              onClick={() => setShowBillModal(true)}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Printer size={16} /> Print Final Bill (Letterhead)
            </button>
          )}
          <button onClick={() => navigate('/doctor/queue')} className="btn-secondary">
            Back to OPD Queue
          </button>
        </div>

        {/* Modal for viewing & printing letterhead */}
        {showBillModal && createdBill && (
          <BillLetterheadModal
            bill={createdBill}
            patient={patient}
            doctor={user}
            visit={visit}
            onClose={() => setShowBillModal(false)}
          />
        )}
      </div>
    </Layout>
  )

  return (
    <Layout title={patient ? `Consultation — ${patient.full_name}` : 'Consultation'}>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm mb-4">
          <ArrowLeft size={14} /> Back
        </button>

        {patient && (
          <div className="card mb-4 bg-primary-50 border-primary-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-bold text-slate-900">{patient.full_name}</div>
                <div className="text-sm text-slate-600">{patient.age}Y · {patient.gender} · {patient.patient_id}</div>
              </div>
              {patient.known_allergies && (
                <div className="badge badge-red">⚠️ {patient.known_allergies}</div>
              )}
            </div>
          </div>
        )}

        {/* Clinical notes */}
        <div className="card mb-4">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={17} className="text-primary-500" /> Clinical Notes
          </h3>
          <div className="space-y-3">
            <div>
              <label className="label">Diagnosis *</label>
              <input className="input" placeholder="e.g. Viral fever, Hypertension" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
            </div>
            <div>
              <label className="label">Examination Findings / Notes</label>
              <textarea className="input" rows={3} placeholder="Clinical examination findings..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input type="date" className="input max-w-xs" value={followUp} onChange={e => setFollowUp(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Prescription */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={17} className="text-primary-500" /> Prescription
            </h3>
            <button type="button" onClick={() => setMedicines(m => [...m, newMed()])} className="btn-secondary btn-sm">
              <Plus size={13} /> Add Medicine
            </button>
          </div>
          {medicines.map((med, i) => (
            <MedicineRow
              key={i}
              med={med}
              onChange={(updated) => setMedicines(m => m.map((x, j) => j === i ? updated : x))}
              onRemove={() => setMedicines(m => m.filter((_, j) => j !== i))}
            />
          ))}
        </div>

        {/* Lab Tests with Official Hospital Tariff */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FlaskConical size={17} className="text-primary-500" /> Lab Investigations (Sai Hospital Tariff)
            </h3>
            {tests.length > 0 && (
              <button
                type="button"
                onClick={handleSyncLabsToBill}
                className="btn-secondary btn-sm text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                + Add Selected Tests to Final Bill
              </button>
            )}
          </div>

          {/* Quick Common Tests */}
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_TESTS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTest(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tests.includes(t) ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Searchable Hospital Lab Tariff Master List */}
          <div className="relative">
            <input
              type="text"
              className="input text-xs"
              placeholder="🔍 Search hospital lab tests (e.g. Dengue, Widal, CBC, Thyroid, Calcium, LFT)..."
              value={labSearch}
              onChange={e => {
                setLabSearch(e.target.value)
                setShowTariffDropdown(true)
              }}
              onFocus={() => setShowTariffDropdown(true)}
            />

            {showTariffDropdown && labSearch.trim() && (
              <div className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                  <span>Hospital Lab Tariff Master</span>
                  <button type="button" onClick={() => setShowTariffDropdown(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>
                {HOSPITAL_LAB_TARIFF.filter(item => item.name.toLowerCase().includes(labSearch.toLowerCase())).slice(0, 15).map((item, idx) => {
                  const isSelected = tests.includes(item.name)
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        toggleTest(item.name)
                      }}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between text-xs transition-colors ${isSelected ? 'bg-primary-50 text-primary-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'}`}
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-[10px] ml-2 text-slate-400">({item.category})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700">₹{item.rate}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isSelected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {isSelected ? '✓ Selected' : '+ Add'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {tests.length > 0 && (
            <div className="mt-3 text-xs text-primary-700 font-medium bg-primary-50/70 p-2.5 rounded-lg border border-primary-100 flex items-center justify-between flex-wrap gap-2">
              <div><strong>Selected Tests ({tests.length}):</strong> {tests.join(', ')}</div>
              <button
                type="button"
                onClick={handleSyncLabsToBill}
                className="text-xs font-bold text-primary-700 hover:underline shrink-0"
              >
                Sync to Bill &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Radiology */}
        <div className="card mb-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Scan size={17} className="text-primary-500" /> Radiology Orders
          </h3>
          <div className="flex flex-wrap gap-2">
            {SCAN_TYPES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleScan(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${scans.includes(s) ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor Billing & Pricing Section */}
        <div className="card mb-4 border-2 border-primary-100 bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Receipt size={19} className="text-primary-600" /> Patient Final Bill &amp; Pricing
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctor sets pricing here. Final bill will be printed on official Sai Hospital Letterhead.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBillItems(b => [...b, newBillItem()])}
              className="btn-secondary btn-sm"
            >
              <Plus size={13} /> Add Custom Item
            </button>
          </div>

          {/* Quick-add presets */}
          <div className="mb-4 bg-slate-100/70 p-2.5 rounded-xl">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              ⚡ Quick Add Standard Hospital Charges:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CHARGES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(p)}
                  className="px-2.5 py-1 bg-white hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-xs flex items-center gap-1"
                >
                  <Plus size={11} className="text-primary-600" /> {p.name} <span className="font-bold text-slate-900">₹{p.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Billing items rows */}
          <div className="space-y-2 mb-4">
            {billItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="col-span-12 sm:col-span-4">
                  <label className="label text-xs">Service / Particulars</label>
                  <input
                    className="input"
                    placeholder="e.g. Consultation Fee"
                    value={item.name}
                    onChange={e => handleItemChange(i, 'name', e.target.value)}
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="label text-xs">Category</label>
                  <select
                    className="input"
                    value={item.category}
                    onChange={e => handleItemChange(i, 'category', e.target.value)}
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Diagnostics">Diagnostics</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Bed Charges">Bed Charges</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="label text-xs">Qty</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={item.quantity}
                    onChange={e => handleItemChange(i, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="label text-xs">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="input font-semibold"
                    value={item.unit_price}
                    onChange={e => handleItemChange(i, 'unit_price', e.target.value)}
                  />
                </div>
                <div className="col-span-5 sm:col-span-1 text-right pb-2">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total</div>
                  <div className="font-bold text-slate-800 text-xs">₹{item.total}</div>
                </div>
                <div className="col-span-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setBillItems(b => b.filter((_, idx) => idx !== i))}
                    className="btn btn-danger btn-sm w-full justify-center h-[38px]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Summary & Payment Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-100 p-4 rounded-xl">
            <div className="space-y-2">
              <div>
                <label className="label text-xs">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Payment Status</label>
                  <select
                    className="input"
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value)}
                  >
                    <option value="pending">Pending (Collect at Reception)</option>
                    <option value="paid">Paid (Collected in OPD)</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Payment Mode</label>
                  <select
                    className="input"
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI (GPay / PhonePe)</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance / Ayushman</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label text-xs">Billing Notes / Remarks</label>
                <input
                  className="input"
                  placeholder="Optional remarks on bill"
                  value={billingNotes}
                  onChange={e => setBillingNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between bg-white p-4 rounded-xl border border-slate-200">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-semibold">- ₹{Number(discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax / GST:</span>
                  <span className="font-semibold">₹0.00</span>
                </div>
              </div>
              <div className="pt-3 border-t-2 border-slate-200 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-700">Net Payable:</span>
                  <span className="text-2xl font-black text-blue-900">₹{netAmount.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-500 text-right mt-1">
                  Printed with registration BLG03043ALHL3
                </div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={submitting} className="btn-primary btn-lg w-full justify-center">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={17} /> Save &amp; Generate Final Bill &amp; Prescription</>}
        </button>
      </div>
    </Layout>
  )
}
