import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Plus, Trash2, CheckCircle, Loader2, FlaskConical, Scan, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const FREQUENCIES = ['1-0-0', '0-1-0', '0-0-1', '1-1-0', '1-0-1', '0-1-1', '1-1-1', 'SOS']
const COMMON_TESTS = ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'HbA1c', 'Thyroid Profile', 'Urine Routine', 'Blood Sugar Fasting', 'Electrolytes', 'CRP', 'D-Dimer']
const SCAN_TYPES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography']

function MedicineRow({ med, onChange, onRemove }) {
  const set = (k) => (e) => onChange({ ...med, [k]: e.target.value })
  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl mb-2">
      <div className="col-span-12 sm:col-span-3">
        <label className="label text-xs">Medicine</label>
        <input className="input" placeholder="e.g. Paracetamol 500mg" value={med.medicine_name} onChange={set('medicine_name')} />
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
      <div className="col-span-6 sm:col-span-2">
        <label className="label text-xs">Days</label>
        <input className="input" type="number" min="1" placeholder="5" value={med.duration_days} onChange={set('duration_days')} />
      </div>
      <div className="col-span-5 sm:col-span-2">
        <label className="label text-xs">Instructions</label>
        <input className="input" placeholder="After food" value={med.instructions} onChange={set('instructions')} />
      </div>
      <div className="col-span-1 pb-0.5">
        <button type="button" onClick={onRemove} className="btn btn-danger btn-sm w-full justify-center h-[38px]">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

const newMed = () => ({ medicine_name: '', dosage: '', frequency: '1-1-1', duration_days: 5, instructions: '' })

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
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get(`/visits/${visitId}`).then(async ({ data: v }) => {
      setVisit(v)
      if (v.diagnosis) setDiagnosis(v.diagnosis)
      if (v.notes) setNotes(v.notes)
      if (v.follow_up_date) setFollowUp(v.follow_up_date)
      const { data: p } = await api.get(`/patients/${v.patient_id}`)
      setPatient(p)
    }).catch(() => toast.error('Visit not found'))
  }, [visitId])

  const toggleTest = (t) => setTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const toggleScan = (s) => setScans(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = async () => {
    if (!diagnosis) return toast.error('Please enter a diagnosis')
    const validMeds = medicines.filter(m => m.medicine_name.trim())
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

      setSaved(true)
      toast.success('Consultation saved! Prescription sent via WhatsApp.')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save consultation')
    } finally {
      setSubmitting(false)
    }
  }

  if (saved) return (
    <Layout title="Consultation Saved">
      <div className="max-w-md mx-auto card text-center py-12">
        <CheckCircle size={48} className="text-success-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Consultation Complete!</h2>
        <p className="text-slate-500 text-sm mb-6">Prescription PDF generated and sent to patient via WhatsApp.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/doctor/queue')} className="btn-primary">Back to Queue</button>
        </div>
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

        {/* Lab Tests */}
        <div className="card mb-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FlaskConical size={17} className="text-primary-500" /> Lab Tests
          </h3>
          <div className="flex flex-wrap gap-2">
            {COMMON_TESTS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTest(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tests.includes(t) ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tests.length > 0 && (
            <div className="mt-3 text-sm text-primary-600 font-medium">Selected: {tests.join(', ')}</div>
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

        <button onClick={handleSave} disabled={submitting} className="btn-primary btn-lg w-full justify-center">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={17} /> Save & Generate Prescription</>}
        </button>
      </div>
    </Layout>
  )
}
