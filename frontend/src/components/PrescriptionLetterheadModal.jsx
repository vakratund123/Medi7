import React, { useState, useEffect } from 'react'
import { Printer, Download, X, MessageSquare, Plus, Trash2, Loader2, Heart, CheckCircle2 } from 'lucide-react'
import { SAI_HOSPITAL_LOGO_B64 } from '../assets/hospitalLogo'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function PrescriptionLetterheadModal({
  patient,
  visit,
  doctor,
  prescription: initialPrescription,
  onClose,
  onPrescriptionSaved,
}) {
  if (!patient) return null

  const [prescription, setPrescription] = useState(initialPrescription || null)
  const [loading, setLoading] = useState(!initialPrescription && !!visit?.visit_id)
  const [downloading, setDownloading] = useState(false)
  const [sendingWa, setSendingWa] = useState(false)

  // Quick edit mode if adding medicines directly on the letterhead
  const [isEditingMeds, setIsEditingMeds] = useState(false)
  const [medsList, setMedsList] = useState([])
  const [savingMeds, setSavingMeds] = useState(false)

  // Resolve Doctor Details
  const docName = doctor?.full_name
    ? (doctor.full_name.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`)
    : 'Dr. Rahul Nirmale'
  const docDept = doctor?.department || 'Emergency & Multispeciality'
  const docReg = doctor?.reg_no || 'BLG03043ALHL3'

  // Fetch prescription if not passed
  useEffect(() => {
    if (initialPrescription) {
      setPrescription(initialPrescription)
      setMedsList(initialPrescription.medicines || [])
      setLoading(false)
      return
    }

    const fetchRx = async () => {
      if (!visit?.visit_id && !patient?.patient_id) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        if (visit?.visit_id) {
          try {
            const { data } = await api.get(`/prescriptions/visit/${visit.visit_id}`)
            if (data) {
              setPrescription(data)
              setMedsList(data.medicines || [])
              setLoading(false)
              return
            }
          } catch {}
        }
        // Fallback to latest for patient
        const { data: list } = await api.get(`/prescriptions/patient/${patient.patient_id}`)
        if (list && list.length > 0) {
          setPrescription(list[0])
          setMedsList(list[0].medicines || [])
        }
      } catch (err) {
        // No prescription yet - perfectly fine, will allow blank or on-demand Rx
      } finally {
        setLoading(false)
      }
    }

    fetchRx()
  }, [visit?.visit_id, patient?.patient_id, initialPrescription])

  // Printable A4 Frame
  const handlePrint = () => {
    const el = document.getElementById('printable-prescription-sheet')
    if (!el) return

    const existingFrame = document.getElementById('print-prescription-iframe')
    if (existingFrame) existingFrame.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'print-prescription-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.zIndex = '-9999'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(s => s.outerHTML)
      .join('\n')

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Prescription - ${patient.full_name || 'Patient'} (${patient.patient_id || ''})</title>
          ${styleTags}
          <style>
            * { box-sizing: border-box; }
            html, body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              color: #1e293b !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
            #printable-prescription-sheet {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 10px 20px !important;
              position: static !important;
            }
          </style>
        </head>
        <body>
          <div id="printable-prescription-sheet">
            ${el.innerHTML}
          </div>
        </body>
      </html>
    `)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => iframe.remove(), 2500)
    }, 400)
  }

  const handleDownloadPdf = async () => {
    if (prescription?.pdf_url) {
      window.open(prescription.pdf_url, '_blank')
      return
    }
    // If no direct PDF file, browser print to PDF is the standard high-res format
    handlePrint()
  }

  const handleSendWhatsApp = async () => {
    if (!prescription?.prescription_id) {
      toast.error('Save digital prescription first before sending via WhatsApp')
      return
    }
    try {
      setSendingWa(true)
      await api.post(`/whatsapp/resend/prescription/${prescription.prescription_id}`)
      toast.success(`Prescription PDF sent to WhatsApp of ${patient?.full_name}!`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'WhatsApp sending failed')
    } finally {
      setSendingWa(false)
    }
  }

  // Quick Add Medicine Row
  const handleAddMedicineRow = () => {
    setMedsList(prev => [
      ...prev,
      { medicine_name: '', dosage: '', frequency: '1-0-1', duration_days: 5, instructions: 'After food' }
    ])
    setIsEditingMeds(true)
  }

  const handleUpdateMed = (index, field, value) => {
    setMedsList(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleRemoveMed = (index) => {
    setMedsList(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveMeds = async () => {
    const validMeds = medsList.filter(m => m.medicine_name.trim().length > 0)
    if (validMeds.length === 0) {
      toast.error('Please enter at least one medicine name')
      return
    }

    try {
      setSavingMeds(true)
      const payload = {
        visit_id: visit?.visit_id,
        patient_id: patient.patient_id,
        doctor_id: doctor?.staff_id || visit?.doctor_id,
        medicines: validMeds,
      }
      const { data } = await api.post('/prescriptions/', payload)
      setPrescription(data)
      setMedsList(data.medicines || [])
      setIsEditingMeds(false)
      toast.success('Prescription saved and generated on official letterhead!')
      if (onPrescriptionSaved) onPrescriptionSaved(data)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save prescription')
    } finally {
      setSavingMeds(false)
    }
  }

  const activeMedicines = isEditingMeds ? medsList : (prescription?.medicines || medsList)
  const prescriptionDate = prescription?.created_at
    ? new Date(prescription.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/80 flex items-center justify-center">
              <Printer size={17} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Official Prescription Letterhead
                <span className="text-[11px] font-medium bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">
                  {patient.patient_id}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Sai Emergency &amp; Multispeciality Hospital &bull; Dr. {docName.replace(/^Dr\.\s*/i, '')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingMeds && (
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="btn-secondary btn-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center gap-1 text-xs"
                title="Add or Edit medicines on this prescription"
              >
                <Plus size={14} />
                <span>{activeMedicines.length > 0 ? 'Edit Medicines' : '+ Add Rx Meds'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary btn-sm bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 font-bold shadow-md text-xs"
            >
              <Printer size={14} />
              <span>Print Prescription</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="btn-secondary btn-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center gap-1 text-xs"
            >
              <Download size={14} />
              <span>PDF</span>
            </button>

            {prescription?.prescription_id && (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={sendingWa}
                className="btn-secondary btn-sm bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border-emerald-700 flex items-center gap-1 text-xs font-semibold"
                title="Send Prescription PDF to patient WhatsApp"
              >
                {sendingWa ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                <span>WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
              <div className="text-sm font-medium text-slate-600">Loading Patient Prescription...</div>
            </div>
          ) : (
            <div
              id="printable-prescription-sheet"
              className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-9 max-w-3xl mx-auto text-slate-800 text-[13px] leading-normal"
            >
              {/* ================= LETTERHEAD HEADER ================= */}
              <div className="flex items-center justify-between border-b-2 border-blue-600 pb-3 mb-4 gap-3">
                {/* Hospital Logo */}
                <div className="w-[125px] shrink-0 flex items-center justify-start">
                  <img
                    src={SAI_HOSPITAL_LOGO_B64}
                    alt="Sai Emergency & Multispeciality Hospital"
                    className="w-full max-h-[85px] object-contain"
                  />
                </div>

                {/* Hospital Name & Full Address Details */}
                <div className="flex-1 text-center px-1">
                  <div className="font-extrabold text-[#1d4ed8] text-[17px] sm:text-[19px] tracking-wide uppercase leading-tight font-serif">
                    SAI EMERGENCY &amp; MULTISPECIALITY HOSPITAL
                  </div>
                  <div className="text-[10px] font-bold text-sky-700 tracking-wider mt-0.5 uppercase">
                    REG. NO. : BLG03043ALHL3 &bull; 24x7 EMERGENCY &bull; ICU &bull; NICU &bull; TRAUMA CARE
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium leading-snug mt-0.5">
                    Old Motor Stand, NIPANI - 591 237. Dist. Belgavi
                  </div>
                  <div className="text-[9.5px] text-blue-900 font-semibold mt-0.5">
                    Mob. : 9180198107, 7204583699 &bull; semhospitalnipani@gmail.com
                  </div>
                </div>

                {/* Treating Consultant Doctor Details */}
                <div className="w-[130px] shrink-0 text-right leading-tight border-l border-slate-200 pl-2">
                  <div className="font-bold text-slate-900 text-xs sm:text-[13px]">
                    {docName}
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                    {docDept}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5">
                    Reg: {docReg}
                  </div>
                </div>
              </div>

              {/* ================= PATIENT DETAILS BAR ================= */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
                  <span className="font-bold text-slate-900 text-[13px]">{patient.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient ID (SEM)</span>
                  <span className="font-bold text-blue-700 text-[13px] font-mono">{patient.patient_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age / Gender</span>
                  <span className="font-semibold text-slate-800">
                    {patient.age ? `${patient.age} Yrs` : '—'} / {patient.gender ? (patient.gender[0].toUpperCase() + patient.gender.slice(1).toLowerCase()) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                  <span className="font-semibold text-slate-800">{prescriptionDate}</span>
                </div>

                {(visit?.referred_by || patient.referred_by) && (
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Referred By</span>
                    <span className="font-medium text-slate-800">{visit?.referred_by || patient.referred_by}</span>
                  </div>
                )}
                {visit?.visit_type && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visit Type</span>
                    <span className="font-semibold text-slate-800">{visit.visit_type}</span>
                  </div>
                )}
                {patient.mobile_number && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact</span>
                    <span className="font-medium text-slate-800">+91 {patient.mobile_number}</span>
                  </div>
                )}
              </div>

              {/* Clinical Observations / Diagnosis */}
              {(visit?.chief_complaint || visit?.diagnosis) && (
                <div className="mb-4 bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visit.chief_complaint && (
                    <div>
                      <span className="font-bold text-blue-900 block text-[11px]">Chief Complaint / Symptoms:</span>
                      <span className="text-slate-700">{visit.chief_complaint}</span>
                    </div>
                  )}
                  {visit.diagnosis && (
                    <div>
                      <span className="font-bold text-blue-900 block text-[11px]">Provisional Diagnosis:</span>
                      <span className="text-slate-800 font-semibold">{visit.diagnosis}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ================= RX PRESCRIPTION HEADER ================= */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-blue-600 font-serif leading-none">℞</span>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Medical Prescription (Medicines &amp; Dosage)
                  </span>
                </div>
                {activeMedicines.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    {activeMedicines.length} Item{activeMedicines.length > 1 ? 's' : ''} Prescribed
                  </span>
                )}
              </div>

              {/* Medicines Table */}
              {isEditingMeds ? (
                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2">Prescribe Medicines for Patient:</div>
                  {medsList.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Medicine Name & Strength (e.g. Paracetamol 650mg)"
                          value={m.medicine_name}
                          onChange={e => handleUpdateMed(idx, 'medicine_name', e.target.value)}
                          className="input py-1 text-xs w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 1 tab)"
                          value={m.dosage}
                          onChange={e => handleUpdateMed(idx, 'dosage', e.target.value)}
                          className="input py-1 text-xs w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={m.frequency}
                          onChange={e => handleUpdateMed(idx, 'frequency', e.target.value)}
                          className="input py-1 text-xs w-full"
                        >
                          <option value="1-0-1">1-0-1 (M-N)</option>
                          <option value="1-1-1">1-1-1 (M-A-N)</option>
                          <option value="1-0-0">1-0-0 (Morning)</option>
                          <option value="0-0-1">0-0-1 (Night)</option>
                          <option value="SOS">SOS (When needed)</option>
                          <option value="STAT">STAT (Immediately)</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Days"
                          value={m.duration_days}
                          onChange={e => handleUpdateMed(idx, 'duration_days', parseInt(e.target.value) || 1)}
                          className="input py-1 text-xs w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Instructions (e.g. After food)"
                          value={m.instructions}
                          onChange={e => handleUpdateMed(idx, 'instructions', e.target.value)}
                          className="input py-1 text-xs w-full"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMed(idx)}
                          className="text-danger-500 hover:text-danger-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="btn-secondary btn-sm text-xs flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Another Medicine
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingMeds(false)}
                        className="btn-secondary btn-sm text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMeds}
                        disabled={savingMeds}
                        className="btn-primary btn-sm text-xs flex items-center gap-1"
                      >
                        {savingMeds ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Save &amp; Generate
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeMedicines.length > 0 ? (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 border-y border-slate-200">
                        <th className="py-2 px-3 font-bold w-8 text-center">#</th>
                        <th className="py-2 px-3 font-bold">Medicine / Drug Name</th>
                        <th className="py-2 px-3 font-bold">Dosage</th>
                        <th className="py-2 px-3 font-bold">Frequency</th>
                        <th className="py-2 px-3 font-bold w-16 text-center">Duration</th>
                        <th className="py-2 px-3 font-bold">Timing / Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeMedicines.map((med, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-400 text-center">{i + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900">{med.medicine_name}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-700">{med.dosage || '—'}</td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded text-[11px] border border-blue-200">
                              {med.frequency || '1-0-1'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 text-center font-medium">
                            {med.duration_days ? `${med.duration_days} Days` : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 italic">
                            {med.instructions || 'After food'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Blank Clean Ruled Clinical Pad Area for Doctor's handwritten Rx or notes */
                <div className="my-6 py-12 px-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/40 relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none text-4xl font-extrabold uppercase tracking-widest text-slate-900">
                    Sai Emergency Hospital
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium">
                      No digital medicines entered for this consultation yet.
                    </p>
                    <div className="flex items-center justify-center gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={handleAddMedicineRow}
                        className="btn-secondary btn-sm text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold"
                      >
                        <Plus size={13} /> Prescribe Digital Medicines
                      </button>
                    </div>
                    <div className="hidden print:block h-44 border-b border-slate-200"></div>
                  </div>
                </div>
              )}

              {/* Special Advice / Follow-up */}
              <div className="border border-slate-200 rounded-lg p-3 mb-6 bg-slate-50/60 text-xs">
                <div className="font-bold text-slate-800 mb-1">General Instructions &amp; Dietary Advice:</div>
                <ul className="list-disc pl-4 text-slate-600 space-y-0.5 text-[11px]">
                  <li>Take medications on time with warm water as advised.</li>
                  <li>In case of allergy, rash or unusual reaction, contact hospital immediately.</li>
                  <li>Adequate rest and hydration recommended.</li>
                  {visit?.follow_up_date && (
                    <li className="font-semibold text-blue-800">
                      Follow up visit scheduled on: {new Date(visit.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </li>
                  )}
                </ul>
              </div>

              {/* ================= SIGNATURE & FOOTER ================= */}
              <div className="pt-4 border-t border-slate-200 mt-6">
                <div className="flex items-end justify-between">
                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <div>* Emergency 24x7 Helpline: 9180198107, 7204583699</div>
                    <div>* MEDI7 Paperless Healthcare System &bull; DPDP Act 2023 Compliant</div>
                  </div>

                  <div className="text-center w-52">
                    <div className="h-10 border-b border-slate-400 border-dashed mb-1.5 flex items-end justify-center">
                      <span className="text-[10px] text-slate-400 italic">Signature of Consultant</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{docName}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Treating Consultant / Doctor</div>
                    <div className="text-[9px] text-slate-400">Reg: {docReg}</div>
                  </div>
                </div>

                <div className="text-center text-[9.5px] text-slate-400 pt-3 border-t border-slate-100 mt-3">
                  Sai Emergency &amp; Multispeciality Hospital &bull; Old Motor Stand, NIPANI - 591 237. Dist. Belgavi &bull; Ph: 9180198107
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  )
}
