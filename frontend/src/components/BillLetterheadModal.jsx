import React from 'react'
import { Printer, Download, X, CheckCircle, Clock } from 'lucide-react'

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

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = () => {
    if (bill.pdf_url) {
      window.open(bill.pdf_url, '_blank')
    } else {
      window.print()
    }
  }

  const amountInWords = numberToWords(bill.net_amount)
  const todayStr = new Date().toLocaleDateString('en-GB') // DD/MM/YYYY

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex justify-center items-start p-2 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:m-0">
        
        {/* Top Control Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer size={15} /> Print Bill
            </button>
            <button
              onClick={handleDownloadPdf}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download size={15} /> Download PDF
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
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.035] pointer-events-none select-none">
            <div className="text-9xl font-black text-blue-900">✚</div>
            <div className="text-4xl font-extrabold text-blue-900 tracking-widest mt-2 uppercase">Sai Emergency Hospital</div>
          </div>

          <div className="relative z-10">
            {/* Header matching provided scan */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-transparent">
              
              {/* Left Logo Stylized Graphic */}
              <div className="w-[28%] flex flex-col items-start">
                <svg className="w-36 h-auto" viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M45 28C45 20 38 15 28 15C16 15 8 22 8 32C8 46 45 44 45 60C45 70 36 76 24 76C12 76 5 69 4 58" stroke="#1d4ed8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M50 16H62V28H74V40H62V52H50V40H38V28H50V16Z" fill="#0284c7"/>
                  <path d="M68 62C72 50 82 48 90 54C94 57 96 64 96 74" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round"/>
                  <path d="M96 52V74" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round"/>
                  <text x="5" y="83" fontFamily="system-ui, sans-serif" fontSize="6.5" fontWeight="700" fill="#1e3a8a" letterSpacing="0.2">Emergency &amp; Multispeciality</text>
                  <text x="5" y="90" fontFamily="system-ui, sans-serif" fontSize="5.5" fontWeight="600" fill="#0284c7" letterSpacing="1.8">H O S P I T A L</text>
                </svg>
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
                Patient Final Bill / Invoice
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
          body * {
            visibility: hidden;
          }
          #printable-letterhead, #printable-letterhead * {
            visibility: visible;
          }
          #printable-letterhead {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

    </div>
  )
}
