import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { ArrowLeft, AlertTriangle, Stethoscope, FlaskConical, Scan, FileText, Pill, Loader2, ChevronDown, ChevronUp, Bot, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

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
  const { patientId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const visitId = searchParams.get('visit')
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/patients/${patientId}/history`)
      .then(({ data }) => setHistory(data))
      .catch(() => toast.error('Could not load patient history'))
      .finally(() => setLoading(false))
  }, [patientId])

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
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
          {visitId && (
            <button onClick={() => navigate(`/doctor/consultation/${visitId}`)} className="btn-primary">
              <Stethoscope size={15} /> Start Consultation
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
                <div key={v.visit_id} className="p-3 bg-slate-50 rounded-xl text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{v.visit_date}</span>
                    {v.diagnosis && <span className="text-xs text-slate-500">{v.diagnosis}</span>}
                  </div>
                  {v.notes && <p className="text-slate-600 mt-1 text-xs">{v.notes}</p>}
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
                  <div className="text-xs text-slate-400 mb-2">{format(new Date(p.created_at), 'dd MMM yyyy')}</div>
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
    </Layout>
  )
}
