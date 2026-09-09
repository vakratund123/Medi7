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
    """Generate WhatsApp message in patient's preferred language."""
    templates = {
        "welcome": {
            "marathi": "नमस्कार {name} जी 🙏\nSai Hospital मध्ये आपले स्वागत आहे.\nआपला Patient ID: {patient_id}\nअधिक माहितीसाठी संपर्क: +919632219690\nसर्व रेकॉर्ड डिजिटल सेव्ह केले जातील.",
            "kannada": "ನಮಸ್ಕಾರ {name} ಜಿ 🙏\nSai Hospital ಗೆ ಸ್ವಾಗತ.\nನಿಮ್ಮ Patient ID: {patient_id}\nಸಂಪರ್ಕ: +919632219690",
            "hindi": "नमस्कार {name} जी 🙏\nSai Hospital में आपका स्वागत है।\nआपकी Patient ID: {patient_id}\nहेल्पलाइन: +919632219690",
            "english": "Welcome {name} 🙏\nThank you for visiting Sai Hospital.\nYour Patient ID: {patient_id}\nHelpline: +919632219690",
        },
        "prescription": {
            "marathi": "नमस्कार {name} जी,\nआपली प्रिस्क्रिप्शन तयार आहे. 📋\nपुढील भेट: {follow_up}\nSai Hospital WhatsApp: +919632219690",
            "english": "Hello {name},\nYour prescription is ready. 📋\nNext visit: {follow_up}\nSai Hospital WhatsApp: +919632219690",
        },
        "report": {
            "marathi": "आपला {test_name} अहवाल तयार आहे. 🧪\nSai Hospital: +919632219690",
            "english": "Your {test_name} report is ready. 🧪\nSai Hospital: +919632219690",
        },
        "reminder": {
            "marathi": "उद्या आपली appointment आहे\nDr. {doctor} यांच्याकडे — {time}\nConfirm करण्यासाठी YES reply करा.\nSai Hospital: +919632219690",
            "english": "Reminder: Your appointment with Dr. {doctor} is tomorrow at {time}.\nReply YES to confirm.\nSai Hospital: +919632219690",
        },
    }

    lang = language if language in ("marathi", "kannada", "hindi", "english") else "english"
    template_group = templates.get(message_type, {})
    template = template_group.get(lang, template_group.get("english", ""))

    if template:
        try:
            return template.format(**context)
        except KeyError:
            pass

    return f"Message for {message_type} — {context.get('name', 'Patient')}"
