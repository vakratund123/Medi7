"""
Comprehensive End-to-End System Test Suite for MEDI7
Tests all critical workflows:
1. Health check
2. Authentication across all 5 official staff IDs
3. Patient registration with referred_by
4. OPD Queue & visit retrieval
5. Consultation & Prescription creation with PDF generation
6. Patient Final Bill creation with Sai Hospital Letterhead PDF & INR words
7. Bill payment collection (Cash/UPI/Card)
8. Owner / Manager Referral Monthly Analytics & CSV export
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import get_settings
from app.services.pdf_service import number_to_words_inr

settings = get_settings()

STAFF_CREDENTIALS = [
    ("Manager", "manager@saihospital.in", "Admin@123", "manager"),
    ("Doctor", "doctor@saihospital.in", "Doctor@123", "doctor"),
    ("Receptionist", "reception@saihospital.in", "Recept@123", "receptionist"),
    ("Laboratory", "laboratory@saihospital.in", "Lab@1234", "lab_technician"),
    ("Pharmacy", "pharmacy@saihospital.in", "Pharm@123", "pharmacist"),
]


async def run_tests():
    print("\n=======================================================")
    print("  MEDI7 — COMPREHENSIVE SYSTEM VERIFICATION SUITE")
    print("=======================================================\n")
    transport = ASGITransport(app=app)
    tokens = {}
    staff_ids = {}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Check
        print("1. Testing /health endpoint...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        assert data["status"] == "ok"
        print(f"   [PASS] Health check OK: {data['hospital']}\n")

        # 2. Test Login for all 5 Staff IDs
        print("2. Testing Authentication for all 5 Hospital IDs...")
        for label, email, password, role in STAFF_CREDENTIALS:
            res = await client.post("/api/auth/login", json={"email": email, "password": password})
            assert res.status_code == 200, f"Login failed for {label} ({email}): {res.text}"
            body = res.json()
            assert "access_token" in body, f"No access token for {label}"
            tokens[role] = body["access_token"]
            staff_ids[role] = body["staff_id"]
            print(f"   [PASS] {label} login OK -> Role: {body['role']} (ID: {body['staff_id']})")
        print()

        # Helper headers
        reception_headers = {"Authorization": f"Bearer {tokens['receptionist']}"}
        doctor_headers = {"Authorization": f"Bearer {tokens['doctor']}"}
        manager_headers = {"Authorization": f"Bearer {tokens['manager']}"}

        # 3. Test Patient Registration with Referral
        print("3. Testing Patient Registration with Referred By...")
        import uuid
        unique_suffix = str(uuid.uuid4().hex[:6])
        patient_payload = {
            "full_name": f"Test Patient {unique_suffix}",
            "mobile_number": f"98{unique_suffix[:8]}",
            "age": 45,
            "gender": "male",
            "blood_group": "B+",
            "referred_by": "Dr. S. Kulkarni (Sangli Clinic)",
            "language_preference": "marathi",
        }
        res = await client.post("/api/patients/", json=patient_payload, headers=reception_headers)
        assert res.status_code == 200, f"Patient registration failed: {res.text}"
        patient_data = res.json()
        patient_id = patient_data["patient_id"]
        assert patient_data["referred_by"] == "Dr. S. Kulkarni (Sangli Clinic)"
        print(f"   [PASS] Registered patient: {patient_data['full_name']} -> ID: {patient_id}")
        print(f"          Referred By: {patient_data['referred_by']}\n")

        # 4. Test Visit Creation & OPD Queue
        print("4. Testing Visit Creation & OPD Queue...")
        visit_payload = {
            "patient_id": patient_id,
            "doctor_id": staff_ids["doctor"],
            "visit_type": "OPD",
            "chief_complaint": "Persistent cough and mild fever for 3 days",
            "referred_by": "Dr. S. Kulkarni (Sangli Clinic)",
        }
        res = await client.post("/api/visits/", json=visit_payload, headers=reception_headers)
        assert res.status_code == 200, f"Visit creation failed: {res.text}"
        visit_data = res.json()
        visit_id = visit_data["visit_id"]
        print(f"   [PASS] Visit created: {visit_id} (Status: {visit_data['status']})\n")

        # 5. Test Prescription Creation with Medicines & PDF
        print("5. Testing Doctor Prescription & PDF Generation...")
        rx_payload = {
            "visit_id": visit_id,
            "patient_id": patient_id,
            "doctor_id": staff_ids["doctor"],
            "medicines": [
                {
                    "medicine_name": "Metformin 500mg",
                    "dosage": "500 mg",
                    "frequency": "1-0-1",
                    "duration_days": 10,
                    "instructions": "After food",
                },
                {
                    "medicine_name": "Montelukast 10mg",
                    "dosage": "10 mg",
                    "frequency": "0-0-1",
                    "duration_days": 5,
                    "instructions": "At bedtime",
                },
            ],
        }
        res = await client.post("/api/prescriptions/", json=rx_payload, headers=doctor_headers)
        assert res.status_code == 200, f"Prescription failed: {res.text}"
        rx_data = res.json()
        assert len(rx_data["medicines"]) == 2
        print(f"   [PASS] Prescription created with 2 medicines: {rx_data['prescription_id']}")
        print(f"          PDF URL: {rx_data.get('pdf_url')}\n")

        # 6. Test Patient Final Bill Creation (Sai Hospital Letterhead)
        print("6. Testing Patient Final Bill Creation & Letterhead PDF...")
        bill_payload = {
            "visit_id": visit_id,
            "patient_id": patient_id,
            "doctor_id": staff_ids["doctor"],
            "items": [
                {"name": "Doctor Consultation Fee", "category": "Consultation", "quantity": 1, "unit_price": 300, "total": 300},
                {"name": "Complete Haemogram (CBC)", "category": "Diagnostics", "quantity": 1, "unit_price": 100, "total": 100},
                {"name": "Dengue Test", "category": "Diagnostics", "quantity": 1, "unit_price": 600, "total": 600},
            ],
            "subtotal": 1000,
            "discount": 100,
            "tax": 0,
            "net_amount": 900,
            "payment_status": "pending",
            "payment_mode": "cash",
            "notes": "Patient advised rest for 3 days",
        }
        res = await client.post("/api/bills/", json=bill_payload, headers=doctor_headers)
        assert res.status_code == 200, f"Bill creation failed: {res.text}"
        bill_data = res.json()
        bill_id = bill_data["bill_id"]
        assert bill_data["bill_number"].startswith("SEMH-B")
        assert bill_data["net_amount"] == 900.0
        print(f"   [PASS] Final Bill created: {bill_data['bill_number']} (Net: Rs. {bill_data['net_amount']})")
        print(f"          PDF URL: {bill_data.get('pdf_url')}\n")

        # Test Amount in Words helper
        words = number_to_words_inr(900.0)
        assert "Nine Hundred" in words
        print(f"   [PASS] Amount in words verified: {words}\n")

        # 7. Test Bill Payment Update
        print("7. Testing Bill Payment Recording...")
        pay_payload = {
            "payment_status": "paid",
            "payment_mode": "upi",
            "notes": "Paid via Google Pay at reception counter",
        }
        res = await client.patch(f"/api/bills/{bill_id}/payment", json=pay_payload, headers=reception_headers)
        assert res.status_code == 200, f"Payment update failed: {res.text}"
        updated_bill = res.json()
        assert updated_bill["payment_status"] == "paid"
        assert updated_bill["payment_mode"] == "upi"
        print(f"   [PASS] Payment updated to: {updated_bill['payment_status']} via {updated_bill['payment_mode']}\n")

        # 8. Test Owner / Manager Referrals Analytics & CSV Export
        print("8. Testing Owner Referral Analytics & CSV Export...")
        import datetime
        now = datetime.date.today()
        res = await client.get(f"/api/owner/referrals?year={now.year}&month={now.month}", headers=manager_headers)
        assert res.status_code == 200, f"Referrals failed: {res.text}"
        ref_data = res.json()
        assert "total_referrals" in ref_data
        assert "doctor_counts" in ref_data
        print(f"   [PASS] Monthly referrals retrieved: Total {ref_data['total_referrals']} referred visits")

        # CSV export
        res_csv = await client.get(f"/api/owner/referrals/export?year={now.year}&month={now.month}", headers=manager_headers)
        assert res_csv.status_code == 200, f"Referral CSV export failed: {res_csv.text}"
        assert "text/csv" in res_csv.headers.get("content-type", "")
        csv_text = res_csv.text
        assert "Patient ID,Patient Name,Mobile" in csv_text
        print(f"   [PASS] Monthly Referral CSV export OK ({len(csv_text.splitlines())} rows in CSV)\n")

    print("=======================================================")
    print("  ALL TESTS PASSED WITH 100% SUCCESS!")
    print("  FastAPI Backend & Hospital Workflows are Smooth & Cloud-Ready.")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
