import { useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Pill, CheckCircle, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function PharmacyDashboard() {
  const { user } = useAuth()
  const [patientId, setPatientId] = useState('')
  const [prescription, setPrescription] = useState(null)
  const [searching, setSearching] = useState(false)
  const [dispensed, setDispensed] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const searchPatient = async (e) => {
    e.preventDefault()
    if (!patientId.trim()) return
    setSearching(true)
    setPrescription(null)
    setDone(false)
    try {
      const { data } = await api.get(`/pharmacy/prescription/${patientId.trim()}`)
      setPrescription(data)
      const initialDispensed = {}
      data.medicines.forEach(m => { initialDispensed[m.medicine_name] = m.duration_days || 1 })
      setDispensed(initialDispensed)
    } catch {
      toast.error('No active prescription found for this patient ID')
    } finally {
      setSearching(false)
    }
  }

  const handleDispense = async () => {
    if (!prescription) return
    setSubmitting(true)
    try {
      await api.post('/pharmacy/dispense/', {
        patient_id: prescription.patient_id,
        prescription_id: prescription.prescription_id,
        medicines_dispensed: Object.entries(dispensed).map(([medicine_name, quantity]) => ({ medicine_name, quantity })),
        dispensed_by: user.staff_id,
      })
      setDone(true)
      toast.success('Medicines dispensed and logged!')
    } catch {
      toast.error('Dispensing failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Pharmacy Dispensing">
      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={searchPatient} className="card mb-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Search size={17} className="text-primary-500" /> Search Patient
          </h3>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Enter Patient ID (e.g. SAI-2026-00001)"
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
            />
            <button type="submit" disabled={searching} className="btn-primary">
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Search
            </button>
          </div>
        </form>

        {/* Prescription */}
        {prescription && !done && (
          <div className="card animate-slide-up">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={17} className="text-primary-500" />
              <h3 className="font-semibold text-slate-800">Active Prescription</h3>
            </div>
            <div className="text-xs text-slate-400 mb-4">
              {prescription.patient_id} · {format(new Date(prescription.created_at), 'dd MMM yyyy')}
            </div>

            <div className="space-y-2 mb-4">
              {prescription.medicines.map((med, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Pill size={16} className="text-primary-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm">{med.medicine_name}</div>
                    <div className="text-xs text-slate-500">{med.dosage} · {med.frequency} · {med.duration_days} days</div>
                    {med.instructions && <div className="text-xs text-slate-400 mt-0.5">{med.instructions}</div>}
                  </div>
                  <div className="shrink-0">
                    <label className="text-xs text-slate-500 block mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      className="input w-16 text-center text-sm py-1"
                      value={dispensed[med.medicine_name] || 1}
                      onChange={e => setDispensed(d => ({ ...d, [med.medicine_name]: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleDispense} disabled={submitting} className="btn-success btn-lg w-full justify-center">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={17} /> Dispense Medicines</>}
            </button>
          </div>
        )}

        {done && (
          <div className="card text-center py-10 animate-slide-up">
            <CheckCircle size={48} className="text-success-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Medicines Dispensed!</h3>
            <p className="text-slate-500 text-sm mb-4">Inventory updated automatically.</p>
            <button onClick={() => { setPrescription(null); setPatientId(''); setDone(false) }} className="btn-primary">
              Dispense Another
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
