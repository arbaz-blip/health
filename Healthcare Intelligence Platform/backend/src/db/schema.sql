-- Enterprise HMS Pakistan Database Schema
-- Supports SaaS, On-Premise, and Cloud/Hybrid Deployments

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. BASE MODULE: ROLES & DEPARTMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS specializations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- ==========================================
-- 2. USER MANAGEMENT & AUTHENTICATION
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL REFERENCES roles(name) ON UPDATE CASCADE,
    department_id INT REFERENCES departments(id),
    specialization_id INT REFERENCES specializations(id),
    is_active BOOLEAN DEFAULT TRUE,
    mfa_secret VARCHAR(128),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 3. PATIENT REGISTRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mrn VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    cnic VARCHAR(20) UNIQUE,
    passport_number VARCHAR(30),
    gender VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address_street VARCHAR(255) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_state VARCHAR(100) NOT NULL,
    address_postal_code VARCHAR(20),
    blood_group VARCHAR(10) DEFAULT 'Unknown',
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_contact_relation VARCHAR(50) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    consent_accepted BOOLEAN DEFAULT TRUE,
    photograph_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. APPOINTMENTS & QUEUES
-- ==========================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id),
    department_id INT REFERENCES departments(id),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) DEFAULT 'Scheduled', -- Scheduled, Checked-in, Rescheduled, Cancelled, Completed
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number VARCHAR(20) NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    department_id INT NOT NULL REFERENCES departments(id),
    doctor_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'Waiting', -- Waiting, Serving, Completed, No-Show
    checked_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    serving_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 5. EMERGENCY & TRIAGE WORKFLOWS
-- ==========================================

CREATE TABLE IF NOT EXISTS emergency_intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    temporary_name VARCHAR(100),
    arrival_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mode_of_arrival VARCHAR(50) NOT NULL, -- Self, Ambulance, Police, Bystander
    ambulance_service VARCHAR(100),
    ambulance_plate_number VARCHAR(30),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    initial_condition TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Waiting for Triage', -- Waiting for Triage, Triage Completed, Under Treatment, Under Observation, Discharged, Referred, Admitted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_triages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_intake_id UUID NOT NULL REFERENCES emergency_intakes(id) ON DELETE CASCADE,
    triage_nurse_id UUID NOT NULL REFERENCES users(id),
    bp_systolic INT NOT NULL,
    bp_diastolic INT NOT NULL,
    pulse_rate INT NOT NULL,
    temperature_celsius NUMERIC(4,2) NOT NULL,
    oxygen_saturation INT NOT NULL,
    respiratory_rate INT NOT NULL,
    consciousness_level VARCHAR(20) NOT NULL, -- Alert (A), Voice (V), Pain (P), Unresponsive (U)
    priority_level VARCHAR(20) NOT NULL, -- Critical, High, Medium, Low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. ELECTRONIC MEDICAL RECORDS (EMR)
-- ==========================================

CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id),
    visit_date DATE DEFAULT CURRENT_DATE,
    soap_subjective TEXT,
    soap_objective TEXT,
    soap_assessment TEXT,
    soap_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    icd10_code VARCHAR(15) NOT NULL,
    icd10_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id),
    drug_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50) NOT NULL, -- e.g. 500mg, 1 tsp
    frequency VARCHAR(50) NOT NULL, -- e.g. TDS, BD, OD
    duration VARCHAR(50) NOT NULL, -- e.g. 5 Days, 1 Month
    instructions TEXT,
    status VARCHAR(30) DEFAULT 'Active', -- Active, Discontinued
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. LABORATORY INFORMATION SYSTEM (LIS)
-- ==========================================

CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    ordering_doctor_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'Ordered', -- Ordered, Sample Collected, In Laboratory, Processing, Completed, Verified
    clinical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS lab_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    sample_number VARCHAR(50) UNIQUE NOT NULL,
    sample_type VARCHAR(50) NOT NULL,
    collection_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collector_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'Collected', -- Collected, Received, Rejected
    rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    test_code VARCHAR(50) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    result_value VARCHAR(100),
    reference_range VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    is_flagged_critical BOOLEAN DEFAULT FALSE,
    technician_id UUID REFERENCES users(id),
    entered_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Pending Validation' -- Pending Validation, Approved, Rejected
);

-- ==========================================
-- 8. RADIOLOGY INFORMATION SYSTEM (RIS)
-- ==========================================

CREATE TABLE IF NOT EXISTS radiology_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    ordering_doctor_id UUID NOT NULL REFERENCES users(id),
    modality VARCHAR(30) NOT NULL, -- X-Ray, Ultrasound, CT, MRI, ECG
    body_part VARCHAR(100) NOT NULL,
    clinical_notes TEXT,
    status VARCHAR(30) DEFAULT 'Ordered', -- Ordered, Scheduled, Performed, Reported
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radiology_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    radiology_order_id UUID NOT NULL REFERENCES radiology_orders(id) ON DELETE CASCADE,
    radiologist_id UUID NOT NULL REFERENCES users(id),
    report_text TEXT NOT NULL,
    findings TEXT,
    dicom_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. PHARMACY INVENTORY & SALES
-- ==========================================

CREATE TABLE IF NOT EXISTS drug_catalogue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) UNIQUE NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    strength VARCHAR(50) NOT NULL,
    form VARCHAR(50) NOT NULL, -- Tablet, Capsule, Syrup, Injection, Suspension, Cream
    sku VARCHAR(50) UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    stock_level INT DEFAULT 0,
    reorder_level INT DEFAULT 10
);

CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    pharmacist_id UUID NOT NULL REFERENCES users(id),
    prescription_id UUID REFERENCES prescriptions(id),
    total_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- Cash, Card, MobileWallet
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drug_catalogue(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- ==========================================
-- 10. REVENUE MANAGEMENT & BILLING
-- ==========================================

CREATE TABLE IF NOT EXISTS insurance_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    support_phone VARCHAR(20),
    email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    total_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(10,2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'Unpaid', -- Unpaid, Partially Paid, Paid
    insurance_provider_id INT REFERENCES insurance_providers(id),
    insurance_policy_number VARCHAR(100),
    insurance_claim_status VARCHAR(30), -- N/A, Submitted, Approved, Rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- Consultation, Lab, Radiology, Ward/Admission, Pharmacy
    service_id UUID, -- References the respective order/sale/consultation
    description VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- Cash, Card, JazzCash, EasyPaisa
    transaction_reference VARCHAR(100),
    captured_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 11. IN-PATIENT ADMISSION & BED MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL -- General Ward, Private Ward, ICU, CCU, NICU
);

CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'Available', -- Available, Occupied, Maintenance
    UNIQUE(ward_id, bed_number)
);

CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_id INT NOT NULL REFERENCES beds(id),
    admitting_doctor_id UUID NOT NULL REFERENCES users(id),
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP WITH TIME ZONE,
    discharge_summary TEXT,
    status VARCHAR(30) DEFAULT 'Admitted', -- Admitted, Discharged
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 12. AUDIT LOGGING
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Nullable to capture operations before login or public portals
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- AUTO-UPDATE TRIGGER FUNCTION FOR updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_patients_modtime BEFORE UPDATE ON patients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_emergency_intakes_modtime BEFORE UPDATE ON emergency_intakes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_consultations_modtime BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_prescriptions_modtime BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_radiology_orders_modtime BEFORE UPDATE ON radiology_orders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_billing_invoices_modtime BEFORE UPDATE ON billing_invoices FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_admissions_modtime BEFORE UPDATE ON admissions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==========================================
-- SEED DATA CONFIGURATION
-- ==========================================

-- Seed Roles
INSERT INTO roles (name) VALUES 
('Super Administrator'),
('Hospital Administrator'),
('Front Desk Officer'),
('Emergency Reception Officer'),
('Emergency Nurse'),
('Emergency Doctor'),
('Laboratory Technician'),
('Laboratory Supervisor'),
('Reporting Manager')
ON CONFLICT (name) DO NOTHING;

-- Seed Departments
INSERT INTO departments (name, code) VALUES
('Pediatrics', 'PEDS'),
('General Medicine', 'GENMED'),
('Emergency Room', 'ER'),
('Clinical Laboratory', 'LAB'),
('Radiology Department', 'RAD'),
('Pharmacy', 'PHARM')
ON CONFLICT (name) DO NOTHING;

-- Seed Specializations
INSERT INTO specializations (name) VALUES
('General Physician'),
('Emergency Medicine'),
('Pediatrician'),
('Pathologist'),
('Radiologist'),
('Cardiologist')
ON CONFLICT (name) DO NOTHING;

-- Seed Insurance Providers
INSERT INTO insurance_providers (name, support_phone, email) VALUES
('Jubilee General Insurance', '021-111-654-111', 'info@jubileegeneral.com.pk'),
('Adamjee Insurance', '0800-00242', 'info@adamjeeinsurance.com'),
('EFU General Insurance', '021-32416041', 'info@efuinsurance.com'),
('State Life Insurance Corporation', '051-9206001', 'info@statelife.com.pk')
ON CONFLICT (name) DO NOTHING;

-- Seed Wards
INSERT INTO wards (name, type) VALUES
('Male General Ward', 'General Ward'),
('Female General Ward', 'General Ward'),
('ICU Block A', 'ICU'),
('CCU Heart Wing', 'CCU'),
('Maternity Ward', 'Private Ward')
ON CONFLICT (name) DO NOTHING;

-- Seed Beds for ICU Block A
INSERT INTO beds (ward_id, bed_number, status) VALUES
(3, 'ICU-B1', 'Available'),
(3, 'ICU-B2', 'Available'),
(3, 'ICU-B3', 'Occupied'),
(1, 'MGW-01', 'Available'),
(2, 'FGW-01', 'Available')
ON CONFLICT (ward_id, bed_number) DO NOTHING;

-- Seed Drug Catalogue
INSERT INTO drug_catalogue (name, generic_name, strength, form, price, stock_level, reorder_level) VALUES
('Panadol 500mg', 'Paracetamol', '500mg', 'Tablet', 2.50, 1500, 100),
('Amoxil 250mg', 'Amoxicillin', '250mg', 'Capsule', 8.00, 500, 50),
('Augmentin 625mg', 'Co-amoxiclav', '625mg', 'Tablet', 25.00, 800, 50),
('Loprin 75mg', 'Aspirin', '75mg', 'Tablet', 1.20, 2000, 200),
('Ventolin Inhaler', 'Salbutamol', '100mcg', 'Inhaler', 350.00, 60, 10),
('Flagyl 400mg', 'Metronidazole', '400mg', 'Tablet', 3.00, 1200, 100)
ON CONFLICT (name) DO NOTHING;

-- Pre-seed some default users (Note: Actual user pass hashes will be created with bcrypt in the app.
-- Here we insert temporary ones. We will seed them properly in code if they do not exist)
INSERT INTO users (id, email, password_hash, full_name, role, department_id) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@hospital.com', '$2b$12$t4zH7rD583bZ9Y.o2jH4v.i71z1e9c22222222222222222222222', 'Dr. Arthur Pendelton', 'Super Administrator', 2)
ON CONFLICT (email) DO NOTHING;
