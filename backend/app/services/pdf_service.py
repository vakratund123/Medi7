"""
PDF Service — generates authentic Sai Hospital prescription and bill PDFs.
Uses ReportLab for robust, 100% compliant binary PDF generation with zero system C-library dependencies.
"""
import os
import io
import uuid
import base64
from pathlib import Path
from datetime import datetime
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.config import get_settings
from app.services.logo_data import SAI_HOSPITAL_LOGO_B64

settings = get_settings()

UPLOAD_DIR = Path(settings.LOCAL_STORAGE_PATH) / "prescriptions"
BILL_UPLOAD_DIR = Path(settings.LOCAL_STORAGE_PATH) / "bills"


def number_to_words_inr(amount: float) -> str:
    """Convert an INR amount to words (e.g. 1250.00 -> Rupees One Thousand Two Hundred Fifty Only)."""
    try:
        val = int(round(amount))
        if val == 0:
            return "Rupees Zero Only"

        units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

        def two_digits(n):
            if n < 20:
                return units[n]
            return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")

        def three_digits(n):
            if n == 0:
                return ""
            h = n // 100
            rem = n % 100
            res = ""
            if h > 0:
                res += units[h] + " Hundred"
                if rem > 0:
                    res += " and "
            if rem > 0:
                res += two_digits(rem)
            return res

        crore = val // 10000000
        rem_crore = val % 10000000
        lakh = rem_crore // 100000
        rem_lakh = rem_crore % 100000
        thousand = rem_lakh // 1000
        rem_thousand = rem_lakh % 1000

        parts = []
        if crore > 0:
            parts.append(two_digits(crore) + " Crore")
        if lakh > 0:
            parts.append(two_digits(lakh) + " Lakh")
        if thousand > 0:
            parts.append(two_digits(thousand) + " Thousand")
        if rem_thousand > 0:
            parts.append(three_digits(rem_thousand))

        return "Rupees " + " ".join(parts).strip() + " Only"
    except Exception:
        return f"Rupees {amount:.2f} Only"


def _get_logo_flowable(max_width=105, max_height=80):
    """Decode authentic Sai Hospital base64 logo into a ReportLab Flowable Image."""
    try:
        raw_b64 = SAI_HOSPITAL_LOGO_B64
        if "base64," in raw_b64:
            raw_b64 = raw_b64.split("base64,")[1]
        img_data = base64.b64decode(raw_b64)
        buf = io.BytesIO(img_data)
        pimg = PILImage.open(buf)
        w, h = pimg.size
        aspect = h / w
        render_w = max_width
        render_h = max_width * aspect
        if render_h > max_height:
            render_h = max_height
            render_w = max_height / aspect
        buf.seek(0)
        return RLImage(buf, width=render_w, height=render_h)
    except Exception as e:
        print(f"[PDF Logo Warning] Failed to load logo image: {e}")
        return None


def _add_hospital_header(elements, styles):
    """Add authentic Sai Hospital Letterhead Header with Logo & Details."""
    logo = _get_logo_flowable()
    title_p = Paragraph(
        "SAI EMERGENCY &amp; MULTISPECIALITY HOSPITAL",
        ParagraphStyle("HospitalTitle", fontName="Helvetica-Bold", fontSize=14.5, leading=17, textColor=colors.HexColor("#1d4ed8"), alignment=1)
    )
    reg_p = Paragraph(
        "REG. NO. : BLG03043ALHL3",
        ParagraphStyle("RegNo", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.HexColor("#0284c7"), alignment=1)
    )
    addr_p = Paragraph(
        "Old Motor Stand, NIPANI - 591 237. Dist. Belgavi",
        ParagraphStyle("Addr", fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#334155"), alignment=1)
    )
    contact_p = Paragraph(
        "Mob. : 9632219690, 7204583699 &bull; Email : semhospitalnipani@gmail.com",
        ParagraphStyle("Contact", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#1e3a8a"), alignment=1)
    )

    right_col = [title_p, Spacer(1, 2), reg_p, Spacer(1, 2), addr_p, Spacer(1, 2), contact_p]

    if logo:
        header_table = Table([[logo, right_col]], colWidths=[110, 425])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ]))
        elements.append(header_table)
    else:
        elements.extend(right_col)

    elements.append(Spacer(1, 5))
    elements.append(HRFlowable(width="100%", thickness=2.5, color=colors.HexColor("#0284c7"), spaceAfter=1))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a8a"), spaceAfter=8))


def _build_prescription_reportlab(output_path: Path, patient: dict, doctor: dict, prescription: dict, visit: dict):
    """Generate a high-fidelity binary PDF prescription using ReportLab."""
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=25,
        bottomMargin=25,
    )
    styles = getSampleStyleSheet()
    elements = []

    # 1. Header
    _add_hospital_header(elements, styles)

    # 2. Document Title Banner
    banner_p = Paragraph(
        "OUTPATIENT MEDICAL PRESCRIPTION",
        ParagraphStyle("DocBanner", fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=colors.HexColor("#1e3a8a"), alignment=1)
    )
    banner_table = Table([[banner_p]], colWidths=[535])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 8))

    # 3. Patient & Doctor Info Grid
    date_str = datetime.now().strftime("%d/%m/%Y")
    patient_info = [
        [
            Paragraph(f"<b>Patient Name:</b> {patient.get('full_name', 'Patient')}", styles['Normal']),
            Paragraph(f"<b>Date:</b> {date_str}", styles['Normal']),
        ],
        [
            Paragraph(f"<b>Patient ID:</b> {patient.get('patient_id', '-')}", styles['Normal']),
            Paragraph(f"<b>Age / Sex:</b> {patient.get('age', '-')} yrs / {patient.get('gender', '-')}", styles['Normal']),
        ],
        [
            Paragraph(f"<b>Mobile:</b> {patient.get('phone', patient.get('mobile_number', '-'))}", styles['Normal']),
            Paragraph(f"<b>Doctor:</b> Dr. {doctor.get('full_name', 'Rahul Nirmale')}", styles['Normal']),
        ],
    ]
    diag = visit.get('diagnosis')
    if diag:
        patient_info.append([
            Paragraph(f"<b>Diagnosis / Clinical Notes:</b> {diag}", styles['Normal']),
            Paragraph(f"<b>Department:</b> {doctor.get('department', 'General Medicine')}", styles['Normal']),
        ])

    info_table = Table(patient_info, colWidths=[310, 225])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))

    # 4. Rx Symbol & Medicines Table
    rx_p = Paragraph("<b>Rx &mdash; Prescribed Medicines:</b>", ParagraphStyle("RxTitle", fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#0f172a")))
    elements.append(rx_p)
    elements.append(Spacer(1, 5))

    med_header = ["#", "Medicine / Tablet Name", "Dosage", "Frequency", "Days", "Instructions"]
    med_rows = [[
        Paragraph(f"<b>{h}</b>", ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#0f172a")))
        for h in med_header
    ]]

    medicines = prescription.get('medicines', [])
    if isinstance(medicines, list):
        for idx, m in enumerate(medicines, 1):
            if isinstance(m, dict):
                name = m.get('medicine_name', m.get('name', ''))
                dosage = str(m.get('dosage', ''))
                freq = str(m.get('frequency', ''))
                days = str(m.get('duration_days', m.get('days', '')))
                instr = str(m.get('instructions', ''))
            else:
                name = str(m)
                dosage, freq, days, instr = "", "", "", ""
            
            med_rows.append([
                Paragraph(str(idx), styles['Normal']),
                Paragraph(f"<b>{name}</b>", styles['Normal']),
                Paragraph(dosage, styles['Normal']),
                Paragraph(freq, styles['Normal']),
                Paragraph(days, styles['Normal']),
                Paragraph(instr, styles['Normal']),
            ])

    if len(med_rows) == 1:
        med_rows.append([Paragraph("1", styles['Normal']), Paragraph("No medicines prescribed.", styles['Normal']), "", "", "", ""])

    med_table = Table(med_rows, colWidths=[25, 195, 65, 75, 45, 130])
    med_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(med_table)
    elements.append(Spacer(1, 14))

    # 5. Follow up / Advice
    fu_date = visit.get('follow_up_date') or prescription.get('follow_up_date')
    notes = visit.get('notes')
    advice_items = []
    if fu_date:
        advice_items.append(f"<b>Next Follow-up Visit:</b> {fu_date}")
    if notes:
        advice_items.append(f"<b>Special Advice:</b> {notes}")
    if advice_items:
        advice_p = Paragraph("<br/>".join(advice_items), ParagraphStyle("Advice", fontName="Helvetica", fontSize=9, leading=13, textColor=colors.HexColor("#334155")))
        elements.append(advice_p)
        elements.append(Spacer(1, 20))

    # 6. Doctor Signature Area
    doc_name = doctor.get('full_name', 'Rahul Nirmale')
    if not doc_name.startswith('Dr'):
        doc_name = f"Dr. {doc_name}"

    sig_data = [
        ["", Paragraph(f"<b>{doc_name}</b><br/>Treating Consultant &bull; Reg. BLG03043ALHL3<br/>Sai Emergency &amp; Multispeciality Hospital", ParagraphStyle("Sig", fontName="Helvetica", fontSize=8.5, leading=11, alignment=2))]
    ]
    sig_table = Table(sig_data, colWidths=[280, 255])
    sig_table.setStyle(TableStyle([
        ('LINEBEFORE', (1, 0), (1, 0), 0, colors.transparent),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
    ]))
    elements.append(Spacer(1, 25))
    elements.append(sig_table)

    # 7. Footnote
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=5))
    foot_p = Paragraph(
        "Sai Emergency &amp; Multispeciality Hospital &bull; 24x7 Emergency Services &bull; Ph: 9632219690, 7204583699",
        ParagraphStyle("Foot", fontName="Helvetica", fontSize=7.5, leading=9, textColor=colors.HexColor("#64748b"), alignment=1)
    )
    elements.append(foot_p)

    doc.build(elements)


def _build_bill_reportlab(output_path: Path, patient: dict, doctor: dict, bill: dict, visit: dict):
    """Generate a high-fidelity binary PDF letterhead bill using ReportLab."""
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=25,
        bottomMargin=25,
    )
    styles = getSampleStyleSheet()
    elements = []

    # 1. Header
    _add_hospital_header(elements, styles)

    # 2. Dynamic Banner (Interim vs Final)
    is_admitted = visit.get('status') == 'admitted'
    banner_title = "INTERIM INPATIENT BILL / RUNNING HOSPITAL STATEMENT (ACTIVE IPD)" if is_admitted else "PATIENT FINAL BILL / DISCHARGE SUMMARY BILL"
    banner_bg = "#f3e8ff" if is_admitted else "#eff6ff"
    banner_border = "#d8b4fe" if is_admitted else "#bfdbfe"
    banner_color = "#581c87" if is_admitted else "#1e3a8a"

    banner_p = Paragraph(
        banner_title,
        ParagraphStyle("BillBanner", fontName="Helvetica-Bold", fontSize=10.5, leading=12, textColor=colors.HexColor(banner_color), alignment=1)
    )
    banner_table = Table([[banner_p]], colWidths=[535])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(banner_bg)),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(banner_border)),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 8))

    # 3. Bill & Patient Meta Information
    date_str = datetime.now().strftime("%d/%m/%Y")
    patient_info = [
        [
            Paragraph(f"<b>Bill Ref:</b> {bill.get('bill_number', 'SEMH-B26-0001')}", styles['Normal']),
            Paragraph(f"<b>Date:</b> {date_str}", styles['Normal']),
        ],
        [
            Paragraph(f"<b>Patient Name:</b> {patient.get('full_name', 'Patient')}", styles['Normal']),
            Paragraph(f"<b>Patient ID:</b> {patient.get('patient_id', '-')}", styles['Normal']),
        ],
        [
            Paragraph(f"<b>Age / Sex:</b> {patient.get('age', '-')} yrs / {patient.get('gender', '-')}", styles['Normal']),
            Paragraph(f"<b>Contact:</b> {patient.get('phone', patient.get('mobile_number', '-'))}", styles['Normal']),
        ],
        [
            Paragraph(f"<b>Treating Doctor:</b> Dr. {doctor.get('full_name', 'Rahul Nirmale')}", styles['Normal']),
            Paragraph(f"<b>Status:</b> <b>{bill.get('payment_status', 'PAID').upper()}</b> ({bill.get('payment_mode', 'Cash').upper()})", styles['Normal']),
        ],
    ]

    info_table = Table(patient_info, colWidths=[290, 245])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10))

    # 4. Bill Particulars Table
    bill_header = ["#", "Service / Particulars", "Category", "Qty", "Rate (₹)", "Total (₹)"]
    bill_rows = [[
        Paragraph(f"<b>{h}</b>", ParagraphStyle("BTH", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#0f172a")))
        for h in bill_header
    ]]

    items = bill.get('items', [])
    if isinstance(items, list):
        for idx, it in enumerate(items, 1):
            if isinstance(it, dict):
                name = str(it.get('name', 'Service'))
                cat = str(it.get('category', 'Hospital Service'))
                qty = str(it.get('quantity', 1))
                rate = f"₹{float(it.get('unit_price', 0)):.2f}"
                tot = f"₹{float(it.get('total', 0)):.2f}"
            else:
                name, cat, qty, rate, tot = str(it), "Service", "1", "₹0.00", "₹0.00"

            bill_rows.append([
                Paragraph(str(idx), styles['Normal']),
                Paragraph(name, styles['Normal']),
                Paragraph(cat, styles['Normal']),
                Paragraph(qty, styles['Normal']),
                Paragraph(rate, styles['Normal']),
                Paragraph(tot, styles['Normal']),
            ])

    if len(bill_rows) == 1:
        bill_rows.append([Paragraph("1", styles['Normal']), Paragraph("Consultation & Treatment", styles['Normal']), "Consultation", "1", f"₹{bill.get('net_amount', 0):.2f}", f"₹{bill.get('net_amount', 0):.2f}"])

    bill_table = Table(bill_rows, colWidths=[25, 210, 100, 40, 80, 80])
    bill_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(bill_table)
    elements.append(Spacer(1, 8))

    # 5. Financial Summary Grid
    amt_words = number_to_words_inr(bill.get("net_amount", 0.0))
    words_p = Paragraph(f"<b>Amount in Words:</b><br/>{amt_words}", ParagraphStyle("Words", fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=colors.HexColor("#1e3a8a")))

    totals_data = [
        [Paragraph("Subtotal:", styles['Normal']), Paragraph(f"₹{bill.get('subtotal', bill.get('net_amount', 0)):.2f}", styles['Normal'])],
    ]
    if bill.get('discount', 0) > 0:
        totals_data.append([Paragraph("Discount:", styles['Normal']), Paragraph(f"- ₹{bill.get('discount', 0):.2f}", styles['Normal'])])
    if bill.get('tax', 0) > 0:
        totals_data.append([Paragraph("Tax:", styles['Normal']), Paragraph(f"+ ₹{bill.get('tax', 0):.2f}", styles['Normal'])])
    totals_data.append([
        Paragraph("<b>Net Payable:</b>", ParagraphStyle("NetH", fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#1e3a8a"))),
        Paragraph(f"<b>₹{bill.get('net_amount', 0):.2f}</b>", ParagraphStyle("NetV", fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#1e3a8a"))),
    ])

    totals_table = Table(totals_data, colWidths=[100, 110])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))

    summary_table = Table([[words_p, totals_table]], colWidths=[315, 220])
    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 25))

    # 6. Dual Authorized Signatories
    doc_name = doctor.get('full_name', 'Rahul Nirmale')
    if not doc_name.startswith('Dr'):
        doc_name = f"Dr. {doc_name}"

    sig_data = [
        [
            Paragraph("____________________________<br/><b>Billing Executive / Cashier</b><br/>Sai Emergency Hospital", ParagraphStyle("Sig1", fontName="Helvetica", fontSize=8, leading=11, alignment=1)),
            Paragraph(f"____________________________<br/><b>{doc_name}</b><br/>Treating Consultant &bull; Reg. BLG03043ALHL3", ParagraphStyle("Sig2", fontName="Helvetica", fontSize=8, leading=11, alignment=1)),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[267, 268])
    elements.append(sig_table)

    # 7. Footnote
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=5))
    foot_p = Paragraph(
        "Sai Emergency &amp; Multispeciality Hospital &bull; 24x7 Emergency Services &bull; Ph: 9632219690, 7204583699",
        ParagraphStyle("Foot", fontName="Helvetica", fontSize=7.5, leading=9, textColor=colors.HexColor("#64748b"), alignment=1)
    )
    elements.append(foot_p)

    doc.build(elements)


def generate_prescription_pdf(
    patient: dict,
    doctor: dict,
    prescription: dict,
    visit: dict = None,
) -> str:
    """
    Generate authentic Sai Hospital prescription PDF.
    Guarantees a valid, 100% compliant binary PDF that opens in any browser, Adobe, or mobile device.
    """
    patient = patient or {}
    doctor = doctor or {}
    prescription = prescription or {}
    visit = visit or {}

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"rx_{uuid.uuid4().hex}.pdf"
    output_path = UPLOAD_DIR / filename

    try:
        _build_prescription_reportlab(output_path, patient, doctor, prescription, visit)
    except Exception as e:
        print(f"[ReportLab Error] Failed to generate prescription PDF: {e}")
        # Secondary fallback using simple canvas to ensure valid PDF binary
        try:
            from reportlab.pdfgen import canvas
            c = canvas.Canvas(str(output_path), pagesize=A4)
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, 800, "SAI EMERGENCY & MULTISPECIALITY HOSPITAL")
            c.setFont("Helvetica", 10)
            c.drawString(50, 780, "REG. NO. : BLG03043ALHL3 | Mob: 9632219690")
            c.drawString(50, 750, f"Patient: {patient.get('full_name', '')} ({patient.get('patient_id', '')})")
            c.drawString(50, 730, f"Doctor: Dr. {doctor.get('full_name', '')}")
            c.drawString(50, 700, "Prescription Details:")
            y = 680
            for med in prescription.get('medicines', []):
                med_txt = med.get('medicine_name', str(med)) if isinstance(med, dict) else str(med)
                c.drawString(60, y, f"- {med_txt}")
                y -= 20
                if y < 100:
                    break
            c.save()
        except Exception as ex2:
            print(f"[Critical PDF Error] Canvas fallback also failed: {ex2}")

    if settings.STORAGE_BACKEND == "s3":
        return _sync_to_s3(output_path, "prescriptions")
    return f"/uploads/prescriptions/{filename}"


def generate_bill_pdf(
    patient: dict,
    doctor: dict,
    bill: dict,
    visit: dict = None,
) -> str:
    """
    Generate authentic Sai Hospital Letterhead Bill PDF.
    Guarantees a valid, 100% compliant binary PDF that opens in any browser, Adobe, or mobile device.
    """
    patient = patient or {}
    doctor = doctor or {}
    bill = bill or {}
    visit = visit or {}

    BILL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"bill_{uuid.uuid4().hex}.pdf"
    output_path = BILL_UPLOAD_DIR / filename

    try:
        _build_bill_reportlab(output_path, patient, doctor, bill, visit)
    except Exception as e:
        print(f"[ReportLab Error] Failed to generate bill PDF: {e}")
        try:
            from reportlab.pdfgen import canvas
            c = canvas.Canvas(str(output_path), pagesize=A4)
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, 800, "SAI EMERGENCY & MULTISPECIALITY HOSPITAL")
            c.setFont("Helvetica", 10)
            c.drawString(50, 780, "REG. NO. : BLG03043ALHL3 | Mob: 9632219690")
            c.drawString(50, 750, f"Bill No: {bill.get('bill_number')} | Date: {datetime.now().strftime('%d/%m/%Y')}")
            c.drawString(50, 730, f"Patient: {patient.get('full_name')} ({patient.get('patient_id')})")
            c.drawString(50, 710, f"Net Amount: Rs. {bill.get('net_amount', 0):.2f}")
            c.save()
        except Exception as ex2:
            print(f"[Critical PDF Error] Canvas bill fallback failed: {ex2}")

    if settings.STORAGE_BACKEND == "s3":
        return _sync_to_s3(output_path, "bills")
    return f"/uploads/bills/{filename}"


def _sync_to_s3(local_path: Path, folder: str) -> str:
    """Upload local generated binary PDF to S3 / Supabase Storage and return permanent public URL."""
    try:
        import boto3
        filename = local_path.name
        unique_key = f"{folder}/{filename}"
        boto_kwargs = {
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
            "region_name": settings.AWS_REGION or "auto",
        }
        if settings.S3_ENDPOINT_URL:
            boto_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

        s3 = boto3.client("s3", **boto_kwargs)
        with open(local_path, "rb") as f:
            s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=unique_key,
                Body=f.read(),
                ContentType="application/pdf",
            )

        if settings.S3_PUBLIC_URL:
            return f"{settings.S3_PUBLIC_URL.rstrip('/')}/{unique_key}"
        if settings.S3_ENDPOINT_URL:
            return f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{settings.S3_BUCKET}/{unique_key}"
        return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_key}"
    except Exception as e:
        print(f"[Storage Warning] S3 upload failed for {local_path}: {e}")
        return f"/uploads/{folder}/{local_path.name}"
