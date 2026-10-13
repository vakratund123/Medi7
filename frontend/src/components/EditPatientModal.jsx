import { useState, useEffect } from 'react'
import api from '../api/client'
import { X, UserCheck, Loader2, Phone, User, Calendar, MapPin, AlertTriangle, Activity, Globe, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const LANGUAGES = [
  { value: 'marathi', label: 'Marathi (मराठी)' },
  { value: 'kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi (हिंदी)' },
]

export default function EditPatientModal({ patient, onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    age: '',
    gender: 'male',
    date_of_birth: '',
    blood_group: '',
    address: '',
    known_allergies: '',
    chronic_conditions: '',
    language_preference: 'marathi',
    referred_by: '',
  })

  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.full_name || '',
        mobile_number: patient.mobile_number || patient.phone || '',
        age: patient.age ? String(patient.age) : '',
        gender: patient.gender || 'male',
        date_of_birth: patient.date_of_birth || '',
        blood_group: patient.blood_group || '',
        address: patient.address || '',
        known_allergies: patient.known_allergies || '',
        chronic_conditions: patient.chronic_conditions || '',
        language_preference: patient.language_preference || 'marathi',
        referred_by: patient.referred_by || '',
      })
    }
  }, [patient])

  if (!patient) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.full_name.trim()) {
      return toast.error('Patient full name is required')
    }
    const cleanMobile = formData.mobile_number.trim()
    if (!cleanMobile || cleanMobile.length < 10) {
      return toast.error('Please enter a valid 10-digit mobile number')
    }
    if (!formData.age || isNaN(parseInt(formData.age)) || parseInt(formData.age) <= 0) {
      return toast.error('Please enter a valid age')
    }

    setLoading(true)
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        mobile_number: cleanMobile,
        age: parseInt(formData.age),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth || null,
        blood_group: formData.blood_group || null,
        address: formData.address.trim() || null,
        known_allergies: formData.known_allergies.trim() || null,
        chronic_conditions: formData.chronic_conditions.trim() || null,
        language_preference: formData.language_preference,
        referred_by: formData.referred_by.trim() || null,
      }

      const { data } = await api.put(`/patients/${patient.patient_id}`, payload)
      toast.success(`Patient details for ${data.full_name} updated successfully!`)
      if (onSaved) onSaved(data)
      if (onClose) onClose()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update patient details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-primary-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm shadow-inner">
              <UserCheck size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Edit Patient Profile</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/20 text-white border border-white/30">
                  {patient.patient_id}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Update patient demographics, contact info, and medical alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <User size={14} className="text-primary-600" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Ramesh Shankar Patil"
                required
                className="input w-full text-sm font-semibold"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Phone size={14} className="text-primary-600" />
                <span>Mobile Number *</span>
              </label>
              <input
                type="tel"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="10-digit mobile"
                maxLength={15}
                required
                className="input w-full text-sm font-mono"
              />
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Age (Yrs) *
                </label>
                <input
                  type="number"
                  name="age"
                  min="0"
                  max="130"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="e.g. 35"
                  required
                  className="input w-full text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input w-full text-sm capitalize"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                <span>Date of Birth (Optional)</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="input w-full text-sm"
              />
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Activity size={14} className="text-rose-500" />
                <span>Blood Group</span>
              </label>
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                className="input w-full text-sm"
              >
                <option value="">Unknown / Not Tested</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Language Preference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-500" />
                <span>Language Preference (WhatsApp)</span>
              </label>
              <select
                name="language_preference"
                value={formData.language_preference}
                onChange={handleChange}
                className="input w-full text-sm"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Referred By */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Stethoscope size={14} className="text-indigo-500" />
                <span>Referred By (Doctor / Hospital)</span>
              </label>
              <input
                type="text"
                name="referred_by"
                value={formData.referred_by}
                onChange={handleChange}
                placeholder="Self / Dr. Name"
                className="input w-full text-sm"
              />
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400" />
                <span>Address / City / Village</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Nipani, Belgavi Dist."
                className="input w-full text-sm"
              />
            </div>

            {/* Known Allergies */}
            <div>
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>Known Allergies</span>
              </label>
              <input
                type="text"
                name="known_allergies"
                value={formData.known_allergies}
                onChange={handleChange}
                placeholder="e.g. Penicillin, Sulfa drugs"
                className="input w-full text-sm bg-amber-50/40 border-amber-200"
              />
            </div>

            {/* Chronic Conditions */}
            <div>
              <label className="block text-xs font-bold text-purple-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Activity size={14} className="text-purple-600" />
                <span>Chronic Conditions</span>
              </label>
              <input
                type="text"
                name="chronic_conditions"
                value={formData.chronic_conditions}
                onChange={handleChange}
                placeholder="e.g. Diabetes, Hypertension, Asthma"
                className="input w-full text-sm bg-purple-50/40 border-purple-200"
              />
            </div>

          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-5 py-2 text-sm font-bold flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>Save Patient Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
