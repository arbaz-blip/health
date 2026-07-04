// Dual-mode database layer: PostgreSQL with local file-based JSON fallback
// Supports Enterprise SaaS, local On-Premise, and hybrid cloud configurations

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcrypt';

// ==========================================
// 1. DATABASE ENTITY INTERFACES
// ==========================================

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface SystemSettings {
  hospital_name: string;
  contact_email: string;
  maintenance_mode: boolean;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  full_name: string;
  is_active: boolean;
  mfa_secret?: string | null;
  mfa_enabled?: boolean;
}

export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  cnic: string | null;
  passport_number: string | null;
  gender: string;
  dob: string;
  phone: string;
  email?: string | null;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal_code?: string | null;
  blood_group: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  consent_accepted: boolean;
  photograph_url?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  department_id: number;
  scheduled_time: string;
  status: string;
  cancellation_reason?: string | null;
  created_at: string;
}

export interface QueueItem {
  id: string;
  token_number: string;
  patient_id: string;
  department_id: number;
  doctor_id: string | null;
  status: string;
  checked_in_time: string;
  serving_time?: string | null;
  completed_time?: string | null;
}

export interface EmergencyIntake {
  id: string;
  patient_id: string | null;
  temporary_name: string | null;
  arrival_time: string;
  mode_of_arrival: string;
  ambulance_service?: string | null;
  ambulance_plate_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  initial_condition: string;
  status: string;
  created_at: string;
}

export interface EmergencyTriage {
  id: string;
  emergency_intake_id: string;
  triage_nurse_id: string;
  bp_systolic: number;
  bp_diastolic: number;
  pulse_rate: number;
  temperature_celsius: number;
  oxygen_saturation: number;
  respiratory_rate: number;
  consciousness_level: string;
  priority_level: string;
  created_at: string;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  ordering_doctor_id: string;
  status: string;
  clinical_notes?: string | null;
  created_at: string;
  verified_by?: string | null;
  verified_at?: string | null;
}

export interface LabSample {
  id: string;
  lab_order_id: string;
  sample_number: string;
  sample_type: string;
  collection_time: string;
  collector_id: string;
  status: string;
  rejection_reason?: string | null;
}

export interface LabResult {
  id: string;
  lab_order_id: string;
  test_code: string;
  test_name: string;
  result_value: string;
  reference_range: string;
  unit?: string | null;
  is_flagged_critical: boolean;
  technician_id?: string | null;
  entered_at?: string | null;
  status: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_values: string | null;
  new_values: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface ClinicalVisit {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_type: string; // 'OPD' | 'ER' | 'Follow-Up' | 'Admission'
  department_id: number;
  visit_date: string;
  chief_complaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse_rate?: number | null;
  temperature_celsius?: number | null;
  oxygen_saturation?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  follow_up_date?: string | null;
  referral_to?: string | null;
  status: string; // 'Draft' | 'Signed' | 'Amended'
  created_at: string;
  updated_at: string;
}

export interface Diagnosis {
  id: string;
  visit_id: string;
  patient_id: string;
  icd10_code: string;
  icd10_description: string;
  diagnosis_type: string; // 'Primary' | 'Secondary' | 'Differential'
  notes?: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  generic_name?: string | null;
  dosage: string;
  route: string;
  frequency: string;
  duration_days: number;
  quantity: number;
  instructions?: string | null;
  is_controlled_substance: boolean;
  status: string; // 'Active' | 'Dispensed' | 'Cancelled'
  created_at: string;
}

export interface LabTest {
  id: string;
  code: string;
  name: string;
  reference_range: string;
  unit: string;
  price: number;
}


// ==========================================
// 2. DATA ARRAYS (IN-MEMORY CACHE & FALLBACK)
// ==========================================

export let roles = [
  { id: 1, name: 'Super Administrator' },
  { id: 2, name: 'Hospital Administrator' },
  { id: 3, name: 'Front Desk Officer' },
  { id: 4, name: 'Emergency Reception Officer' },
  { id: 5, name: 'Emergency Nurse' },
  { id: 6, name: 'Emergency Doctor' },
  { id: 7, name: 'Laboratory Technician' },
  { id: 8, name: 'Laboratory Supervisor' },
  { id: 9, name: 'Reporting Manager' }
];

export let departments: Department[] = [
  { id: 1, name: 'Pediatrics', code: 'PEDS' },
  { id: 2, name: 'General Medicine', code: 'GENMED' },
  { id: 3, name: 'Emergency Room', code: 'ER' },
  { id: 4, name: 'Clinical Laboratory', code: 'LAB' },
  { id: 5, name: 'Radiology Department', code: 'RAD' },
  { id: 6, name: 'Pharmacy', code: 'PHARM' },
  { id: 7, name: 'Finance & Billing', code: 'FIN' }
];

export let systemSettings: SystemSettings = {
  hospital_name: 'PakMed Care General Hospital',
  contact_email: 'admin@pakmedcare.com.pk',
  maintenance_mode: false
};

export let users: User[] = [];
export let patients: Patient[] = [];
export let appointments: Appointment[] = [];
export let queues: QueueItem[] = [];
export let emergencyIntakes: EmergencyIntake[] = [];
export let emergencyTriages: EmergencyTriage[] = [];
export let labOrders: LabOrder[] = [];
export let labSamples: LabSample[] = [];
export let labResults: LabResult[] = [];
export let auditLogs: AuditLog[] = [];
export let clinicalVisits: ClinicalVisit[] = [];
export let diagnoses: Diagnosis[] = [];
export let prescriptions: Prescription[] = [];
export let labTestCatalog: LabTest[] = [];


// ==========================================
// 3. DATABASE INITIALIZATION & CONFIGURATION
// ==========================================

export let pool: Pool | null = null;
export let isPostgres = false;

const DATA_DIR = path.join(__dirname, '../data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

// Initialize the database connection and cache
export async function initDb(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      console.log('[DB] Attempting connection to PostgreSQL...');
      pool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000
      });
      
      // Test the connection
      await pool.query('SELECT NOW()');
      isPostgres = true;
      console.log('[DB] Successfully connected to PostgreSQL.');
      
      // Load and execute Schema SQL
      const schemaPath = path.join(__dirname, 'db/schema.sql');
      if (fs.existsSync(schemaPath)) {
        console.log('[DB] Initializing schema from schema.sql...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('[DB] Database schema and base configuration verified.');
      } else {
        console.warn(`[DB] Warning: Schema file not found at ${schemaPath}`);
      }

      // Synchronize in-memory cache from PostgreSQL
      await loadFromPostgres();
      return true;
    } catch (err) {
      console.warn('[DB] PostgreSQL connection failed or schema error. Falling back to JSON file storage.', err);
      isPostgres = false;
      pool = null;
    }
  } else {
    console.log('[DB] DATABASE_URL not set in .env. Falling back to JSON file storage.');
    isPostgres = false;
  }

  // Load from local JSON store
  loadFromJsonStore();
  return false;
}

// ==========================================
// 4. FALLBACK FILE STORE (JSON) UTILITIES
// ==========================================

function loadFromJsonStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(JSON_DB_PATH)) {
    try {
      console.log(`[DB] Loading records from local file store: ${JSON_DB_PATH}`);
      const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
      users = data.users || [];
      patients = data.patients || [];
      appointments = data.appointments || [];
      queues = data.queues || [];
      emergencyIntakes = data.emergencyIntakes || [];
      emergencyTriages = data.emergencyTriages || [];
      labOrders = data.labOrders || [];
      labSamples = data.labSamples || [];
      labResults = data.labResults || [];
      auditLogs = data.auditLogs || [];
      clinicalVisits = data.clinicalVisits || [];
      diagnoses = data.diagnoses || [];
      prescriptions = data.prescriptions || [];
      departments = data.departments || departments;
      systemSettings = data.systemSettings || systemSettings;
      labTestCatalog = data.labTestCatalog || [
        { id: 'lt1', code: 'CBC_HEMOGLOBIN', name: 'Hemoglobin Panel', reference_range: '13.8 - 17.2', unit: 'g/dL', price: 450 },
        { id: 'lt2', code: 'CBC_WBC', name: 'White Blood Cell (WBC)', reference_range: '4,500 - 11,000', unit: '/uL', price: 450 },
        { id: 'lt3', code: 'LFT_ALT', name: 'ALT (SGPT) Liver', reference_range: '7 - 56', unit: 'U/L', price: 650 },
        { id: 'lt4', code: 'TYPHOID_WIDAL', name: 'Typhoid Widal Antigen', reference_range: 'Negative', unit: 'titer', price: 800 },
        { id: 'lt5', code: 'DENGUE_NS1', name: 'Dengue NS1 Antigen', reference_range: 'Negative', unit: 'Index', price: 1500 }
      ];
      console.log('[DB] Local cache populated successfully.');
      return;
    } catch (err) {
      console.error('[DB] Error parsing db.json, generating default seeded values.', err);
    }
  }

  // Seed default demo records if no file exists
  console.log('[DB] Creating default database seed data...');
  seedDefaultData();
  saveToJsonStore();
}

export function saveToJsonStore() {
  if (isPostgres) return; // No need to save to JSON if running in Postgres mode
  
  try {
    const data = {
      users,
      patients,
      appointments,
      queues,
      emergencyIntakes,
      emergencyTriages,
      labOrders,
      labSamples,
      labResults,
      auditLogs,
      clinicalVisits,
      diagnoses,
      prescriptions,
      labTestCatalog,
      departments,
      systemSettings
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('[DB] Local JSON database saved successfully.');
  } catch (err) {
    console.error('[DB] Failed to save JSON database to file.', err);
  }
}

// Seed local arrays with starting demo accounts and patients
function seedDefaultData() {
  const saltRounds = 12;
  const hash = bcrypt.hashSync('password123', saltRounds);

  labTestCatalog = [
    { id: 'lt1', code: 'CBC_HEMOGLOBIN', name: 'Hemoglobin Panel', reference_range: '13.8 - 17.2', unit: 'g/dL', price: 450 },
    { id: 'lt2', code: 'CBC_WBC', name: 'White Blood Cell (WBC)', reference_range: '4,500 - 11,000', unit: '/uL', price: 450 },
    { id: 'lt3', code: 'LFT_ALT', name: 'ALT (SGPT) Liver', reference_range: '7 - 56', unit: 'U/L', price: 650 },
    { id: 'lt4', code: 'TYPHOID_WIDAL', name: 'Typhoid Widal Antigen', reference_range: 'Negative', unit: 'titer', price: 800 },
    { id: 'lt5', code: 'DENGUE_NS1', name: 'Dengue NS1 Antigen', reference_range: 'Negative', unit: 'Index', price: 1500 }
  ];

  users = [
    { id: '11111111-1111-1111-1111-111111111111', email: 'admin@hospital.com', password_hash: hash, role: 'Super Administrator', full_name: 'Dr. Arthur Pendelton', is_active: true },
    { id: 'u2', email: 'frontdesk@hospital.com', password_hash: hash, role: 'Front Desk Officer', full_name: 'Sarah Miller', is_active: true },
    { id: 'u3', email: 'nurse@hospital.com', password_hash: hash, role: 'Emergency Nurse', full_name: 'Jane Foster, RN', is_active: true },
    { id: 'u4', email: 'doctor@hospital.com', password_hash: hash, role: 'Emergency Doctor', full_name: 'Dr. Gregory House', is_active: true },
    { id: 'u5', email: 'tech@hospital.com', password_hash: hash, role: 'Laboratory Technician', full_name: 'Mark Ruffalo', is_active: true },
    { id: 'u6', email: 'supervisor@hospital.com', password_hash: hash, role: 'Laboratory Supervisor', full_name: 'Dr. Robert Bruce', is_active: true },
    { id: 'u7', email: 'manager@hospital.com', password_hash: hash, role: 'Reporting Manager', full_name: 'Walter White', is_active: true }
  ];

  patients = [
    {
      id: 'p1',
      mrn: 'MRN-2026-00045',
      full_name: 'John Doe',
      cnic: '42101-1234567-1',
      passport_number: null,
      gender: 'Male',
      dob: '1990-05-15',
      phone: '+923001234567',
      email: 'john.doe@email.com',
      address_street: 'Flat 204, Alpha Heights',
      address_city: 'Metropolis',
      address_state: 'Central Province',
      address_postal_code: '44000',
      blood_group: 'O+',
      emergency_contact_name: 'Mary Doe',
      emergency_contact_relation: 'Spouse',
      emergency_contact_phone: '+923001112223',
      consent_accepted: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'p2',
      mrn: 'MRN-2026-00046',
      full_name: 'Jane Watson',
      cnic: '42101-9876543-2',
      passport_number: null,
      gender: 'Female',
      dob: '1988-11-20',
      phone: '+923009876543',
      email: 'jane.watson@email.com',
      address_street: '45 Medical Avenue',
      address_city: 'Metropolis',
      address_state: 'Central Province',
      address_postal_code: '44000',
      blood_group: 'A+',
      emergency_contact_name: 'Robert Watson',
      emergency_contact_relation: 'Spouse',
      emergency_contact_phone: '+923001112223',
      consent_accepted: true,
      created_at: new Date().toISOString()
    }
  ];

  appointments = [
    { id: 'appt1', patient_id: 'p1', doctor_id: 'u4', department_id: 2, scheduled_time: new Date(Date.now() + 2 * 60 * 60000).toISOString(), status: 'Scheduled', created_at: new Date().toISOString() },
    { id: 'appt2', patient_id: 'p2', doctor_id: 'u4', department_id: 1, scheduled_time: new Date(Date.now() + 4 * 60 * 60000).toISOString(), status: 'Checked-in', created_at: new Date().toISOString() }
  ];

  queues = [
    { id: 'q1', token_number: 'GENMED-001', patient_id: 'p1', department_id: 2, doctor_id: 'u4', status: 'Serving', checked_in_time: new Date(Date.now() - 20 * 60000).toISOString(), serving_time: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: 'q2', token_number: 'PEDS-001', patient_id: 'p2', department_id: 1, doctor_id: null, status: 'Waiting', checked_in_time: new Date(Date.now() - 10 * 60000).toISOString() }
  ];

  emergencyIntakes = [
    { id: 'er1', patient_id: 'p1', temporary_name: null, arrival_time: new Date(Date.now() - 30 * 60000).toISOString(), mode_of_arrival: 'Ambulance', ambulance_service: 'Red Crescent', ambulance_plate_number: 'LE-9908', initial_condition: 'Severe chest pain, shortness of breath, diaphoresis', status: 'Waiting for Triage', created_at: new Date().toISOString() },
    { id: 'er2', patient_id: null, temporary_name: 'Unknown Male 01', arrival_time: new Date(Date.now() - 55 * 60000).toISOString(), mode_of_arrival: 'Police', initial_condition: 'Road traffic accident, multiple lacerations, semi-conscious', status: 'Triage Completed', created_at: new Date().toISOString() }
  ];

  emergencyTriages = [
    { id: 'tr1', emergency_intake_id: 'er2', triage_nurse_id: 'u3', bp_systolic: 90, bp_diastolic: 60, pulse_rate: 115, temperature_celsius: 36.8, oxygen_saturation: 92, respiratory_rate: 22, consciousness_level: 'Voice', priority_level: 'High', created_at: new Date(Date.now() - 40 * 60000).toISOString() }
  ];

  labOrders = [
    { id: 'order-001', patient_id: 'p1', ordering_doctor_id: 'u4', status: 'Ordered', clinical_notes: 'Patient presenting with fatigue and pallor. Check for anaemia.', created_at: new Date(Date.now() - 60 * 60000).toISOString() },
    { id: 'order-002', patient_id: 'p2', ordering_doctor_id: 'u4', status: 'Sample Collected', clinical_notes: 'Routine annual panel. Patient stable.', created_at: new Date(Date.now() - 90 * 60000).toISOString() },
    { id: 'order-003', patient_id: 'p1', ordering_doctor_id: 'u4', status: 'Processing', clinical_notes: 'Follow-up WBC check post-infection.', created_at: new Date(Date.now() - 120 * 60000).toISOString() }
  ];

  labSamples = [
    { id: 'sample-001', lab_order_id: 'order-002', sample_number: 'SMP-20261001', sample_type: 'Whole Blood', collection_time: new Date(Date.now() - 75 * 60000).toISOString(), collector_id: 'u5', status: 'Received' },
    { id: 'sample-002', lab_order_id: 'order-003', sample_number: 'SMP-20261002', sample_type: 'Serum', collection_time: new Date(Date.now() - 105 * 60000).toISOString(), collector_id: 'u5', status: 'Received' }
  ];

  labResults = [
    { id: 'res-001a', lab_order_id: 'order-001', test_code: 'CBC_HEMOGLOBIN', test_name: 'Hemoglobin', result_value: '', reference_range: '13.8 - 17.2', unit: 'g/dL', is_flagged_critical: false, status: 'Pending Validation' },
    { id: 'res-001b', lab_order_id: 'order-001', test_code: 'LFT_ALT', test_name: 'ALT (SGPT)', result_value: '', reference_range: '7 - 56', unit: 'U/L', is_flagged_critical: false, status: 'Pending Validation' },
    { id: 'res-002a', lab_order_id: 'order-002', test_code: 'CBC_HEMOGLOBIN', test_name: 'Hemoglobin', result_value: '', reference_range: '11.5 - 15.5', unit: 'g/dL', is_flagged_critical: false, status: 'Pending Validation' },
    { id: 'res-002b', lab_order_id: 'order-002', test_code: 'CBC_WBC', test_name: 'White Blood Cell (WBC)', result_value: '', reference_range: '4,500 - 11,000', unit: '/uL', is_flagged_critical: false, status: 'Pending Validation' },
    { id: 'res-003a', lab_order_id: 'order-003', test_code: 'CBC_WBC', test_name: 'White Blood Cell (WBC)', result_value: '13200', reference_range: '4,500 - 11,000', unit: '/uL', is_flagged_critical: true, technician_id: 'u5', entered_at: new Date(Date.now() - 30 * 60000).toISOString(), status: 'Pending Validation' }
  ];
}

// ==========================================
// 5. POSTGRES DATA SYNC & LOAD
// ==========================================

async function loadFromPostgres() {
  if (!pool) return;
  console.log('[DB] Loading records from PostgreSQL to populate application cache...');
  
  const usersRes = await pool.query('SELECT * FROM users');
  users = usersRes.rows;
  
  const patientsRes = await pool.query('SELECT * FROM patients');
  patients = patientsRes.rows;

  const apptRes = await pool.query('SELECT * FROM appointments');
  appointments = apptRes.rows;

  const queueRes = await pool.query('SELECT * FROM queue_tokens');
  queues = queueRes.rows.map(row => ({
    id: row.id,
    token_number: row.token_number,
    patient_id: row.patient_id,
    department_id: row.department_id,
    doctor_id: row.doctor_id,
    status: row.status,
    checked_in_time: row.checked_in_time.toISOString(),
    serving_time: row.serving_time ? row.serving_time.toISOString() : null,
    completed_time: row.completed_time ? row.completed_time.toISOString() : null
  }));

  const intakesRes = await pool.query('SELECT * FROM emergency_intakes');
  emergencyIntakes = intakesRes.rows;

  const triagesRes = await pool.query('SELECT * FROM emergency_triages');
  emergencyTriages = triagesRes.rows;

  const labOrdRes = await pool.query('SELECT * FROM lab_orders');
  labOrders = labOrdRes.rows;

  const labSamRes = await pool.query('SELECT * FROM lab_samples');
  labSamples = labSamRes.rows;

  const labResRes = await pool.query('SELECT * FROM lab_results');
  labResults = labResRes.rows;

  const auditRes = await pool.query('SELECT * FROM audit_logs');
  auditLogs = auditRes.rows;

  // If Postgres database is completely empty (e.g. freshly created), pre-seed it with defaults!
  if (users.length === 0) {
    console.log('[DB] PostgreSQL users table is empty. Running seeding...');
    seedDefaultData();
    await saveCacheToPostgres();
  }

  const deptRes = await pool.query('SELECT * FROM departments');
  if (deptRes.rows.length > 0) {
    departments = deptRes.rows;
  }

  console.log('[DB] Cache synchronization complete.');
}

async function saveCacheToPostgres() {
  if (!pool) return;
  console.log('[DB] Seeding PostgreSQL with cache data...');
  
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
      [u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active]
    );
  }

  for (const p of patients) {
    await pool.query(
      `INSERT INTO patients (id, mrn, full_name, cnic, passport_number, gender, dob, phone, email, address_street, address_city, address_state, address_postal_code, blood_group, emergency_contact_name, emergency_contact_relation, emergency_contact_phone, consent_accepted) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT (mrn) DO NOTHING`,
      [p.id, p.mrn, p.full_name, p.cnic, p.passport_number, p.gender, p.dob, p.phone, p.email, p.address_street, p.address_city, p.address_state, p.address_postal_code, p.blood_group, p.emergency_contact_name, p.emergency_contact_relation, p.emergency_contact_phone, p.consent_accepted]
    );
  }

  for (const app of appointments) {
    await pool.query(
      `INSERT INTO appointments (id, patient_id, doctor_id, department_id, scheduled_time, status) 
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [app.id, app.patient_id, app.doctor_id, app.department_id, app.scheduled_time, app.status]
    );
  }

  for (const q of queues) {
    await pool.query(
      `INSERT INTO queue_tokens (id, token_number, patient_id, department_id, doctor_id, status, checked_in_time, serving_time, completed_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [q.id, q.token_number, q.patient_id, q.department_id, q.doctor_id, q.status, q.checked_in_time, q.serving_time, q.completed_time]
    );
  }

  for (const e of emergencyIntakes) {
    await pool.query(
      `INSERT INTO emergency_intakes (id, patient_id, temporary_name, arrival_time, mode_of_arrival, ambulance_service, ambulance_plate_number, initial_condition, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.patient_id, e.temporary_name, e.arrival_time, e.mode_of_arrival, e.ambulance_service, e.ambulance_plate_number, e.initial_condition, e.status]
    );
  }

  for (const tr of emergencyTriages) {
    await pool.query(
      `INSERT INTO emergency_triages (id, emergency_intake_id, triage_nurse_id, bp_systolic, bp_diastolic, pulse_rate, temperature_celsius, oxygen_saturation, respiratory_rate, consciousness_level, priority_level, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
      [tr.id, tr.emergency_intake_id, tr.triage_nurse_id, tr.bp_systolic, tr.bp_diastolic, tr.pulse_rate, tr.temperature_celsius, tr.oxygen_saturation, tr.respiratory_rate, tr.consciousness_level, tr.priority_level, tr.created_at]
    );
  }

  for (const o of labOrders) {
    await pool.query(
      `INSERT INTO lab_orders (id, patient_id, ordering_doctor_id, status, clinical_notes, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [o.id, o.patient_id, o.ordering_doctor_id, o.status, o.clinical_notes, o.created_at]
    );
  }

  for (const s of labSamples) {
    await pool.query(
      `INSERT INTO lab_samples (id, lab_order_id, sample_number, sample_type, collection_time, collector_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.lab_order_id, s.sample_number, s.sample_type, s.collection_time, s.collector_id, s.status]
    );
  }

  for (const r of labResults) {
    await pool.query(
      `INSERT INTO lab_results (id, lab_order_id, test_code, test_name, result_value, reference_range, unit, is_flagged_critical, technician_id, entered_at, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.lab_order_id, r.test_code, r.test_name, r.result_value, r.reference_range, r.unit, r.is_flagged_critical, r.technician_id, r.entered_at, r.status]
    );
  }
  console.log('[DB] Seeding into Postgres complete.');
}

// ==========================================
// 6. GENERAL WRITE PERSISTENCE WRAPPERS
// ==========================================

export async function saveUser(user: User): Promise<void> {
  const index = users.findIndex(u => u.id === user.id);
  if (index !== -1) {
    users[index] = user;
  } else {
    users.push(user);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, mfa_secret, mfa_enabled) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (id) DO UPDATE 
       SET email = $2, password_hash = $3, full_name = $4, role = $5, is_active = $6, mfa_secret = $7, mfa_enabled = $8`,
      [user.id, user.email, user.password_hash, user.full_name, user.role, user.is_active, user.mfa_secret || null, user.mfa_enabled || false]
    );
  } else {
    saveToJsonStore();
  }
}

export async function savePatient(patient: Patient): Promise<void> {
  const index = patients.findIndex(p => p.id === patient.id);
  if (index !== -1) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO patients (id, mrn, full_name, cnic, passport_number, gender, dob, phone, email, address_street, address_city, address_state, address_postal_code, blood_group, emergency_contact_name, emergency_contact_relation, emergency_contact_phone, consent_accepted) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       ON CONFLICT (id) DO UPDATE 
       SET mrn = $2, full_name = $3, cnic = $4, passport_number = $5, gender = $6, dob = $7, phone = $8, email = $9, address_street = $10, address_city = $11, address_state = $12, address_postal_code = $13, blood_group = $14, emergency_contact_name = $15, emergency_contact_relation = $16, emergency_contact_phone = $17, consent_accepted = $18`,
      [patient.id, patient.mrn, patient.full_name, patient.cnic, patient.passport_number, patient.gender, patient.dob, patient.phone, patient.email || null, patient.address_street, patient.address_city, patient.address_state, patient.address_postal_code || null, patient.blood_group, patient.emergency_contact_name, patient.emergency_contact_relation, patient.emergency_contact_phone, patient.consent_accepted]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveAppointment(appt: Appointment): Promise<void> {
  const index = appointments.findIndex(a => a.id === appt.id);
  if (index !== -1) {
    appointments[index] = appt;
  } else {
    appointments.push(appt);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO appointments (id, patient_id, doctor_id, department_id, scheduled_time, status, cancellation_reason, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (id) DO UPDATE 
       SET status = $6, cancellation_reason = $7`,
      [appt.id, appt.patient_id, appt.doctor_id, appt.department_id, appt.scheduled_time, appt.status, appt.cancellation_reason || null, appt.created_at]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveQueueItem(qItem: QueueItem): Promise<void> {
  const index = queues.findIndex(q => q.id === qItem.id);
  if (index !== -1) {
    queues[index] = qItem;
  } else {
    queues.push(qItem);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO queue_tokens (id, token_number, patient_id, department_id, doctor_id, status, checked_in_time, serving_time, completed_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       ON CONFLICT (id) DO UPDATE 
       SET status = $6, serving_time = $8, completed_time = $9`,
      [qItem.id, qItem.token_number, qItem.patient_id, qItem.department_id, qItem.doctor_id, qItem.status, qItem.checked_in_time, qItem.serving_time || null, qItem.completed_time || null]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveEmergencyIntake(intake: EmergencyIntake): Promise<void> {
  const index = emergencyIntakes.findIndex(e => e.id === intake.id);
  if (index !== -1) {
    emergencyIntakes[index] = intake;
  } else {
    emergencyIntakes.push(intake);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO emergency_intakes (id, patient_id, temporary_name, arrival_time, mode_of_arrival, ambulance_service, ambulance_plate_number, emergency_contact_name, emergency_contact_phone, initial_condition, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       ON CONFLICT (id) DO UPDATE 
       SET status = $11, patient_id = $2`,
      [intake.id, intake.patient_id || null, intake.temporary_name || null, intake.arrival_time, intake.mode_of_arrival, intake.ambulance_service || null, intake.ambulance_plate_number || null, intake.emergency_contact_name || null, intake.emergency_contact_phone || null, intake.initial_condition, intake.status, intake.created_at]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveEmergencyTriage(triage: EmergencyTriage): Promise<void> {
  const index = emergencyTriages.findIndex(t => t.id === triage.id);
  if (index !== -1) {
    emergencyTriages[index] = triage;
  } else {
    emergencyTriages.push(triage);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO emergency_triages (id, emergency_intake_id, triage_nurse_id, bp_systolic, bp_diastolic, pulse_rate, temperature_celsius, oxygen_saturation, respiratory_rate, consciousness_level, priority_level, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       ON CONFLICT (id) DO NOTHING`,
      [triage.id, triage.emergency_intake_id, triage.triage_nurse_id, triage.bp_systolic, triage.bp_diastolic, triage.pulse_rate, triage.temperature_celsius, triage.oxygen_saturation, triage.respiratory_rate, triage.consciousness_level, triage.priority_level, triage.created_at]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveLabOrder(order: LabOrder): Promise<void> {
  const index = labOrders.findIndex(o => o.id === order.id);
  if (index !== -1) {
    labOrders[index] = order;
  } else {
    labOrders.push(order);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO lab_orders (id, patient_id, ordering_doctor_id, status, clinical_notes, created_at, verified_by, verified_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (id) DO UPDATE 
       SET status = $4, verified_by = $7, verified_at = $8`,
      [order.id, order.patient_id, order.ordering_doctor_id, order.status, order.clinical_notes || null, order.created_at, order.verified_by || null, order.verified_at || null]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveLabSample(sample: LabSample): Promise<void> {
  const index = labSamples.findIndex(s => s.id === sample.id);
  if (index !== -1) {
    labSamples[index] = sample;
  } else {
    labSamples.push(sample);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO lab_samples (id, lab_order_id, sample_number, sample_type, collection_time, collector_id, status, rejection_reason) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (id) DO UPDATE 
       SET status = $7, rejection_reason = $8`,
      [sample.id, sample.lab_order_id, sample.sample_number, sample.sample_type, sample.collection_time, sample.collector_id, sample.status, sample.rejection_reason || null]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveLabResult(result: LabResult): Promise<void> {
  const index = labResults.findIndex(r => r.id === result.id);
  if (index !== -1) {
    labResults[index] = result;
  } else {
    labResults.push(result);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO lab_results (id, lab_order_id, test_code, test_name, result_value, reference_range, unit, is_flagged_critical, technician_id, entered_at, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       ON CONFLICT (id) DO UPDATE 
       SET result_value = $5, is_flagged_critical = $8, technician_id = $9, entered_at = $10, status = $11`,
      [result.id, result.lab_order_id, result.test_code, result.test_name, result.result_value, result.reference_range, result.unit || null, result.is_flagged_critical, result.technician_id || null, result.entered_at || null, result.status]
    );
  } else {
    saveToJsonStore();
  }
}

export async function saveAuditLog(log: AuditLog): Promise<void> {
  auditLogs.push(log);
  
  if (isPostgres && pool) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [log.id, log.user_id, log.action, log.table_name, log.record_id, log.old_values, log.new_values, log.ip_address || null, log.created_at]
      );
    } catch (err) {
      console.error('[DB] Failed to insert SQL audit log.', err);
    }
  } else {
    saveToJsonStore();
  }
}

// Audit helper function matched to original system signature
export function logAudit(userId: string | null, action: string, tableName: string, recordId: string, oldVal: any, newVal: any) {
  const log: AuditLog = {
    id: 'log-' + Math.random().toString(36).substring(2, 9),
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldVal ? JSON.stringify(oldVal) : null,
    new_values: newVal ? JSON.stringify(newVal) : null,
    created_at: new Date().toISOString()
  };
  
  saveAuditLog(log).catch(err => {
    console.error('[DB] Error logging audit action.', err);
  });
  console.log(`[AUDIT EVENT] [${action}] ON [${tableName}] ID [${recordId}] logged.`);
}

export async function saveClinicalVisit(visit: ClinicalVisit): Promise<void> {
  const index = clinicalVisits.findIndex(v => v.id === visit.id);
  if (index !== -1) {
    clinicalVisits[index] = visit;
  } else {
    clinicalVisits.push(visit);
  }
  saveToJsonStore();
}

export async function saveDiagnosis(diag: Diagnosis): Promise<void> {
  const index = diagnoses.findIndex(d => d.id === diag.id);
  if (index !== -1) {
    diagnoses[index] = diag;
  } else {
    diagnoses.push(diag);
  }
  saveToJsonStore();
}

export async function deleteDiagnosis(id: string): Promise<void> {
  diagnoses = diagnoses.filter(d => d.id !== id);
  saveToJsonStore();
}

export async function savePrescription(rx: Prescription): Promise<void> {
  const index = prescriptions.findIndex(p => p.id === rx.id);
  if (index !== -1) {
    prescriptions[index] = rx;
  } else {
    prescriptions.push(rx);
  }
  saveToJsonStore();
}

export async function saveLabTest(test: LabTest): Promise<void> {
  const index = labTestCatalog.findIndex(t => t.id === test.id);
  if (index !== -1) {
    labTestCatalog[index] = test;
  } else {
    labTestCatalog.push(test);
  }
  saveToJsonStore();
}

export async function saveDepartment(dept: Department): Promise<void> {
  const index = departments.findIndex(d => d.id === dept.id);
  if (index !== -1) {
    departments[index] = dept;
  } else {
    departments.push(dept);
  }

  if (isPostgres && pool) {
    await pool.query(
      `INSERT INTO departments (id, name, code) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO UPDATE 
       SET name = $2, code = $3`,
      [dept.id, dept.name, dept.code]
    );
  } else {
    saveToJsonStore();
  }
}

export async function deleteDepartment(id: number): Promise<void> {
  departments = departments.filter(d => d.id !== id);
  
  if (isPostgres && pool) {
    await pool.query(`DELETE FROM departments WHERE id = $1`, [id]);
  } else {
    saveToJsonStore();
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  systemSettings = settings;
  saveToJsonStore();
}
