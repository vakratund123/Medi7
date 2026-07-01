# MEDI7 — Paperless Hospital Management System

> **The world's first conversational hospital operating system for Indian multispecialty hospitals.**
> Built with FastAPI, React, PostgreSQL, Redis, Celery, and Google Gemini AI.

---

## 🏥 What is MEDI7?

MEDI7 eliminates all paper from hospital workflows. Every patient record, prescription, lab report, and bill is digital, centralized, and accessible in real time. AI assists at every step.

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- Docker Desktop installed and running
- Git

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd Medi7
cp .env.example .env
# Edit .env and fill in your API keys (optional for dev — AI features will stub)
```

### 2. Start all services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 16** on port 5432
- **Redis 7** on port 6379
- **FastAPI backend** on port 8000
- **Celery worker** (background tasks)
- **React frontend** on port 5173

### 3. Seed the database

```bash
docker-compose exec backend python seed_data.py
```

### 4. Open the app

- **Frontend**: http://localhost:5173
- **API Docs (Swagger)**: http://localhost:8000/docs

---

## 🔐 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Owner / Admin** | owner@saihospital.in | Admin@123 |
| **Doctor** | dr.priya@saihospital.in | Doctor@123 |
| **Receptionist** | receptionist@saihospital.in | Recept@123 |
| **Lab Technician** | lab@saihospital.in | Lab@1234 |
| **Pharmacist** | pharmacy@saihospital.in | Pharm@123 |
| **Radiologist** | radiology@saihospital.in | Radio@123 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│           (Role-based dashboards, Tailwind CSS)          │
└─────────────────────────────────────────────────────────┘
                           │ HTTP/Axios
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  JWT + RBAC  │  │  REST APIs   │  │  Celery Tasks  │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                │                    │
   PostgreSQL          AWS S3             Redis Queue
   (patient data)    (files/PDFs)      (WhatsApp jobs)
         │
   Google Gemini AI  (report analysis, AI scribe, summaries)
```

---

## 📁 Project Structure

```
Medi7/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings from .env
│   │   ├── database.py          # Async SQLAlchemy
│   │   ├── models/              # ORM models (10 tables)
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # AI, PDF, WhatsApp, Storage
│   │   ├── middleware/          # JWT + RBAC
│   │   ├── templates/           # Jinja2 PDF templates
│   │   └── tasks/               # Celery background tasks
│   ├── seed_data.py             # Demo data seeder
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/               # 6 role-based dashboards
│       ├── components/          # Shared UI components
│       ├── contexts/            # Auth state
│       └── api/                 # Axios client
├── db/schema.sql                # PostgreSQL schema
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔑 API Keys (Optional for Dev)

Fill in `.env` to activate real integrations:

| Key | Service | Purpose |
|-----|---------|---------|
| `GEMINI_API_KEY` | Google AI Studio | AI Scribe, Report Reader, Summaries |
| `OPENAI_API_KEY` | OpenAI | Whisper speech-to-text |
| `WATI_API_TOKEN` | WATI.io | WhatsApp message delivery |
| `AWS_ACCESS_KEY_ID` | AWS | S3 file storage (prod) |

**Without these keys**: AI features show stub responses. WhatsApp messages are logged to console.

---

## 📱 Role Dashboards

| Role | Features |
|------|----------|
| **Receptionist** | Register patients, OPD queue, assign to doctor |
| **Doctor** | Patient queue, full history + AI summary, consultation, prescription, lab/radiology orders |
| **Lab Technician** | View lab orders, mark sample collected, upload report (AI analysis runs automatically) |
| **Radiologist** | View radiology orders, upload scans + remarks |
| **Pharmacist** | Search by patient ID, view active prescription, dispense, update inventory |
| **Owner** | Live stats, doctor-wise counts, staff activity log, low-stock alerts |

---

## 🔒 Security

- JWT authentication (30-min access tokens)
- RBAC — each role sees only their permitted pages/endpoints
- Every mutating action logged in `audit_logs` (staff_id + timestamp + IP)
- Passwords hashed with bcrypt
- CORS restricted to frontend origin
- DPDP Act 2023 compliant data handling

---

## 🛠️ Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Set env vars (copy .env.example → .env, fill DATABASE_URL for local Postgres)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌍 Patient Journey

```
1. Receptionist → Register Patient → SAI-2026-XXXXX generated → WhatsApp welcome sent
2. Doctor → Queue → Open Patient → AI 3-line summary shown
3. Doctor → Start Consultation → Enter diagnosis + medicines → Save
4. Prescription PDF generated → WhatsApp delivered to patient
5. Lab Technician → View order → Collect sample → Upload report
6. AI (Gemini) → Reads report → Flags abnormals → Doctor notified
7. Patient receives report on WhatsApp
8. Pharmacist → Search patient → View Rx → Dispense → Inventory updated
9. Day before follow-up → Auto WhatsApp reminder sent
```

---

## 🗺️ Roadmap

| Phase | Status |
|-------|--------|
| Phase 1 MVP (this build) | ✅ Complete |
| AI Scribe (voice → prescription) | 🔜 Phase 2 |
| AI Report Reader (auto flag abnormals) | 🔜 Phase 2 |
| Billing & payments | 🔜 Phase 2 |
| ICU Early Warning System | 🔮 Phase 3 |
| Multi-hospital support | 🔮 Phase 3 |

---

*Built with ❤️ for Indian healthcare.*
