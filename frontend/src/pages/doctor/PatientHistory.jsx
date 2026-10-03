import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import PrescriptionLetterheadModal from '../../components/PrescriptionLetterheadModal'
import api from '../../api/client'
import { ArrowLeft, AlertTriangle, Stethoscope, FlaskConical, Scan, FileText, Pill, Loader2, ChevronDown, ChevronUp, Bot, ExternalLink, Printer, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card mb-4">
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Icon size={17} className="text-primary-500" /> {title}
        </h3>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default function PatientHistory() {
  const { user } = useAuth()
  const canDelete = ['receptionist', 'reception', 'owner', 'manager', 'admin', 'doctor', 'cashier'].includes(user?.role?.toLowerCase())
  const { patientId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const visitId = searchParams.get('visit')
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedRx, setSelectedRx] = useState(null)

  // Deletion modals state for cleaning up test entries
  const [deletePatientModal, setDeletePatientModal] = useState(false)
  const [deletePatientReason, setDeletePatientReason] = useState('Test / dummy entry created during testing')
  const [forceDeletePatient, setForceDeletePatient] = useState(true)
  const [deletingPatient, setDeletingPatient] = useState(false)

  const [deleteVisitModal, setDeleteVisitModal] = useState(null)
  const [deleteVisitReason, setDeleteVisitReason] = useState('Test entry created during testing')
  const [forceDeleteVisit, setForceDeleteVisit] = useState(true)
  const [deletingVisit, setDeletingVisit] = useState(false)

  useEffect(() => {
    api.get(`/patients/${patientId}/history`)
      .then(({ data }) => setHistory(data))
      .catch(() => toast.error('Could not load patient history'))
      .finally(() => setLoading(false))
  }, [patientId])

  const handleConfirmDeletePatient = async () => {
    setDeletingPatient(true)
    try {
      const { data } = await api.delete(`/patients/${patientId}`, {
        params: {
          reason: deletePatientReason,
          force: forceDeletePatient,
        }
      })
      toast.success(data.message || 'Patient record deleted successfully')
      navigate('/patients')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete patient record')
    } finally {
      setDeletingPatient(false)
    }
  }

  const handleConfirmDeleteVisit = async () => {
    if (!deleteVisitModal) return
    setDeletingVisit(true)
    try {
      const isLastVisit = history?.visits?.length <= 1
      const { data } = await api.delete(`/visits/${deleteVisitModal.visit_id}`, {
        params: {
          reason: deleteVisitReason,
          force: forceDeleteVisit,
          delete_patient: isLastVisit,
        }
      })
      toast.success(data.message || 'Visit deleted successfully')
      setDeleteVisitModal(null)
      if (isLastVisit) {
        navigate('/patients')
      } else {
        const { data: updated } = await api.get(`/patients/${patientId}/history`)
        setHistory(updated)
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete visit entry')
    } finally {
      setDeletingVisit(false)
    }
  }

  if (loading) return (
    <Layout title="Patient History">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={28} />
      </div>
    </Layout>
  )

  if (!history) return (
    <Layout title="Patient History">
      <div className="card text-center py-16 text-slate-500">Patient not found</div>
    </Layout>
  )

  const { patient, visits, prescriptions, lab_reports, scans, ai_summary } = history

  return (
    <Layout title={patient.full_name}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
              <ArrowLeft size={14} /> Back
            </button>
            {visitId && (
              <button onClick={() => navigate(`/doctor/consultation/${visitId}`)} className="btn-primary">
                <Stethoscope size={15} /> Start Consultation
              </button>
            )}
          </div>

          {canDelete && (
            <button
              onClick={() => setDeletePatientModal(true)}
              className="btn-secondary btn-sm text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              title="Delete entire test patient record"
            >
              <Trash2 size={13} className="text-rose-600" />
              <span>Delete Patient Record</span>
            </button>
          )}
        </div>

        {/* Patient summary card */}
        <div className="card mb-4 bg-gradient-to-r from-primary-50 to-white">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{patient.full_name}</h2>
              <div className="text-sm text-slate-600 mt-1">
                {patient.age}Y · {patient.gender} · {patient.blood_group || 'Blood group N/A'}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">{patient.patient_id}</div>
            </div>
            {(patient.known_allergies || patient.chronic_conditions) && (
              <div className="flex flex-col gap-1">
                {patient.known_allergies && (
                  <div className="badge badge-red">
                    <AlertTriangle size={11} /> Allergy: {patient.known_allergies}
                  </div>
                )}
                {patient.chronic_conditions && (
                  <div className="badge badge-orange">
                    {patient.chronic_conditions}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Summary */}
          {ai_summary && (
            <div className="mt-4 p-3 bg-white rounded-xl border border-primary-100">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-primary-600">
                <Bot size={13} /> AI Patient Summary
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{ai_summary}</p>
            </div>
          )}
        </div>

        {/* Visit History */}
        <Section title={`Visit History (${visits.length})`} icon={Stethoscope}>
          {visits.length === 0 ? <p className="text-sm text-slate-400">No visits recorded</p> : (
            <div className="space-y-3">
              {visits.map(v => (
                <div key={v.visit_id} className="p-3 bg-slate-50 rounded-xl text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{v.visit_date}</span>
                      {v.diagnosis && <span className="text-xs text-slate-500 font-medium">{v.diagnosis}</span>}
                    </div>
                    {v.chief_complaint && <p className="text-slate-600 text-xs mt-0.5">Complaint: {v.chief_complaint}</p>}
                    {v.notes && <p className="text-slate-600 mt-1 text-xs">{v.notes}</p>}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteVisitModal(v)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      title="Delete this visit entry (e.g. test entry or duplicate)"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Prescriptions */}
        <Section title={`Prescriptions (${prescriptions.length})`} icon={FileText} defaultOpen={false}>
          {prescriptions.length === 0 ? <p className="text-sm text-slate-400">No prescriptions</p> : (
            <div className="space-y-3">
              {prescriptions.map(p => (
                <div key={p.prescription_id} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">{format(new Date(p.created_at), 'dd MMM yyyy')}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRx(p)}
                      className="btn-secondary btn-sm px-2.5 py-0.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <Printer size={12} className="text-blue-600" /> Print Official Rx
                    </button>
                  </div>
                  {p.medicines.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
                      <Pill size={13} className="text-primary-400 shrink-0" />
                      <span className="font-medium">{m.medicine_name}</span>
                      <span className="text-slate-500">{m.dosage} · {m.frequency} · {m.duration_days}d</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Lab Reports */}
        <Section title={`Lab Reports (${lab_reports.length})`} icon={FlaskConical} defaultOpen={false}>
          {lab_reports.length === 0 ? <p className="text-sm text-slate-400">No lab reports</p> : (
            <div className="space-y-3">
              {lab_reports.map(r => (
                <div key={r.report_id} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {r.report_type && <span className="badge badge-blue">{r.report_type}</span>}
                      {r.created_at && <span className="text-xs text-slate-400">{format(new Date(r.created_at), 'dd MMM yyyy')}</span>}
                    </div>
                    {r.file_url && (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        <ExternalLink size={11} /> View Report
                      </a>
                    )}
                  </div>
                  {r.ai_summary && <p className="text-sm text-slate-700 mb-2">{r.ai_summary}</p>}
                  {Object.keys(r.abnormal_flags || {}).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(r.abnormal_flags).map(([k, v]) => (
                        <span key={k} className="badge badge-red">⚠️ {k}: {v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Scans */}
        <Section title={`Scans (${scans.length})`} icon={Scan} defaultOpen={false}>
          {scans.length === 0 ? <p className="text-sm text-slate-400">No scans</p> : (
            <div className="space-y-2">
              {scans.map(s => (
                <div key={s.scan_id} className="p-3 bg-slate-50 rounded-xl text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.scan_type}</span>
                      {s.created_at && <span className="text-xs text-slate-400">{format(new Date(s.created_at), 'dd MMM yyyy')}</span>}
                    </div>
                    {s.file_url && (
                      <a
                        href={s.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        <ExternalLink size={11} /> View Scan
                      </a>
                    )}
                  </div>
                  {s.radiologist_remarks && <p className="text-slate-600 mt-1">{s.radiologist_remarks}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {selectedRx && (
        <PrescriptionLetterheadModal
          prescription={selectedRx}
          patient={patient}
          doctor={{ full_name: selectedRx.doctor_name || 'Dr. Rahul Nirmale', designation: 'Consultant Physician' }}
          onClose={() => setSelectedRx(null)}
        />
      )}

      {/* Delete Patient Record Modal */}
      {deletePatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Delete Patient Record
                  </h3>
                  <p className="text-xs text-slate-500">Purge entire patient profile &amp; history</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletePatientModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-900 text-sm">{patient.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient ID:</span>
                <span className="font-mono font-bold text-blue-700">{patient.patient_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Recorded Visits:</span>
                <span className="font-semibold text-slate-700">{visits.length} visits</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-xs font-semibold text-slate-700">Reason for Deletion</label>
              <select
                className="input text-xs"
                value={deletePatientReason}
                onChange={e => setDeletePatientReason(e.target.value)}
              >
                <option value="Test / dummy entry created during testing">Test / dummy entry created during testing</option>
                <option value="Accidental duplicate registration">Accidental duplicate registration</option>
                <option value="Wrong patient name or data entered">Wrong patient name or data entered</option>
                <option value="Patient cancelled consultation">Patient cancelled consultation</option>
                <option value="Data cleanup requested by management">Data cleanup requested by management</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200 cursor-pointer hover:bg-rose-50 transition-colors">
                <input
                  type="checkbox"
                  checked={forceDeletePatient}
                  onChange={e => setForceDeletePatient(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">
                    Force delete all associated test data
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    Permanently purges all visits, bills, prescriptions, and lab tests for this patient.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletePatientModal(false)}
                disabled={deletingPatient}
                className="btn-secondary w-1/3 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePatient}
                disabled={deletingPatient}
                className="btn-primary w-2/3 justify-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 shadow-md flex items-center gap-1.5"
              >
                {deletingPatient ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deletingPatient ? 'Deleting Patient...' : 'Confirm Delete Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Visit Modal */}
      {deleteVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Delete Visit Entry
                  </h3>
                  <p className="text-xs text-slate-500">Remove specific visit from history</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteVisitModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Visit Date:</span>
                <span className="font-bold text-slate-900">{deleteVisitModal.visit_date}</span>
              </div>
              {deleteVisitModal.diagnosis && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Diagnosis:</span>
                  <span className="font-semibold text-slate-800">{deleteVisitModal.diagnosis}</span>
                </div>
              )}
              {deleteVisitModal.chief_complaint && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Complaint:</span>
                  <span className="text-slate-700 italic">{deleteVisitModal.chief_complaint}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-slate-500">
                <span>Total Patient Visits:</span>
                <span>{visits.length}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-xs font-semibold text-slate-700">Reason for Deletion</label>
              <select
                className="input text-xs"
                value={deleteVisitReason}
                onChange={e => setDeleteVisitReason(e.target.value)}
              >
                <option value="Test entry created during testing">Test entry created during testing</option>
                <option value="Duplicate consultation entry">Duplicate consultation entry</option>
                <option value="Wrong doctor or patient assigned">Wrong doctor or patient assigned</option>
                <option value="Consultation cancelled">Consultation cancelled</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200 cursor-pointer hover:bg-rose-50 transition-colors">
                <input
                  type="checkbox"
                  checked={forceDeleteVisit}
                  onChange={e => setForceDeleteVisit(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">
                    Force delete related test bills &amp; prescriptions
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    Removes all billing records and prescription items generated during this specific visit.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteVisitModal(null)}
                disabled={deletingVisit}
                className="btn-secondary w-1/3 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVisit}
                disabled={deletingVisit}
                className="btn-primary w-2/3 justify-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 shadow-md flex items-center gap-1.5"
              >
                {deletingVisit ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deletingVisit ? 'Deleting Visit...' : 'Confirm Delete Visit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
