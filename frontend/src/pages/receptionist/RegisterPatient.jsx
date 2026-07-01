import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { UserPlus, ChevronRight, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const LANGUAGES = ['english', 'marathi', 'kannada', 'hindi']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function RegisterPatient() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(null)

  const [form, setForm] = useState({
    full_name: '', mobile_number: '', age: '', gender: 'male',
    address: '', blood_group: '', known_allergies: '', chronic_conditions: '',
    language_preference: 'marathi', date_of_birth: '',
  })
  const [visitForm, setVisitForm] = useState({ doctor_id: '', visit_type: 'OPD', chief_complaint: '' })

  useEffect(() => {
    api.get('/staff/').then(({ data }) => setDoctors(data.filter(s => s.role === 'doctor'))).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setV = (k) => (e) => setVisitForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.mobile_number || !form.age || !form.gender) {
      return toast.error('Name, mobile, age, and gender are required')
    }
    setSubmitting(true)
    try {
      const { data: patient } = await api.post('/patients/', {
        ...form,
        age: parseInt(form.age),
        date_of_birth: form.date_of_birth || null,
      })

      // Create visit if doctor selected or chief complaint entered
      if (visitForm.doctor_id || visitForm.chief_complaint) {
        await api.post('/visits/', {
          patient_id: patient.patient_id,
          doctor_id: visitForm.doctor_id || null,
          visit_type: visitForm.visit_type,
          chief_complaint: visitForm.chief_complaint || null,
        })
      }

      setRegistered(patient)
      toast.success(`Patient registered! ID: ${patient.patient_id}`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (registered) {
    return (
      <Layout title="Patient Registered">
        <div className="max-w-lg mx-auto">
          <div className="card text-center py-10">
            <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus size={28} className="text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Patient Registered!</h2>
            <div className="text-3xl font-mono font-bold text-primary-600 my-4 p-4 bg-primary-50 rounded-xl">
              {registered.patient_id}
            </div>
            <p className="text-slate-600 text-sm mb-1"><strong>{registered.full_name}</strong></p>
            <p className="text-slate-400 text-sm mb-6">WhatsApp welcome message sent ✅</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setRegistered(null)} className="btn-primary">
                <UserPlus size={15} /> Register Another
              </button>
              <button onClick={() => navigate('/receptionist/queue')} className="btn-secondary">
                Go to Queue
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Register New Patient">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm mb-4">
          <ArrowLeft size={14} /> Back
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Info */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-primary-500" /> Patient Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Full Name *</label>
                <input className="input" placeholder="e.g. Ramesh Patil" value={form.full_name} onChange={set('full_name')} required />
              </div>
              <div>
                <label className="label">Mobile Number *</label>
                <input className="input" placeholder="10-digit mobile" value={form.mobile_number} onChange={set('mobile_number')} required maxLength={10} />
              </div>
              <div>
                <label className="label">Age *</label>
                <input className="input" type="number" placeholder="Age in years" value={form.age} onChange={set('age')} required min={0} max={150} />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input className="input" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select className="input" value={form.blood_group} onChange={set('blood_group')}>
                  <option value="">Unknown</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Language Preference</label>
                <select className="input" value={form.language_preference} onChange={set('language_preference')}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <textarea className="input" rows={2} placeholder="Full address" value={form.address} onChange={set('address')} />
              </div>
              <div>
                <label className="label">Known Allergies</label>
                <input className="input" placeholder="e.g. Penicillin" value={form.known_allergies} onChange={set('known_allergies')} />
              </div>
              <div>
                <label className="label">Chronic Conditions</label>
                <input className="input" placeholder="e.g. Hypertension, Diabetes" value={form.chronic_conditions} onChange={set('chronic_conditions')} />
              </div>
            </div>
          </div>

          {/* Visit Details */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Add to OPD Queue <span className="text-xs text-slate-400 font-normal">(optional)</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Doctor</label>
                <select className="input" value={visitForm.doctor_id} onChange={setV('doctor_id')}>
                  <option value="">Select Doctor</option>
                  {doctors.map(d => <option key={d.staff_id} value={d.staff_id}>Dr. {d.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Visit Type</label>
                <select className="input" value={visitForm.visit_type} onChange={setV('visit_type')}>
                  <option value="OPD">OPD</option>
                  <option value="IPD">IPD</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Chief Complaint</label>
                <input className="input" placeholder="e.g. Fever since 3 days, headache" value={visitForm.chief_complaint} onChange={setV('chief_complaint')} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary btn-lg w-full justify-center">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={17} /> Register Patient</>}
          </button>
        </form>
      </div>
    </Layout>
  )
}
