"""
MEDI7 Seed Data Script
Populates database with: 1 owner, 5 staff, 10 patients, and sample visits.
Run: python seed_data.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

from app.config import get_settings
from app.models.staff import Staff
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.pharmacy import Inventory

settings = get_settings()

from app.database import engine, AsyncSessionLocal

STAFF_SEED = [
    # 5 Standard IDs for Sai Multispecialty Hospital
    {"full_name": "Dr. Rahul Nirmale", "mobile": "919632219690", "role": "manager",
     "department": "Administration", "login_email": "manager@saihospital.in", "password": "Admin@123"},
    {"full_name": "Dr. Rahul Nirmale", "mobile": "9876543221", "role": "doctor",
     "department": "General Medicine", "login_email": "doctor@saihospital.in", "password": "Doctor@123"},
    {"full_name": "Sunita Patil", "mobile": "9876543223", "role": "receptionist",
     "department": "Front Desk", "login_email": "reception@saihospital.in", "password": "Recept@123"},
    {"full_name": "Ravi Shinde", "mobile": "9876543224", "role": "lab_technician",
     "department": "Laboratory", "login_email": "laboratory@saihospital.in", "password": "Lab@1234"},
    {"full_name": "Meena Joshi", "mobile": "9876543215", "role": "pharmacist",
     "department": "Pharmacy", "login_email": "pharmacy@saihospital.in", "password": "Pharm@123"},

    # Alias / Secondary accounts for backwards compatibility
    {"full_name": "Dr. Rahul Nirmale", "mobile": "9876543210", "role": "owner",
     "department": "Administration", "login_email": "owner@saihospital.in", "password": "Admin@123"},
    {"full_name": "Dr. Rahul Nirmale", "mobile": "9876543211", "role": "doctor",
     "department": "General Medicine", "login_email": "dr.rahul@saihospital.in", "password": "Doctor@123"},
    {"full_name": "Sunita Patil", "mobile": "9876543213", "role": "receptionist",
     "department": "Front Desk", "login_email": "receptionist@saihospital.in", "password": "Recept@123"},
    {"full_name": "Ravi Shinde", "mobile": "9876543214", "role": "lab_technician",
     "department": "Laboratory", "login_email": "lab@saihospital.in", "password": "Lab@1234"},
    {"full_name": "Dr. Arjun Kulkarni", "mobile": "9876543212", "role": "doctor",
     "department": "Cardiology", "login_email": "dr.arjun@saihospital.in", "password": "Doctor@123"},
    {"full_name": "Dr. Kavita Rao", "mobile": "9876543216", "role": "radiologist",
     "department": "Radiology", "login_email": "radiology@saihospital.in", "password": "Radio@123"},
]

PATIENTS_SEED = [
    {"full_name": "Ramesh Patil", "mobile_number": "8800001111", "age": 47, "gender": "male",
     "blood_group": "B+", "chronic_conditions": "Hypertension, Type 2 Diabetes", "language_preference": "marathi",
     "referred_by": "Dr. Kulkarni (Sangli)"},
    {"full_name": "Sushma Deshpande", "mobile_number": "8800002222", "age": 35, "gender": "female",
     "blood_group": "A+", "language_preference": "marathi",
     "referred_by": "Dr. A. Patil (Kolhapur)"},
    {"full_name": "Vikram Naik", "mobile_number": "8800003333", "age": 62, "gender": "male",
     "blood_group": "O+", "chronic_conditions": "COPD", "language_preference": "kannada",
     "referred_by": "Dr. Kulkarni (Sangli)"},
    {"full_name": "Geeta Kumar", "mobile_number": "8800004444", "age": 28, "gender": "female",
     "language_preference": "english",
     "referred_by": "Self / Walk-in"},
    {"full_name": "Santosh Iyer", "mobile_number": "8800005555", "age": 55, "gender": "male",
     "blood_group": "AB+", "known_allergies": "Penicillin", "language_preference": "english",
     "referred_by": "Dr. S. Joshi (Miraj)"},
    {"full_name": "Anita More", "mobile_number": "8800006666", "age": 42, "gender": "female",
     "language_preference": "hindi",
     "referred_by": "Dr. A. Patil (Kolhapur)"},
    {"full_name": "Deepak Wagh", "mobile_number": "8800007777", "age": 33, "gender": "male",
     "language_preference": "marathi",
     "referred_by": "Dr. V. Shinde (Karad)"},
    {"full_name": "Priyanka Bhatt", "mobile_number": "8800008888", "age": 25, "gender": "female",
     "language_preference": "hindi",
     "referred_by": "Dr. Kulkarni (Sangli)"},
    {"full_name": "Mohan Reddy", "mobile_number": "8800009999", "age": 70, "gender": "male",
     "blood_group": "A-", "chronic_conditions": "CKD Stage 3", "language_preference": "kannada",
     "referred_by": "Dr. S. Joshi (Miraj)"},
    {"full_name": "Lakshmi Nair", "mobile_number": "8800000000", "age": 38, "gender": "female",
     "language_preference": "english",
     "referred_by": "Self / Walk-in"},
]

INVENTORY_SEED = [
    {"medicine_name": "Amlodipine 5mg", "generic_name": "Amlodipine", "quantity_available": 500, "reorder_level": 100},
    {"medicine_name": "Metformin 500mg", "generic_name": "Metformin", "quantity_available": 800, "reorder_level": 150},
    {"medicine_name": "Paracetamol 500mg", "generic_name": "Paracetamol", "quantity_available": 1000, "reorder_level": 200},
    {"medicine_name": "Pantoprazole 40mg", "generic_name": "Pantoprazole", "quantity_available": 600, "reorder_level": 100},
    {"medicine_name": "Atorvastatin 10mg", "generic_name": "Atorvastatin", "quantity_available": 40, "reorder_level": 100},
    {"medicine_name": "Azithromycin 500mg", "generic_name": "Azithromycin", "quantity_available": 200, "reorder_level": 50},
    {"medicine_name": "Cetirizine 10mg", "generic_name": "Cetirizine", "quantity_available": 15, "reorder_level": 80},
    {"medicine_name": "Amoxicillin 500mg", "generic_name": "Amoxicillin", "quantity_available": 300, "reorder_level": 80},
]


async def seed():
    from app.database import Base
    import app.models  # noqa
    async with engine.begin() as conn:
        print("[MEDI7] Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("[MEDI7] Seeding database...")

        # Staff
        print("  -> Creating staff accounts...")
        staff_objects = []
        for s in STAFF_SEED:
            existing = await db.execute(
                __import__("sqlalchemy", fromlist=["select"]).select(Staff).where(
                    (Staff.login_email == s["login_email"]) | (Staff.mobile == s["mobile"])
                )
            )
            if existing.scalar_one_or_none():
                from sqlalchemy import update
                await db.execute(
                    update(Staff)
                    .where(Staff.login_email == s["login_email"])
                    .values(full_name=s["full_name"])
                )
                await db.commit()
                print(f"    [Updated] {s['login_email']} -> {s['full_name']}")
                continue
            staff_obj = Staff(
                full_name=s["full_name"],
                mobile=s["mobile"],
                role=s["role"],
                department=s["department"],
                login_email=s["login_email"],
                password_hash=bcrypt.hashpw(s["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            )
            db.add(staff_obj)
            await db.commit()
            staff_objects.append(staff_obj)
            print(f"    [OK] {s['full_name']} ({s['role']}) -> {s['login_email']}")
        print(f"  [OK] {len(staff_objects)} new staff accounts created")

        # Patients
        print("  -> Creating patients...")
        created_count = 0
        skipped_count = 0
        import datetime
        for idx, p in enumerate(PATIENTS_SEED):
            # Check if patient with this mobile already exists (commit between checks to avoid autoflush issues)
            check_result = await db.execute(
                __import__("sqlalchemy", fromlist=["select"]).select(Patient).where(Patient.mobile_number == p["mobile_number"])
            )
            if check_result.scalar_one_or_none():
                print(f"    [Skip] {p['full_name']} ({p['mobile_number']}) already exists")
                skipped_count += 1
                continue

            # Generate a patient ID
            patient_id = None
            try:
                pid_result = await db.execute(text("SELECT generate_patient_id()"))
                patient_id = pid_result.scalar()
            except Exception:
                await db.rollback()

            if not patient_id:
                year_str = str(datetime.date.today().year)
                from sqlalchemy import select
                stmt = select(Patient.patient_id).where(Patient.patient_id.like(f"SAI-{year_str}-%")).order_by(Patient.patient_id.desc()).limit(1)
                last_id_result = await db.execute(stmt)
                last_id = last_id_result.scalar_one_or_none()
                if last_id:
                    try:
                        parts = last_id.split("-")
                        seq = int(parts[2]) + 1
                    except Exception:
                        seq = 1
                else:
                    seq = 1
                patient_id = f"SAI-{year_str}-{str(seq).zfill(5)}"

            patient = Patient(patient_id=patient_id, **p)
            db.add(patient)
            await db.commit()  # commit each patient individually to avoid batch collision
            created_count += 1
            print(f"    [OK] {p['full_name']} -> {patient_id}")

        print(f"  [OK] {created_count} patients created, {skipped_count} skipped")

        # Inventory
        print("  -> Seeding pharmacy inventory...")
        for inv in INVENTORY_SEED:
            item = Inventory(**inv)
            db.add(item)
        await db.commit()
        print(f"  [OK] {len(INVENTORY_SEED)} inventory items added")




        # Seed sample visits with referrals if visits table is empty
        print("  -> Checking sample visits...")
        from sqlalchemy import select
        v_check = await db.execute(select(Visit).limit(1))
        if not v_check.scalar_one_or_none():
            doc_res = await db.execute(select(Staff).where(Staff.role == "doctor").limit(1))
            doc = doc_res.scalar_one_or_none()
            doc_id = doc.staff_id if doc else None

            all_patients_res = await db.execute(select(Patient).limit(10))
            all_pts = all_patients_res.scalars().all()

            for pt in all_pts:
                v = Visit(
                    patient_id=pt.patient_id,
                    doctor_id=doc_id,
                    visit_date=datetime.date.today(),
                    visit_type="OPD",
                    status="completed" if pt.patient_id.endswith("1") else "waiting",
                    chief_complaint=f"Follow-up for {pt.chronic_conditions}" if pt.chronic_conditions else "Routine consultation",
                    diagnosis="Mild hypertension under control" if pt.chronic_conditions else "General physical examination",
                    referred_by=pt.referred_by,
                )
                db.add(v)
            await db.commit()
            print(f"  [OK] Seeded sample OPD visits with doctor referrals")

        print("\n=======================================================")
        print("  MEDI7 — SAI MULTISPECIALTY HOSPITAL DEMO READY")
        print("  Hospital WhatsApp: +919632219690")
        print("=======================================================")
        print("\nOfficial 5 Staff IDs:")
        print("  1. Manager:     manager@saihospital.in    / Admin@123")
        print("  2. Doctor:      doctor@saihospital.in     / Doctor@123")
        print("  3. Reception:   reception@saihospital.in  / Recept@123")
        print("  4. Laboratory:  laboratory@saihospital.in / Lab@1234")
        print("  5. Pharmacy:    pharmacy@saihospital.in   / Pharm@123")
        print("\nAliases / Backwards compatibility:")
        print("  Owner:        owner@saihospital.in        / Admin@123")
        print("  Doctor Alias: dr.priya@saihospital.in     / Doctor@123")
        print("  Receptionist: receptionist@saihospital.in / Recept@123")
        print("  Lab Tech:     lab@saihospital.in          / Lab@1234")


if __name__ == "__main__":
    asyncio.run(seed())
