import { useNavigate } from 'react-router-dom'
import { User, ChevronRight, AlertTriangle } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { format } from 'date-fns'

export default function PatientCard({ visit, patient, onClick, showHistory = false }) {
  const navigate = useNavigate()

  const name = patient?.full_name || visit?.patient_id
  const age = patient?.age
  const gender = patient?.gender
  const hasAbnormal = patient?.chronic_conditions || patient?.known_allergies

  return (
    <div
      className="patient-card"
      onClick={() => onClick ? onClick() : navigate(`/doctor/patient/${visit?.patient_id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <User size={18} className="text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{name}</span>
            {age && gender && (
              <span className="text-xs text-slate-500">{age}Y / {gender === 'male' ? 'M' : gender === 'female' ? 'F' : 'O'}</span>
            )}
            {visit?.status && <StatusBadge status={visit.status} />}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">{visit?.patient_id}</div>
          {visit?.chief_complaint && (
            <div className="text-xs text-slate-600 mt-1 line-clamp-1">📋 {visit.chief_complaint}</div>
          )}
          {hasAbnormal && (
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle size={11} className="text-warning-500" />
              <span className="text-xs text-warning-600 truncate">
                {patient.known_allergies ? `Allergy: ${patient.known_allergies}` : patient.chronic_conditions}
              </span>
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
      </div>
    </div>
  )
}
