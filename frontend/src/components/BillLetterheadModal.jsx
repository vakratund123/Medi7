import React, { useState, useEffect } from 'react'
import { Printer, Download, X, CheckCircle, Clock, Loader2, MessageSquare, Edit3 } from 'lucide-react'
import { SAI_HOSPITAL_LOGO_B64 } from '../assets/hospitalLogo'
import EditBillModal from './EditBillModal'
import api from '../api/client'
import toast from 'react-hot-toast'

// Helper for converting INR number to words
function numberToWords(amount) {
  try {
    const val = Math.round(Number(amount) || 0)
    if (val === 0) return 'Rupees Zero Only'

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                   'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    function twoDigits(n) {
      if (n < 20) return units[n]
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '')
    }

    function threeDigits(n) {
      if (n === 0) return ''
      const h = Math.floor(n / 100)
      const rem = n % 100
      let res = ''
      if (h > 0) {
        res += units[h] + ' Hundred'
        if (rem > 0) res += ' and '
      }
      if (rem > 0) res += twoDigits(rem)
      return res
    }

    const crore = Math.floor(val / 10000000)
    const remCrore = val % 10000000
    const lakh = Math.floor(remCrore / 100000)
    const remLakh = remCrore % 100000
    const thousand = Math.floor(remLakh / 1000)
    const remThousand = remLakh % 1000

    const parts = []
    if (crore > 0) parts.push(twoDigits(crore) + ' Crore')
    if (lakh > 0) parts.push(twoDigits(lakh) + ' Lakh')
    if (thousand > 0) parts.push(twoDigits(thousand) + ' Thousand')
    if (remThousand > 0) parts.push(threeDigits(remThousand))

    return 'Rupees ' + parts.join(' ').trim() + ' Only'
  } catch (e) {
    return `Rupees ${Number(amount).toFixed(2)} Only`
  }
}

export default function BillLetterheadModal({ bill, patient, doctor, visit, onClose, onBillUpdated }) {
  if (!bill || !patient) return null

  const [currentBill, setCurrentBill] = useState(bill)
  const [isEditing, setIsEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [sendingWa, setSendingWa] = useState(false)

  useEffect(() => {
    if (bill) setCurrentBill(bill)
  }, [bill])

  const handleSendWhatsApp = async () => {
    if (!currentBill?.bill_id) return
    try {
      setSendingWa(true)
      await api.post(`/whatsapp/resend/bill/${currentBill.bill_id}`)
      toast.success(`WhatsApp bill & PDF sent to ${patient?.full_name || 'patient'}!`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'WhatsApp delivery failed')
    } finally {
      setSendingWa(false)
    }
  }

  // Isolated print iframe ensures zero blank pages and perfect full-color rendering
  const handlePrint = () => {
    const el = document.getElementById('printable-letterhead')
    if (!el) return

    // Remove any previous print iframe
    const oldFrame = document.getElementById('print-letterhead-iframe')
    if (oldFrame) oldFrame.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'print-letterhead-iframe'
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

    // Grab all stylesheet and style tags from current document to keep typography & Tailwind intact
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(s => s.outerHTML)
      .join('\n')

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Sai Hospital - Bill ${bill.bill_number || ''}</title>
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
              size: A5 portrait;
              margin: 4mm 5mm;
            }
            #printable-letterhead {
              width: 100% !important;
              max-width: 138mm !important;
              margin: 0 auto !important;
              padding: 2mm 3mm !important;
              position: static !important;
              box-shadow: none !important;
              border: none !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div id="printable-letterhead">
            ${el.innerHTML}
          </div>
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow.focus()
    setTimeout(() => {
      iframe.contentWindow.print()
    }, 300)
  }

  // 1-Click Client-Side PDF Download
  const handleDownloadPdf = async () => {
    const el = document.getElementById('printable-letterhead')
    if (!el) return

    try {
      setDownloading(true)
      const html2pdfModule = await import('html2pdf.js')
      const html2pdf = html2pdfModule.default || html2pdfModule
      const opt = {
        margin: [4, 5, 4, 5],
        filename: `Sai_Hospital_Bill_${bill.bill_number || 'Hospital'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
      }
      await html2pdf().set(opt).from(el).save()
    } catch (err) {
      console.error('PDF download error:', err)
      // Reliable fallback: launch print dialog which defaults to "Save as PDF"
      handlePrint()
    } finally {
      setDownloading(false)
    }
  }

  const amountInWords = numberToWords(currentBill.net_amount)
  const todayStr = new Date().toLocaleDateString('en-GB') // DD/MM/YYYY

  const handleEditSaved = (updated) => {
    setCurrentBill(updated)
    if (onBillUpdated) onBillUpdated(updated)
    setIsEditing(false)
  }

  return (
    <div className="bill-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex justify-center items-start p-2 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Modal Card */}
      <div className="bill-modal-card bg-white rounded-2xl shadow-2xl max-w-[530px] w-full my-4 overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:m-0">
        
        {/* Top Control Action Bar (Hidden on Print) */}
        <div className="bill-control-bar bg-slate-900 text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              📄 A5 Paper Format
            </span>
            <span className="text-xs font-medium text-slate-300">
              Bill: <strong className="text-white">{currentBill.bill_number}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
              title="Edit bill items, rates, quantities, and discount"
            >
              <Edit3 size={13} /> Edit
            </button>
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
              title={`Send official bill and PDF directly to ${patient?.mobile_number || 'patient'} WhatsApp`}
            >
              {sendingWa ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
              {sendingWa ? '...' : 'WhatsApp'}
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
              title="Print A5 letterhead bill"
            >
              <Printer size={13} /> Print Bill
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
              title="Download official PDF copy"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloading ? '...' : 'PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PRINTABLE LETTERHEAD AREA (A5 OPTIMIZED) */}
        <div id="printable-letterhead" className="p-4 sm:p-5 relative bg-white text-slate-800 text-[11px] leading-snug">
          
          {/* Faint Center Watermark */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.035] pointer-events-none select-none">
            <img src={SAI_HOSPITAL_LOGO_B64} alt="" className="w-56 max-w-full h-auto object-contain" />
          </div>

          <div className="relative z-10">
            {/* Header matching official Sai Hospital scan */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-transparent gap-2">
              
              {/* Left Logo Graphic */}
              <div className="w-[24%] flex flex-col items-start justify-center">
                <img
                  src={SAI_HOSPITAL_LOGO_B64}
                  alt="Sai Emergency & Multispeciality Hospital"
                  className="w-20 sm:w-22 max-h-16 h-auto object-contain"
                />
              </div>

              {/* Center Hospital Info */}
              <div className="w-[76%] text-center">
                <h1 className="text-[14px] sm:text-[15.5px] font-black text-[#1d4ed8] tracking-tight uppercase leading-tight font-sans">
                  SAI EMERGENCY &amp; MULTISPECIALITY HOSPITAL
                </h1>
                <div className="text-[8.5px] font-bold text-[#0284c7] tracking-wider mt-0.5">
                  REG. NO. : BLG03043ALHL3 &bull; 24x7 EMERGENCY &bull; ICU &bull; NICU
                </div>
                <div className="text-[8.5px] font-medium text-slate-700 mt-0.5">
                  Old Motor Stand, NIPANI - 591 237. Dist. Belgavi
                </div>
                <div className="text-[8px] font-semibold text-[#1e3a8a] mt-0.5">
                  Mob. : 9180198107, 7204583699 &bull; Email : semhospitalnipani@gmail.com
                </div>
              </div>
            </div>

            {/* Cyan & Navy Accent Stripes */}
            <div className="h-0.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 rounded-full mt-1.5"></div>
            <div className="h-[1px] bg-sky-500 mt-0.5 mb-1.5"></div>

            {/* Ref. No. & Date */}
            <div className="flex justify-between items-center py-1 text-[10px] font-semibold text-slate-800 border-b border-dashed border-slate-300 mb-2">
              <div>
                Ref. No. : <span className="font-bold text-slate-900">{currentBill.bill_number}</span>
              </div>
              <div>
                Date : <span className="font-bold text-slate-900">{todayStr}</span>
              </div>
            </div>

            {/* Bill Title Banner */}
            <div className="bg-slate-50 border-l-4 border-blue-600 px-2.5 py-1 flex items-center justify-between rounded-r-lg mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-blue-900">
                {visit?.status === 'admitted' ? 'Interim Inpatient Bill / Running Statement' : 'Patient Final Bill / Discharge Summary Invoice'}
              </span>
              <div>
                {currentBill.payment_status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle size={10} /> PAID ({currentBill.payment_mode ? currentBill.payment_mode.toUpperCase() : 'CASH'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock size={10} /> PAYMENT PENDING
                  </span>
                )}
              </div>
            </div>

            {/* Patient & Doctor Details Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 text-[10px]">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Patient Name:</span>
                  <span className="font-bold text-slate-900 truncate">{patient.full_name}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Patient ID:</span>
                  <span className="font-semibold text-blue-700 font-mono">{patient.patient_id}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Age / Gender:</span>
                  <span className="font-semibold text-slate-800">{patient.age} Yrs / {patient.gender}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Contact No:</span>
                  <span className="font-semibold text-slate-800">{patient.phone || patient.mobile_number}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Treating Doctor:</span>
                  <span className="font-bold text-slate-900 truncate">{doctor?.full_name ? (doctor.full_name.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`) : 'Dr. Rahul Nirmale'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Department:</span>
                  <span className="font-semibold text-slate-800 truncate">{doctor?.department || 'Emergency & Multispeciality'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium text-[9.5px]">Diagnosis:</span>
                  <span className="font-semibold text-slate-800 truncate">{visit?.diagnosis || 'Clinical Consultation'}</span>
                </div>
                {(visit?.referred_by || patient.referred_by) && (
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium text-[9.5px]">Referred By:</span>
                    <span className="font-bold text-blue-700 truncate">{visit?.referred_by || patient.referred_by}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bill Itemization Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
              <table className="w-full text-[10px] text-left border-collapse">
                <thead className="bg-[#1e40af] text-white uppercase text-[9px] tracking-wider font-bold">
                  <tr>
                    <th className="py-1 px-1.5 text-center w-6">#</th>
                    <th className="py-1 px-1.5">Service / Particulars</th>
                    <th className="py-1 px-1.5 w-20">Category</th>
                    <th className="py-1 px-1.5 text-center w-10">Qty</th>
                    <th className="py-1 px-1.5 text-right w-16">Rate (₹)</th>
                    <th className="py-1 px-1.5 text-right w-16">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentBill.items && currentBill.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-1 px-1.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-1 px-1.5 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-1 px-1.5">
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.2 rounded text-[8.5px] font-semibold">
                          {item.category || 'Service'}
                        </span>
                      </td>
                      <td className="py-1 px-1.5 text-center text-slate-700 font-medium">{item.quantity || 1}</td>
                      <td className="py-1 px-1.5 text-right text-slate-700">{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-1 px-1.5 text-right font-bold text-slate-900">{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 pt-1.5 border-t border-slate-300 mb-2">
              
              <div className="w-full sm:w-7/12 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[9.5px]">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                  Amount in Words:
                </span>
                <span className="font-bold text-blue-900 text-[10px] mt-0.5 block leading-tight">
                  {amountInWords}
                </span>
                {currentBill.payment_mode && (
                  <div className="mt-1 text-[9px] text-slate-600">
                    Payment Mode: <strong className="uppercase text-slate-800">{currentBill.payment_mode}</strong>
                  </div>
                )}
                {currentBill.notes && (
                  <div className="mt-0.5 text-[8.5px] text-slate-500 italic">
                    Notes: {currentBill.notes}
                  </div>
                )}
              </div>

              <div className="w-full sm:w-4/12 space-y-1 text-[10px]">
                <div className="flex justify-between text-slate-600 px-1">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{Number(currentBill.subtotal).toFixed(2)}</span>
                </div>
                {currentBill.discount > 0 && (
                  <div className="flex justify-between text-rose-600 px-1">
                    <span>Discount:</span>
                    <span className="font-semibold">- ₹{Number(currentBill.discount).toFixed(2)}</span>
                  </div>
                )}
                {currentBill.tax > 0 && (
                  <div className="flex justify-between text-slate-600 px-1">
                    <span>Tax:</span>
                    <span className="font-semibold">+ ₹{Number(currentBill.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black text-blue-900 pt-1 border-t-2 border-blue-900 px-1">
                  <span>Net Amount:</span>
                  <span>₹{Number(currentBill.net_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Authorized Signatories */}
            <div className="grid grid-cols-2 gap-4 pt-3 mt-2">
              <div className="text-center">
                <div className="w-32 border-t border-slate-400 mx-auto mb-1"></div>
                <div className="text-[10px] font-bold text-slate-900">Billing Executive / Cashier</div>
                <div className="text-[8.5px] text-slate-500">Sai Emergency Hospital</div>
              </div>
              <div className="text-center">
                <div className="w-32 border-t border-slate-400 mx-auto mb-1"></div>
                <div className="text-[10px] font-bold text-slate-900">{doctor?.full_name ? (doctor.full_name.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`) : 'Dr. Rahul Nirmale'}</div>
                <div className="text-[8.5px] text-slate-500">Treating Doctor &bull; Reg. BLG03043ALHL3</div>
              </div>
            </div>

            {/* Bottom Letterhead Footnote */}
            <div className="mt-3 pt-1.5 border-t border-slate-200 text-center text-[8px] text-slate-500">
              Sai Emergency &amp; Multispeciality Hospital &bull; Old Motor Stand, NIPANI - 591 237. Dist. Belgavi &bull; 24x7 Emergency Services &bull; Ph: 9180198107, 7204583699
            </div>

          </div>
        </div>

      </div>

      {/* Embedded Edit Bill Modal */}
      {isEditing && (
        <EditBillModal
          bill={currentBill}
          patient={patient}
          doctor={doctor}
          visit={visit}
          onClose={() => setIsEditing(false)}
          onSaveSuccess={handleEditSaved}
        />
      )}

      {/* Global CSS for Print Mode */}
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          .bill-modal-overlay,
          .bill-modal-card,
          #printable-letterhead,
          #printable-letterhead * {
            visibility: visible !important;
          }
          .bill-modal-overlay {
            position: static !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          .bill-modal-card {
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .bill-control-bar {
            display: none !important;
          }
          #printable-letterhead {
            position: static !important;
            width: 100% !important;
            padding: 10mm !important;
            margin: 0 !important;
          }
        }
      `}</style>

    </div>
  )
}
