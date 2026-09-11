import React, { useState } from 'react'
import { Printer, Download, X, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { SAI_HOSPITAL_LOGO_B64 } from '../assets/hospitalLogo'

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

export default function BillLetterheadModal({ bill, patient, doctor, visit, onClose }) {
  if (!bill || !patient) return null

  const [downloading, setDownloading] = useState(false)

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
              size: A4 portrait;
              margin: 6mm;
            }
            #printable-letterhead {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 10px 20px !important;
              position: static !important;
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
        margin: [6, 6, 6, 6],
        filename: `Sai_Hospital_Bill_${bill.bill_number || 'Hospital'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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

  const amountInWords = numberToWords(bill.net_amount)
  const todayStr = new Date().toLocaleDateString('en-GB') // DD/MM/YYYY

  return (
    <div className="bill-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex justify-center items-start p-2 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Modal Card */}
      <div className="bill-modal-card bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:m-0">
        
        {/* Top Control Action Bar (Hidden on Print) */}
        <div className="bill-control-bar bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-primary-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Official Letterhead
            </span>
            <span className="text-sm font-medium text-slate-300">
              Bill Ref: <strong className="text-white">{bill.bill_number}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              title="Print letterhead bill"
            >
              <Printer size={15} /> Print Bill
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download official PDF copy"
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE LETTERHEAD AREA */}
        <div id="printable-letterhead" className="p-6 sm:p-10 relative bg-white text-slate-800">
          
          {/* Faint Center Watermark */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.045] pointer-events-none select-none">
            <img src={SAI_HOSPITAL_LOGO_B64} alt="" className="w-80 max-w-full h-auto object-contain" />
          </div>

          <div className="relative z-10">
            {/* Header matching provided scan */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-transparent">
              
              {/* Left Logo Stylized Graphic matching official scan */}
              <div className="w-[28%] flex flex-col items-start justify-center">
                <img
                  src={SAI_HOSPITAL_LOGO_B64}
                  alt="Sai Emergency & Multispeciality Hospital"
                  className="w-32 sm:w-36 max-h-24 h-auto object-contain"
                />
              </div>

              {/* Center Hospital Info */}
              <div className="w-[72%] text-center">
                <h1 className="text-xl sm:text-2xl font-black text-[#1d4ed8] tracking-tight uppercase leading-tight font-sans">
                  SAI EMERGENCY &amp; MULTISPECIALITY HOSPITAL
                </h1>
                <div className="text-xs font-bold text-[#0284c7] tracking-wider mt-0.5">
                  REG. NO. : BLG03043ALHL3
                </div>
                <div className="text-xs font-medium text-slate-700 mt-1">
                  Old Motor Stand, NIPANI - 591 237. Dist. Belgavi
                </div>
                <div className="text-[11px] font-semibold text-[#1e3a8a] mt-0.5">
                  Mob. : 9632219690, 7204583699 &bull; Email : semhospitalnipani@gmail.com
                </div>
              </div>
            </div>

            {/* Cyan & Navy Accent Stripes */}
            <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 rounded-full mt-2"></div>
            <div className="h-[1.5px] bg-sky-500 mt-0.5 mb-2"></div>

            {/* Ref. No. & Date */}
            <div className="flex justify-between items-center py-2 text-xs font-semibold text-slate-800 border-b border-dashed border-slate-300 mb-4">
              <div>
                Ref. No. : <span className="font-bold text-slate-900">{bill.bill_number}</span>
              </div>
              <div>
                Date : <span className="font-bold text-slate-900">{todayStr}</span>
              </div>
            </div>

            {/* Bill Title Banner */}
            <div className="bg-slate-50 border-l-4 border-blue-600 px-4 py-2 flex items-center justify-between rounded-r-lg mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wide text-blue-900">
                {visit?.status === 'admitted' ? 'Interim Inpatient Bill / Running Statement (Active Admission)' : 'Patient Final Bill / Discharge Summary Invoice'}
              </span>
              <div>
                {bill.payment_status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle size={11} /> PAID ({bill.payment_mode ? bill.payment_mode.toUpperCase() : 'CASH'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock size={11} /> PAYMENT PENDING
                  </span>
                )}
              </div>
            </div>

            {/* Patient & Doctor Details Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 text-xs">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Patient Name:</span>
                  <span className="font-bold text-slate-900">{patient.full_name}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Patient ID / UHID:</span>
                  <span className="font-semibold text-slate-800">{patient.patient_id}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Age / Gender:</span>
                  <span className="font-semibold text-slate-800">{patient.age} Yrs / {patient.gender}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Contact No:</span>
                  <span className="font-semibold text-slate-800">{patient.phone || patient.mobile_number}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Treating Doctor:</span>
                  <span className="font-bold text-slate-900">{doctor?.full_name ? (doctor.full_name.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`) : 'Dr. Rahul Nirmale'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Department:</span>
                  <span className="font-semibold text-slate-800">{doctor?.department || 'Emergency & Multispeciality'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-medium">Diagnosis:</span>
                  <span className="font-semibold text-slate-800">{visit?.diagnosis || 'Clinical Consultation'}</span>
                </div>
                {(visit?.referred_by || patient.referred_by) && (
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Referred By:</span>
                    <span className="font-bold text-blue-700">{visit?.referred_by || patient.referred_by}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bill Itemization Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#1e40af] text-white uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="py-2 px-3 text-center w-10">#</th>
                    <th className="py-2 px-3">Service / Particulars</th>
                    <th className="py-2 px-3 w-28">Category</th>
                    <th className="py-2 px-3 text-center w-14">Qty</th>
                    <th className="py-2 px-3 text-right w-24">Rate (₹)</th>
                    <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bill.items && bill.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-2 px-3">
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {item.category || 'Service'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700 font-medium">{item.quantity || 1}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2 border-t border-slate-300 mb-6">
              
              <div className="w-full sm:w-7/12 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Amount in Words:
                </span>
                <span className="font-bold text-blue-900 text-xs mt-0.5 block">
                  {amountInWords}
                </span>
                {bill.payment_mode && (
                  <div className="mt-2 text-[11px] text-slate-600">
                    Payment Mode: <strong className="uppercase text-slate-800">{bill.payment_mode}</strong>
                  </div>
                )}
                {bill.notes && (
                  <div className="mt-1 text-[11px] text-slate-500 italic">
                    Notes: {bill.notes}
                  </div>
                )}
              </div>

              <div className="w-full sm:w-4/12 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 px-1">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{Number(bill.subtotal).toFixed(2)}</span>
                </div>
                {bill.discount > 0 && (
                  <div className="flex justify-between text-rose-600 px-1">
                    <span>Discount:</span>
                    <span className="font-semibold">- ₹{Number(bill.discount).toFixed(2)}</span>
                  </div>
                )}
                {bill.tax > 0 && (
                  <div className="flex justify-between text-slate-600 px-1">
                    <span>Tax:</span>
                    <span className="font-semibold">+ ₹{Number(bill.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-blue-900 pt-2 border-t-2 border-blue-900 px-1">
                  <span>Net Amount:</span>
                  <span>₹{Number(bill.net_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Authorized Signatories */}
            <div className="grid grid-cols-2 gap-8 pt-8 mt-6">
              <div className="text-center">
                <div className="w-44 border-t border-slate-400 mx-auto mb-1"></div>
                <div className="text-xs font-bold text-slate-900">Billing Executive / Cashier</div>
                <div className="text-[10px] text-slate-500">Sai Emergency Hospital</div>
              </div>
              <div className="text-center">
                <div className="w-44 border-t border-slate-400 mx-auto mb-1"></div>
                <div className="text-xs font-bold text-slate-900">{doctor?.full_name ? (doctor.full_name.startsWith('Dr') ? doctor.full_name : `Dr. ${doctor.full_name}`) : 'Dr. Rahul Nirmale'}</div>
                <div className="text-[10px] text-slate-500">Treating Doctor &bull; Reg. BLG03043ALHL3</div>
              </div>
            </div>

            {/* Bottom Letterhead Footnote */}
            <div className="mt-10 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
              Sai Emergency &amp; Multispeciality Hospital &bull; Old Motor Stand, NIPANI - 591 237. Dist. Belgavi &bull; 24x7 Emergency Services &bull; Ph: 9632219690, 7204583699
            </div>

          </div>
        </div>

      </div>

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
