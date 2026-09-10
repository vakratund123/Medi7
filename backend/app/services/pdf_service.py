"""
PDF Service — generates hospital prescription PDFs using Jinja2 + WeasyPrint.
"""
import os
import uuid
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.config import get_settings

settings = get_settings()

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
UPLOAD_DIR = Path(settings.LOCAL_STORAGE_PATH) / "prescriptions"

from app.services.logo_data import SAI_HOSPITAL_LOGO_B64

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def generate_prescription_pdf(
    patient: dict,
    doctor: dict,
    prescription: dict,
    visit: dict,
) -> str:
    """
    Render prescription HTML → PDF.
    Returns the file path of the saved PDF.
    """
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"rx_{uuid.uuid4().hex}.pdf"
    output_path = UPLOAD_DIR / filename

    try:
        from weasyprint import HTML
        template = jinja_env.get_template("prescription.html")
        html_content = template.render(
            hospital_name=settings.HOSPITAL_NAME,
            patient=patient,
            doctor=doctor,
            prescription=prescription,
            visit=visit,
            hospital_logo_b64=SAI_HOSPITAL_LOGO_B64,
            generated_at=datetime.now().strftime("%d %B %Y, %I:%M %p"),
        )
        HTML(string=html_content).write_pdf(str(output_path))
    except (ImportError, OSError, Exception) as e:
        # Catch WeasyPrint library import or missing native dependency (gobject) OSError
        # Write a text fallback file so that the file response and path are valid
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"PRESCRIPTION RECORD (Fallback PDF)\n")
            f.write(f"==================================\n")
            f.write(f"Prescription ID: {prescription.get('prescription_id')}\n")
            f.write(f"Hospital: {settings.HOSPITAL_NAME}\n")
            f.write(f"Patient: {patient.get('full_name')} ({patient.get('patient_id')})\n")
            f.write(f"Doctor: {doctor.get('full_name')} ({doctor.get('department')})\n")
            f.write(f"Visit Diagnosis: {visit.get('diagnosis')}\n")
            f.write(f"Medicines: {prescription.get('medicines')}\n")

    if settings.STORAGE_BACKEND == "s3":
        return _sync_to_s3(output_path, "prescriptions")
    return f"/uploads/prescriptions/{filename}"


def _sync_to_s3(local_path: Path, folder: str) -> str:
    """Upload local generated PDF to S3 / Cloudflare R2 and return URL."""
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


def generate_bill_pdf(
    patient: dict,
    doctor: dict,
    bill: dict,
    visit: dict,
) -> str:
    """
    Render Bill HTML → PDF on official Sai Hospital Letterhead.
    Returns the file path of the saved PDF.
    """
    BILL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"bill_{uuid.uuid4().hex}.pdf"
    output_path = BILL_UPLOAD_DIR / filename

    amt_in_words = number_to_words_inr(bill.get("net_amount", 0.0))
    generated_date = datetime.now().strftime("%d/%m/%Y")

    try:
        from weasyprint import HTML
        template = jinja_env.get_template("bill.html")
        html_content = template.render(
            hospital_name=settings.HOSPITAL_NAME,
            patient=patient,
            doctor=doctor,
            bill=bill,
            visit=visit,
            hospital_logo_b64=SAI_HOSPITAL_LOGO_B64,
            amount_in_words=amt_in_words,
            generated_date=generated_date,
            generated_at=datetime.now().strftime("%d %B %Y, %I:%M %p"),
        )
        HTML(string=html_content).write_pdf(str(output_path))
    except (ImportError, OSError, Exception) as e:
        # Fallback text file
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("SAI EMERGENCY & MULTISPECIALITY HOSPITAL\n")
            f.write("Old Motor Stand, NIPANI - 591 237. Dist. Belgavi\n")
            f.write("REG. NO. : BLG03043ALHL3 | Mob: 9632219690, 7204583699\n")
            f.write("========================================================\n")
            f.write(f"BILL / INVOICE: {bill.get('bill_number')}\n")
            f.write(f"Date: {generated_date}\n")
            f.write(f"Patient: {patient.get('full_name')} ({patient.get('patient_id')})\n")
            f.write(f"Doctor: Dr. {doctor.get('full_name')}\n")
            f.write(f"Net Amount: Rs. {bill.get('net_amount', 0.0):.2f}\n")
            f.write(f"In Words: {amt_in_words}\n")
            f.write(f"Status: {bill.get('payment_status')}\n")

    if settings.STORAGE_BACKEND == "s3":
        return _sync_to_s3(output_path, "bills")
    return f"/uploads/bills/{filename}"
