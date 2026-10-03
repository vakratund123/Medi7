import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { UserPlus, ChevronRight, Loader2, ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const LANGUAGES = ['english', 'marathi', 'kannada', 'hindi']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function RegisterPatient() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [registered, setRegistered] = useState(null)
  const [deletingRegistered, setDeletingRegistered] = useState(false)

  // Existing patient duplicate detection
  const [existingPatients, setExistingPatients] = useState([])
  const [checkingMobile, setCheckingMobile] = useState(false)
  const [addingVisitExisting, setAddingVisitExisting] = useState(false)

  const [form, setForm] = useState({
    full_name: '', mobile_number: '', age: '', gender: 'male',
    address: '', blood_group: '', known_allergies: '', chronic_conditions: '',
    language_preference: 'marathi', date_of_birth: '', referred_by: '',
  })
  const [visitForm, setVisitForm] = useState({ doctor_id: '', visit_type: 'OPD', chief_complaint: '' })

  useEffect(() => {
    api.get('/staff/').then(({ data }) => setDoctors(data.filter(s => s.role === 'doctor'))).catch(() => {})
  }, [])

  // Auto-check for existing patients by 10-digit mobile number to prevent duplicate registrations
  useEffect(() => {
    const mobile = form.mobile_number?.trim()
    if (mobile && mobile.length >= 10) {
      setCheckingMobile(true)
      const timer = setTimeout(async () => {
        try {
          const { data } = await api.get(`/patients/?q=${mobile}`)
          setExistingPatients(data || [])
        } catch {
          setExistingPatients([])
        } finally {
          setCheckingMobile(false)
        }
      }, 350)
      return () => clearTimeout(timer)
    } else {
      setExistingPatients([])
    }
  }, [form.mobile_number])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setV = (k) => (e) => setVisitForm(f => ({ ...f, [k]: e.target.value }))

  const handleAddVisitForExisting = async (p) => {
    setAddingVisitExisting(true)
    try {
      await api.post('/visits/', {
        patient_id: p.patient_id,
        doctor_id: visitForm.doctor_id || null,
        visit_type: visitForm.visit_type || 'OPD',
        chief_complaint: visitForm.chief_complaint || 'General OPD Consultation',
        referred_by: form.referred_by || p.referred_by || null,
      })
      toast.success(`OPD Visit created for ${p.full_name} (${p.patient_id})!`)
      navigate('/receptionist/queue')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add visit')
    } finally {
      setAddingVisitExisting(false)
    }
  }

  const handleDeleteRegistered = async (patientId) => {
    if (!window.confirm(`Delete registration for ${registered.full_name} (${patientId})? This will completely remove this accidental entry.`)) return
    setDeletingRegistered(true)
    try {
      await api.delete(`/patients/${patientId}?reason=Accidental+duplicate+registration`)
      toast.success('Registration removed successfully!')
      setRegistered(null)
      setForm({
        full_name: '', mobile_number: '', age: '', gender: 'male',
        address: '', blood_group: '', known_allergies: '', chronic_conditions: '',
        language_preference: 'marathi', date_of_birth: '', referred_by: '',
      })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete registration')
    } finally {
      setDeletingRegistered(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || submittingRef.current) return
    if (!form.full_name || !form.mobile_number || !form.age || !form.gender) {
      return toast.error('Name, mobile, age, and gender are required')
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      const { data: patient } = await api.post('/patients/', {
        ...form,
        age: parseInt(form.age),
        date_of_birth: form.date_of_birth || null,
        referred_by: form.referred_by || null,
      })

      // Always create OPD visit so patient appears in the waiting queue immediately
      await api.post('/visits/', {
        patient_id: patient.patient_id,
        doctor_id: visitForm.doctor_id || null,
        visit_type: visitForm.visit_type || 'OPD',
        chief_complaint: visitForm.chief_complaint || 'General OPD Consultation',
        referred_by: form.referred_by || null,
      })

      setRegistered(patient)
      toast.success(`Patient registered! ID: ${patient.patient_id}`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (registered) {
    return (
      <Layout title="Patient Registered">
        <div className="max-w-lg mx-auto">
          <div className="card text-center py-10 shadow-lg border border-slate-200">
            <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus size={28} className="text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Patient Registered!</h2>
            <div className="text-3xl font-mono font-bold text-primary-600 my-4 p-4 bg-primary-50 rounded-xl">
              {registered.patient_id}
            </div>
            <p className="text-slate-600 text-sm mb-1"><strong>{registered.full_name}</strong></p>
            <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-left">
              <p className="font-semibold mb-1">📱 Reception Action:</p>
              <p>Please ask patient <strong>{registered.full_name}</strong> to send <strong>"HI"</strong> to <strong>+91 91801 98107</strong> on WhatsApp to receive direct prescription & bill PDFs in {registered.language_preference || 'their chosen language'}!</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setRegistered(null)} className="btn-primary">
                <UserPlus size={15} /> Register Another
              </button>
              <button onClick={() => navigate('/receptionist/queue')} className="btn-secondary">
                Go to Queue
              </button>
            </div>

            {/* Quick delete if registered by mistake */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingRegistered}
                onClick={() => handleDeleteRegistered(registered.patient_id)}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center justify-center gap-1 mx-auto font-medium transition-colors"
              >
                {deletingRegistered ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Registered by mistake? Delete this entry</span>
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
                <label className="label flex items-center justify-between">
                  <span>Mobile Number *</span>
                  {checkingMobile && <span className="text-[11px] text-slate-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Checking...</span>}
                </label>
                <input className="input" placeholder="10-digit mobile" value={form.mobile_number} onChange={set('mobile_number')} required maxLength={10} />
              </div>

              {/* Existing Patient Found Warning to prevent duplicate registrations */}
              {existingPatients.length > 0 && (
                <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2 animate-fade-in shadow-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>Existing Patient(s) Found with Mobile {form.mobile_number}:</span>
                  </div>
                  <div className="space-y-1.5">
                    {existingPatients.map(ep => (
                      <div key={ep.patient_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-amber-200">
                        <div>
                          <span className="font-bold text-slate-800 text-sm">{ep.full_name}</span>
                          <span className="ml-2 font-mono font-bold text-blue-700">{ep.patient_id}</span>
                          <span className="text-slate-500 ml-2">({ep.age}Y, {ep.gender})</span>
                          {ep.address && <span className="text-slate-400 ml-2 truncate max-w-[140px] inline-block align-bottom">&bull; {ep.address}</span>}
                        </div>
                        <button
                          type="button"
                          disabled={addingVisitExisting}
                          onClick={() => handleAddVisitForExisting(ep)}
                          className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs"
                        >
                          {addingVisitExisting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                          <span>+ Add to Queue (No Duplicate)</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-amber-800 text-[11px] leading-tight">
                    💡 <strong>Avoid double entries:</strong> Click <strong>"+ Add to Queue"</strong> above if this is the same patient returning, instead of creating a duplicate registration.
                  </p>
                </div>
              )}
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
              <div className="sm:col-span-2">
                <label className="label flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Referred By (Doctor / Clinic / Hospital)</span>
                  <span className="text-xs text-primary-600">Important for Dr. Referral tracking</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. Dr. Kulkarni (Sangli) or Self / Direct Walk-in"
                  value={form.referred_by}
                  onChange={set('referred_by')}
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-xs text-slate-400 mr-1">Quick select:</span>
                  {['Self / Walk-in', 'Dr. Kulkarni (Sangli)', 'Dr. A. Patil (Kolhapur)', 'Dr. S. Joshi (Miraj)', 'Dr. V. Shinde (Karad)'].map(refName => (
                    <button
                      key={refName}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, referred_by: refName }))}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${form.referred_by === refName ? 'bg-primary-600 border-primary-600 text-white font-medium shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {refName}
                    </button>
                  ))}
                </div>
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
                  {doctors.map(d => {
                    const docName = d.full_name?.startsWith('Dr') ? d.full_name : `Dr. ${d.full_name}`
                    return (
                      <option key={d.staff_id} value={d.staff_id}>
                        {docName} {d.department ? `— ${d.department}` : ''}
                      </option>
                    )
                  })}
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
