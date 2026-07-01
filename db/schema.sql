-- ============================================================
-- MEDI7 — Paperless Hospital Management System
-- PostgreSQL 16 Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STAFF TABLE
-- ============================================================
CREATE TABLE staff (
    staff_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(200) NOT NULL,
    mobile          VARCHAR(15) NOT NULL UNIQUE,
    role            VARCHAR(50) NOT NULL CHECK (role IN (
                        'receptionist', 'doctor', 'lab_technician',
                        'radiologist', 'pharmacist', 'owner'
                    )),
    department      VARCHAR(100),
    login_email     VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(login_email);
CREATE INDEX idx_staff_role ON staff(role);

-- ============================================================
-- PATIENTS TABLE
-- ============================================================
CREATE TABLE patients (
    patient_id          VARCHAR(20) PRIMARY KEY,   -- SAI-2026-XXXXX
    full_name           VARCHAR(200) NOT NULL,
    mobile_number       VARCHAR(15) NOT NULL,
    date_of_birth       DATE,
    age                 INTEGER,
    gender              VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    address             TEXT,
    blood_group         VARCHAR(5) CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    known_allergies     TEXT,
    chronic_conditions  TEXT,
    language_preference VARCHAR(20) NOT NULL DEFAULT 'english'
                        CHECK (language_preference IN ('marathi', 'kannada', 'hindi', 'english')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_mobile ON patients(mobile_number);
CREATE INDEX idx_patients_name ON patients(full_name);
CREATE INDEX idx_patients_created ON patients(created_at);

-- ============================================================
-- VISITS TABLE
-- ============================================================
CREATE TABLE visits (
    visit_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    doctor_id       UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_type      VARCHAR(20) NOT NULL CHECK (visit_type IN ('OPD', 'IPD', 'Emergency')),
    status          VARCHAR(30) NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_consultation', 'completed', 'cancelled')),
    chief_complaint TEXT,
    diagnosis       TEXT,
    notes           TEXT,
    follow_up_date  DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_doctor ON visits(doctor_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_status ON visits(status);

-- ============================================================
-- PRESCRIPTIONS TABLE
-- ============================================================
CREATE TABLE prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL REFERENCES visits(visit_id) ON DELETE RESTRICT,
    patient_id      VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    doctor_id       UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    -- medicines: [{medicine_name, dosage, frequency, duration_days, instructions}]
    medicines       JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdf_url         TEXT
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_visit ON prescriptions(visit_id);

-- ============================================================
-- LAB ORDERS TABLE
-- ============================================================
CREATE TABLE lab_orders (
    order_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL REFERENCES visits(visit_id) ON DELETE RESTRICT,
    patient_id      VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    ordered_by      UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    -- tests: ["CBC", "LFT", "KFT", ...]
    tests           JSONB NOT NULL DEFAULT '[]',
    status          VARCHAR(30) NOT NULL DEFAULT 'ordered'
                    CHECK (status IN ('ordered', 'sample_collected', 'completed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_status ON lab_orders(status);

-- ============================================================
-- LAB REPORTS TABLE
-- ============================================================
CREATE TABLE lab_reports (
    report_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES lab_orders(order_id) ON DELETE RESTRICT,
    patient_id      VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    report_type     VARCHAR(50) NOT NULL CHECK (report_type IN (
                        'blood', 'urine', 'culture', 'stool', 'biopsy', 'other'
                    )),
    uploaded_by     UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    file_url        TEXT NOT NULL,
    ai_summary      TEXT,
    abnormal_flags  JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX idx_lab_reports_order ON lab_reports(order_id);

-- ============================================================
-- RADIOLOGY TABLE
-- ============================================================
CREATE TABLE radiology (
    scan_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    visit_id            UUID NOT NULL REFERENCES visits(visit_id) ON DELETE RESTRICT,
    scan_type           VARCHAR(30) NOT NULL CHECK (scan_type IN (
                            'X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'PET'
                        )),
    ordered_by          UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    status              VARCHAR(20) NOT NULL DEFAULT 'ordered'
                        CHECK (status IN ('ordered', 'completed')),
    file_url            TEXT,
    radiologist_remarks TEXT,
    uploaded_by         UUID REFERENCES staff(staff_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_radiology_patient ON radiology(patient_id);
CREATE INDEX idx_radiology_status ON radiology(status);

-- ============================================================
-- PHARMACY DISPENSING TABLE
-- ============================================================
CREATE TABLE pharmacy_dispensing (
    dispense_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    prescription_id     UUID NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE RESTRICT,
    -- medicines_dispensed: [{medicine_name, quantity}]
    medicines_dispensed JSONB NOT NULL DEFAULT '[]',
    dispensed_by        UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    dispensed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pharmacy_patient ON pharmacy_dispensing(patient_id);

-- ============================================================
-- WHATSAPP LOGS TABLE
-- ============================================================
CREATE TABLE whatsapp_logs (
    log_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    message_type    VARCHAR(30) NOT NULL CHECK (message_type IN (
                        'welcome', 'prescription', 'report', 'reminder', 'refill'
                    )),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_patient ON whatsapp_logs(patient_id);

-- ============================================================
-- INVENTORY TABLE
-- ============================================================
CREATE TABLE inventory (
    item_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_name       VARCHAR(200) NOT NULL,
    generic_name        VARCHAR(200),
    quantity_available  INTEGER NOT NULL DEFAULT 0,
    unit                VARCHAR(20) DEFAULT 'tablets',
    reorder_level       INTEGER NOT NULL DEFAULT 50,
    expiry_date         DATE,
    last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_name ON inventory(medicine_name);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity_available) WHERE quantity_available <= reorder_level;

-- ============================================================
-- AUDIT LOGS TABLE (DPDP Compliance)
-- ============================================================
CREATE TABLE audit_logs (
    log_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id    UUID REFERENCES staff(staff_id),
    action      VARCHAR(100) NOT NULL,
    entity      VARCHAR(50),
    entity_id   VARCHAR(100),
    details     JSONB DEFAULT '{}',
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_staff ON audit_logs(staff_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- PATIENT ID SEQUENCE (for SAI-2026-XXXXX format)
-- ============================================================
CREATE SEQUENCE patient_id_seq START 1;

-- Helper function to generate next patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS VARCHAR AS $$
DECLARE
    year_part VARCHAR(4);
    seq_part  VARCHAR(5);
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    seq_part  := LPAD(nextval('patient_id_seq')::TEXT, 5, '0');
    RETURN 'SAI-' || year_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql;
