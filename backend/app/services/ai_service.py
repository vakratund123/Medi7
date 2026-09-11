"""
AI Service — wraps Google Gemini 2.0 Flash.
Falls back to stub responses when GEMINI_API_KEY is not set.
"""
import json
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _get_gemini_client():
    if not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai.GenerativeModel("gemini-2.0-flash-exp")
    except Exception as e:
        logger.warning(f"Gemini init failed: {e}")
        return None


async def extract_consultation_data(transcript: str) -> dict:
    """
    Given a doctor-patient transcript, extract structured consultation data.
    Returns: {chief_complaint, diagnosis, notes, medicines[], tests[], follow_up_date}
    """
    model = _get_gemini_client()
    if not model:
        # Stub response for dev/testing
        return {
            "chief_complaint": "Extracted from: " + transcript[:80],
            "diagnosis": "AI extraction pending (no API key)",
            "notes": transcript,
            "medicines": [],
            "tests": [],
            "follow_up_date": None,
        }

    prompt = f"""
You are a medical AI assistant. Extract structured data from this doctor-patient consultation transcript.
Return ONLY valid JSON with these fields:
{{
  "chief_complaint": "string",
  "diagnosis": "string",
  "notes": "string (examination findings)",
  "medicines": [
    {{"medicine_name": "", "dosage": "", "frequency": "1-0-1", "duration_days": 5, "instructions": ""}}
  ],
  "tests": ["CBC", "LFT"],
  "follow_up_date": "YYYY-MM-DD or null"
}}

Transcript:
{transcript}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code blocks if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error(f"Gemini extraction error: {e}")
        return {"chief_complaint": "", "diagnosis": "", "notes": transcript, "medicines": [], "tests": [], "follow_up_date": None}


async def summarize_lab_report(report_text: str, patient_name: str) -> dict:
    """
    Given raw lab report text, return AI summary and abnormal flags.
    Returns: {summary: str, abnormal_flags: {test_name: value}}
    """
    model = _get_gemini_client()
    if not model:
        return {
            "summary": "AI summary pending (no API key configured).",
            "abnormal_flags": {},
        }

    prompt = f"""
You are a clinical lab AI. Analyze this lab report for patient {patient_name}.
Return ONLY valid JSON:
{{
  "summary": "2-3 sentence plain language summary",
  "abnormal_flags": {{"test_name": "value (HIGH/LOW)"}}
}}

Report:
{report_text}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error(f"Gemini report error: {e}")
        return {"summary": "Could not analyze report.", "abnormal_flags": {}}


async def generate_patient_summary(history: dict) -> str:
    """Generate 3-line AI summary of patient history for doctor view."""
    model = _get_gemini_client()
    if not model:
        return f"Patient {history.get('full_name', '')} — AI summary pending."

    prompt = f"""
In 2-3 sentences, summarize this patient's medical history for a busy doctor.
Be concise and highlight: chronic conditions, last diagnosis, current medications, recent abnormal results.

Patient data:
{json.dumps(history, indent=2, default=str)}
"""
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini summary error: {e}")
        return "Could not generate summary."


async def generate_whatsapp_message(message_type: str, language: str, context: dict) -> str:
    """Generate WhatsApp message in patient's preferred language (Marathi, Kannada, Hindi, English)."""
    templates = {
        "welcome": {
            "marathi": "नमस्कार {name} जी 🙏\nSai Emergency & Multispeciality Hospital मध्ये आपले स्वागत आहे.\nआपला Patient ID: {patient_id}\nअधिक माहितीसाठी संपर्क: +919632219690\nसर्व रेकॉर्ड डिजिटल सेव्ह केले जातील.",
            "kannada": "ನಮಸ್ಕಾರ {name} ಜಿ 🙏\nSai Emergency & Multispeciality Hospital ಗೆ ಸ್ವಾಗತ.\nನಿಮ್ಮ Patient ID: {patient_id}\nಸಂಪರ್ಕ: +919632219690\nಎಲ್ಲಾ ದಾಖಲೆಗಳು ಡಿಜಿಟಲ್ ಆಗಿ ಸುರಕ್ಷಿತವಾಗಿವೆ.",
            "hindi": "नमस्कार {name} जी 🙏\nSai Emergency & Multispeciality Hospital में आपका स्वागत है।\nआपकी Patient ID: {patient_id}\nहेल्पलाइन: +919632219690\nसभी रिकॉर्ड सुरक्षित डिजिटल रूप से सेव रहेंगे।",
            "english": "Welcome {name} 🙏\nThank you for visiting Sai Emergency & Multispeciality Hospital.\nYour Patient ID: {patient_id}\nHelpline: +919632219690\nAll your medical records are digitally saved.",
        },
        "prescription": {
            "marathi": "नमस्कार {name} जी 🙏\nआपली प्रिस्क्रिप्शन तयार आहे. 📋\nपुढील भेट: {follow_up}\nSai Hospital WhatsApp: +919632219690",
            "kannada": "ನಮಸ್ಕಾರ {name} ಜಿ 🙏\nನಿಮ್ಮ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸಿದ್ಧವಾಗಿದೆ. 📋\nಮುಂದಿನ ಭೇಟಿ: {follow_up}\nSai Hospital: +919632219690",
            "hindi": "नमस्कार {name} जी 🙏\nआपका पर्चा (Prescription) तैयार है। 📋\nअगली विजिट: {follow_up}\nSai Hospital: +919632219690",
            "english": "Hello {name} 🙏\nYour prescription is ready. 📋\nNext visit: {follow_up}\nSai Hospital: +919632219690",
        },
        "report": {
            "marathi": "नमस्कार {name} जी 🙏\nआपला {test_name} तपासणी अहवाल तयार आहे. 🧪\nSai Hospital: +919632219690",
            "kannada": "ನಮಸ್ಕಾರ {name} ಜಿ 🙏\nನಿಮ್ಮ {test_name} ಲ್ಯಾಬ್ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ. 🧪\nSai Hospital: +919632219690",
            "hindi": "नमस्कार {name} जी 🙏\nआपकी {test_name} रिपोर्ट तैयार है। 🧪\nSai Hospital: +919632219690",
            "english": "Hello {name} 🙏\nYour {test_name} lab report is ready. 🧪\nSai Hospital: +919632219690",
        },
        "bill": {
            "marathi": "नमस्कार {name} जी 🙏\nSai Emergency & Multispeciality Hospital चे आपले बिल तयार आहे.\nबिल क्रमांक: {bill_number}\nएकूण रक्कम: ₹{net_amount}\nस्थिती: {payment_status}\nहेल्पलाइन: 9632219690 / 7204583699\nलवकर बरे व्हा!",
            "kannada": "ನಮಸ್ಕಾರ {name} ಜಿ 🙏\nSai Emergency & Multispeciality Hospital ನ ನಿಮ್ಮ ಬಿಲ್ ಸಿದ್ಧವಾಗಿದೆ.\nಬಿಲ್ ಸಂಖ್ಯೆ: {bill_number}\nಒಟ್ಟು ಮೊತ್ತ: ₹{net_amount}\nಸ್ಥಿತಿ: {payment_status}\nಸಂಪರ್ಕ: 9632219690 / 7204583699\nಬೇಗ ಗುಣಮುಖರಾಗಿ!",
            "hindi": "नमस्कार {name} जी 🙏\nSai Emergency & Multispeciality Hospital का आपका बिल तैयार है।\nबिल नंबर: {bill_number}\nकुल राशि: ₹{net_amount}\nस्थिति: {payment_status}\nहेल्पलाइन: 9632219690 / 7204583699\nजल्द स्वस्थ हों!",
            "english": "Dear {name} 🙏\nYour bill for Sai Emergency & Multispeciality Hospital is ready.\nBill No: {bill_number}\nTotal Amount: ₹{net_amount}\nStatus: {payment_status}\nHelpline: 9632219690 / 7204583699\nGet well soon!",
        },
        "reminder": {
            "marathi": "नमस्कार {name} जी 🙏\nउद्या आपली Sai Hospital मध्ये भेट आहे\nडॉक्टर: Dr. {doctor} ({time})\nखात्री करण्यासाठी YES reply करा.\nहेल्पलाइन: +919632219690",
            "kannada": "ನಮಸ್ಕಾರ {name} ಜಿ 🙏\nನಾಳೆ Sai Hospital ನಲ್ಲಿ ನಿಮ್ಮ ಭೇಟಿ ಇದೆ\nವೈದ್ಯರು: Dr. {doctor} ({time})\nಖಚಿತಪಡಿಸಲು YES ಎಂದು ಉತ್ತರಿಸಿ.\nಸಂಪರ್ಕ: +919632219690",
            "hindi": "नमस्कार {name} जी 🙏\nकल Sai Hospital में आपकी अपॉइंटमेंट है\nडॉक्टर: Dr. {doctor} ({time})\nपुष्टि के लिए YES रिप्लाई करें।\nहेल्पलाइन: +919632219690",
            "english": "Hello {name} 🙏\nReminder: Your appointment at Sai Hospital with Dr. {doctor} is tomorrow at {time}.\nReply YES to confirm.\nHelpline: +919632219690",
        },
    }

    lang = str(language).lower() if str(language).lower() in ("marathi", "kannada", "hindi", "english") else "english"
    template_group = templates.get(message_type, {})
    template = template_group.get(lang, template_group.get("english", ""))

    if template:
        try:
            return template.format(**context)
        except KeyError:
            pass

    return f"Sai Hospital message for {message_type} — {context.get('name', 'Patient')}"
