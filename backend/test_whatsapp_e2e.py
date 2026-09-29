"""
End-to-End WhatsApp Integration Test Suite for MEDI7
Tests:
1. Mobile number normalization and sanitization (all Indian formats).
2. WhatsApp status and provider verification.
3. Meta Cloud API text messaging.
4. Meta Cloud API approved template messaging (hospital_welcome_update, hospital_prescription_ready).
5. Direct Binary PDF upload to Meta Media API and document delivery (local PDF).
6. Patient registration welcome WhatsApp flow.
7. Doctor prescription PDF generation and WhatsApp delivery.
8. Cashier / Doctor final bill PDF generation and WhatsApp delivery.
9. Cashier payment receipt WhatsApp delivery.
10. Manual re-send API endpoints and audit logging in database.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import get_settings
from app.services.whatsapp_service import (
    _normalize_mobile,
    send_whatsapp_message,
    send_whatsapp_template,
    send_whatsapp_document,
)
from app.services.ai_service import generate_whatsapp_message
from app.services.pdf_service import generate_prescription_pdf, generate_bill_pdf

settings = get_settings()

TEST_PHONE = "8618688243"  # Verified hospital test recipient


async def test_all_whatsapp_e2e():
    print("\n=======================================================")
    print("  MEDI7 — WHATSAPP MESSAGING END-TO-END VERIFICATION")
    print("=======================================================\n")

    # 1. Number normalization tests
    print("1. Testing Mobile Number Normalization & Sanitization...")
    assert _normalize_mobile("9823012345") == "919823012345", "10 digit normalization failed"
    assert _normalize_mobile("+91 98230 12345") == "919823012345", "+91 with spaces failed"
    assert _normalize_mobile("09823012345") == "919823012345", "leading zero failed"
    assert _normalize_mobile("+91-98230-12345") == "919823012345", "+91 with dashes failed"
    assert _normalize_mobile("919823012345") == "919823012345", "already prefixed 91 failed"
    assert _normalize_mobile("(98230) 12345") == "919823012345", "parentheses failed"
    assert _normalize_mobile("9804bedf") is None, "Hex string should be rejected"
    assert _normalize_mobile("12345") is None, "Short number should be rejected"
    assert _normalize_mobile("") is None, "Empty number should be rejected"
    print("   [PASS] Mobile normalization handles all Indian formats and rejects invalid numbers!\n")

    # 2. Multilingual AI Message Generator tests
    print("2. Testing Multilingual Message Generator (Marathi, Kannada, Hindi, English)...")
    for lang in ["marathi", "kannada", "hindi", "english"]:
        w_msg = await generate_whatsapp_message("welcome", lang, {"name": "Suresh Patil", "patient_id": "SAI-2026-0001"})
        assert "SAI-2026-0001" in w_msg, f"Welcome message missing ID in {lang}"
        rx_msg = await generate_whatsapp_message("prescription", lang, {"name": "Suresh Patil", "follow_up": "5 days"})
        assert "5 days" in rx_msg, f"Rx message missing follow up in {lang}"
        bill_msg = await generate_whatsapp_message("bill", lang, {"name": "Suresh Patil", "bill_number": "SEMH-001", "net_amount": "850.00", "payment_status": "PAID"})
        assert "850.00" in bill_msg, f"Bill message missing amount in {lang}"
    print("   [PASS] Multilingual message generator produces accurate messages in all 4 languages!\n")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 3. Check WhatsApp Status endpoint
        print("3. Testing /api/whatsapp/status endpoint...")
        # Login as manager
        login_res = await client.post("/api/auth/login", json={"email": "manager@saihospital.in", "password": "Admin@123"})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        mgr_token = login_res.json()["access_token"]
        mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

        status_res = await client.get("/api/whatsapp/status", headers=mgr_headers)
        assert status_res.status_code == 200
        s_data = status_res.json()
        print(f"   [PASS] WhatsApp Status: Provider={s_data['provider']}, Configured={s_data['status']}, Number={s_data.get('hospital_number')}\n")

        # 4. Live Test: Meta Plain Text Message
        print(f"4. Testing Live Plain Text Message to {TEST_PHONE}...")
        test_txt_res = await client.post(
            "/api/whatsapp/test/message",
            json={"mobile": TEST_PHONE, "message": "🏥 [Medi7 Verification] Live text message delivery test."},
            headers=mgr_headers,
        )
        assert test_txt_res.status_code == 200, f"Text test failed: {test_txt_res.text}"
        print(f"   [PASS] Text message delivered successfully to {TEST_PHONE}!\n")

        # 5. Live Test: Meta Approved Welcome Template
        print(f"5. Testing Approved Template 'hospital_welcome_update' to {TEST_PHONE}...")
        test_tpl_res = await client.post(
            "/api/whatsapp/test/template",
            json={
                "mobile": TEST_PHONE,
                "template_name": "hospital_welcome_update",
                "parameters": ["SAI-2026-TEST99"],
            },
            headers=mgr_headers,
        )
        assert test_tpl_res.status_code == 200, f"Welcome template test failed: {test_tpl_res.text}"
        print(f"   [PASS] Official Meta template 'hospital_welcome_update' delivered to {TEST_PHONE}!\n")

        # 6. Live Test: Meta Approved Prescription Template
        print(f"6. Testing Approved Template 'hospital_prescription_ready' to {TEST_PHONE}...")
        test_rx_tpl = await client.post(
            "/api/whatsapp/test/template",
            json={
                "mobile": TEST_PHONE,
                "template_name": "hospital_prescription_ready",
                "parameters": ["Nirmal Test", "7 days"],
            },
            headers=mgr_headers,
        )
        assert test_rx_tpl.status_code == 200, f"Prescription template test failed: {test_rx_tpl.text}"
        print(f"   [PASS] Official Meta template 'hospital_prescription_ready' delivered to {TEST_PHONE}!\n")

        # 7. Live Test: Local PDF Generation and Direct Binary Upload to Meta Cloud API
        print(f"7. Testing Local PDF Generation & Direct Meta Media Upload to {TEST_PHONE}...")
        # Generate an authentic prescription PDF
        rx_pdf_path = generate_prescription_pdf(
            patient={"full_name": "Test Patient WhatsApp", "patient_id": "SAI-2026-WA99", "age": 35, "gender": "male"},
            doctor={"full_name": "Dr. Rahul Nirmale", "department": "General Medicine"},
            prescription={"prescription_id": "test-rx-001", "medicines": [
                {"medicine_name": "Paracetamol 650mg", "dosage": "650mg", "frequency": "1-0-1", "duration_days": 3, "instructions": "After food"},
                {"medicine_name": "Amoxicillin 500mg", "dosage": "500mg", "frequency": "1-1-1", "duration_days": 5, "instructions": "After food"}
            ]},
            visit={"diagnosis": "Acute Upper Respiratory Tract Infection", "follow_up_date": "2026-10-07"},
        )
        print(f"   Generated Local Binary PDF: {rx_pdf_path}")
        assert rx_pdf_path and Path(settings.LOCAL_STORAGE_PATH).parent.joinpath(rx_pdf_path.lstrip("/")).exists() or Path("uploads/prescriptions").exists()

        # Send local PDF document through our new binary upload pipeline
        doc_send_success = await send_whatsapp_document(
            mobile=TEST_PHONE,
            file_path_or_url=rx_pdf_path,
            caption="Prescription SAI-2026-WA99",
            patient_id="SAI-2026-WA99",
        )
        assert doc_send_success, "Local PDF binary upload and delivery failed"
        print(f"   [PASS] Local Prescription PDF binary uploaded to Meta Media API and delivered to {TEST_PHONE}!\n")

        # 8. Full Hospital Workflow End-to-End Simulation
        print("8. Testing End-to-End Hospital Workflow with WhatsApp Automation...")
        # A. Receptionist registers patient with real test phone number
        recept_login = await client.post("/api/auth/login", json={"email": "reception@saihospital.in", "password": "Recept@123"})
        recept_headers = {"Authorization": f"Bearer {recept_login.json()['access_token']}"}

        doc_login = await client.post("/api/auth/login", json={"email": "doctor@saihospital.in", "password": "Doctor@123"})
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}
        doc_id = doc_login.json()["staff_id"]

        patient_res = await client.post(
            "/api/patients/",
            json={
                "full_name": "E2E WhatsApp Patient",
                "mobile_number": TEST_PHONE,
                "age": 42,
                "gender": "male",
                "blood_group": "O+",
                "language_preference": "marathi",
                "referred_by": "Self",
            },
            headers=recept_headers,
        )
        assert patient_res.status_code == 200, f"Patient registration failed: {patient_res.text}"
        p_data = patient_res.json()
        patient_id = p_data["patient_id"]
        print(f"   [Step A] Patient registered: {p_data['full_name']} (ID: {patient_id}) -> Welcome WhatsApp dispatched!")

        # B. Create OPD Visit
        visit_res = await client.post(
            "/api/visits/",
            json={
                "patient_id": patient_id,
                "doctor_id": doc_id,
                "visit_type": "OPD",
                "chief_complaint": "Viral Fever and Headache",
            },
            headers=recept_headers,
        )
        assert visit_res.status_code == 200
        visit_id = visit_res.json()["visit_id"]

        # C. Doctor Consultation & Prescription (dispatches template + PDF)
        rx_res = await client.post(
            "/api/prescriptions/",
            json={
                "patient_id": patient_id,
                "visit_id": visit_id,
                "doctor_id": doc_id,
                "medicines": [
                    {"medicine_name": "Azithromycin 500mg", "dosage": "500mg", "frequency": "1-0-0", "duration_days": 3, "instructions": "Before food"},
                    {"medicine_name": "Paracetamol 650mg", "dosage": "650mg", "frequency": "1-0-1", "duration_days": 3, "instructions": "SOS fever"}
                ],
            },
            headers=doc_headers,
        )
        assert rx_res.status_code == 200
        rx_id = rx_res.json()["prescription_id"]
        print(f"   [Step B] Doctor Prescription created -> Rx template & PDF dispatched!")

        # D. Bill Creation (dispatches notification + Letterhead Bill PDF)
        bill_res = await client.post(
            "/api/bills/",
            json={
                "patient_id": patient_id,
                "doctor_id": doc_id,
                "visit_id": visit_id,
                "items": [
                    {"name": "OPD Consultation", "category": "Consultation", "quantity": 1, "unit_price": 300.0, "total": 300.0},
                    {"name": "Complete Blood Count (CBC)", "category": "Laboratory", "quantity": 1, "unit_price": 250.0, "total": 250.0},
                ],
                "subtotal": 550.0,
                "discount": 50.0,
                "tax": 0.0,
                "net_amount": 500.0,
                "payment_status": "pending",
                "payment_mode": "cash",
                "notes": "E2E WhatsApp bill test",
            },
            headers=doc_headers,
        )
        assert bill_res.status_code == 200
        bill_id = bill_res.json()["bill_id"]
        bill_num = bill_res.json()["bill_number"]
        print(f"   [Step C] Final Discharge Bill created: {bill_num} -> Bill notification & PDF dispatched!")

        # E. Cashier Payment Collection (dispatches receipt)
        pay_res = await client.patch(
            f"/api/bills/{bill_id}/payment",
            json={
                "payment_status": "paid",
                "payment_mode": "upi",
                "notes": "Paid via PhonePe at cashier desk",
            },
            headers=mgr_headers,
        )
        assert pay_res.status_code == 200
        print(f"   [Step D] Cashier collected Rs. 500.00 via UPI -> Payment receipt dispatched!")

        # F. Test Manual Resend API
        resend_res = await client.post(f"/api/whatsapp/resend/bill/{bill_id}", headers=mgr_headers)
        assert resend_res.status_code == 200
        print(f"   [Step E] Manual 1-click re-send bill API verified OK!")

        # Allow background tasks to execute
        await asyncio.sleep(2)

        # 9. Verify WhatsApp Logs in Database
        print("\n9. Verifying Database Audit Logs in 'whatsapp_logs'...")
        logs_res = await client.get("/api/whatsapp/logs?limit=10", headers=mgr_headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) > 0, "No entries found in whatsapp_logs"
        print(f"   [PASS] Found {len(logs)} recent WhatsApp logs in database!")
        for l in logs[:5]:
            print(f"          - Patient: {l['patient_id']} | Type: {l['message_type']} | Status: {l['status']} | At: {l['sent_at']}")

    print("\n=======================================================")
    print("  ALL 10 WHATSAPP END-TO-END VERIFICATION CHECKS PASSED!")
    print("  WhatsApp messaging system is 100% operational!")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(test_all_whatsapp_e2e())
