import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import {
  clinicalVisits, diagnoses, prescriptions, patients, users, departments,
  saveClinicalVisit, saveDiagnosis, deleteDiagnosis, savePrescription,
  ClinicalVisit, Diagnosis, Prescription, logAudit
} from '../../db';

const router = Router();

// All EMR routes require authentication
router.use(authenticateToken as any);

// ─── ICD-10 Code Database (Pakistan-relevant) ─────────────────────────────────

const ICD10_CODES = [
  { code: 'A01.0', description: 'Typhoid fever' },
  { code: 'A90',   description: 'Dengue fever (classic)' },
  { code: 'A91',   description: 'Dengue haemorrhagic fever' },
  { code: 'B50.0', description: 'Malaria due to Plasmodium falciparum' },
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified' },
  { code: 'A09',   description: 'Gastroenteritis and colitis of unspecified origin' },
  { code: 'A05.9', description: 'Bacterial foodborne intoxication, unspecified' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified (URTI)' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'J22',   description: 'Unspecified acute lower respiratory infection' },
  { code: 'J45.9', description: 'Asthma, unspecified' },
  { code: 'A15.0', description: 'Tuberculosis of lung (PTB)' },
  { code: 'A15.9', description: 'Respiratory tuberculosis, unspecified' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications' },
  { code: 'E11.5', description: 'Type 2 diabetes mellitus with peripheral circulatory complications' },
  { code: 'I10',   description: 'Essential (primary) hypertension' },
  { code: 'I25.1', description: 'Atherosclerotic heart disease (Coronary Artery Disease)' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified (Heart Attack)' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified (Ischaemic stroke)' },
  { code: 'K29.7', description: 'Gastritis, unspecified' },
  { code: 'K92.1', description: 'Melaena (GI bleed — lower)' },
  { code: 'K80.2', description: 'Calculus of gallbladder with acute cholecystitis' },
  { code: 'K35.9', description: 'Acute appendicitis, unspecified' },
  { code: 'N39.0', description: 'Urinary tract infection (UTI), unspecified site' },
  { code: 'D50.9', description: 'Iron deficiency anaemia, unspecified' },
  { code: 'D64.9', description: 'Anaemia, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'S09.9', description: 'Unspecified injury of head (Head trauma)' },
  { code: 'R50.9', description: 'Fever, unspecified (Pyrexia of unknown origin)' },
  { code: 'R05',   description: 'Cough' },
  { code: 'R07.9', description: 'Chest pain, unspecified' },
  { code: 'R51',   description: 'Headache' },
  { code: 'R55',   description: 'Syncope and collapse' },
  { code: 'F32.9', description: 'Depressive episode, unspecified' },
  { code: 'F41.1', description: 'Generalised anxiety disorder (GAD)' },
  { code: 'Z23',   description: 'Encounter for immunization / vaccination' },
  { code: 'Z00.0', description: 'General adult medical examination' },
  { code: 'O80',   description: 'Encounter for full-term uncomplicated delivery' },
  { code: 'O82',   description: 'Encounter for caesarean delivery' },
];

// ─── Helper: enrich visit with patient/doctor/department details ──────────────

function enrichVisit(visit: ClinicalVisit) {
  const patient = patients.find(p => p.id === visit.patient_id);
  const doctor  = users.find(u => u.id === visit.doctor_id);
  const dept    = departments.find(d => d.id === visit.department_id);

  const visitDiagnoses    = diagnoses.filter(d => d.visit_id === visit.id);
  const visitPrescriptions = prescriptions.filter(r => r.visit_id === visit.id);

  return {
    ...visit,
    patient_name:    patient?.full_name || null,
    mrn:             patient?.mrn || null,
    doctor_name:     doctor?.full_name || null,
    department_name: dept?.name || null,
    diagnoses:       visitDiagnoses,
    prescriptions:   visitPrescriptions
  };
}

// ─── Generate a simple unique ID ──────────────────────────────────────────────
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/emr/icd10/search?q=
 * Public ICD-10 code search (authenticated users only)
 */
router.get('/icd10/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }
  const results = ICD10_CODES.filter(
    c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  ).slice(0, 12);
  return res.json({ success: true, data: results });
});

/**
 * GET /api/v1/emr/visits?patient_id=xxx
 * Returns all visits for a patient, newest first, with diagnoses & prescriptions nested
 */
router.get('/visits', (req: Request, res: Response) => {
  const patientId = String(req.query.patient_id || '').trim();
  if (!patientId) {
    return res.status(400).json({ success: false, message: 'patient_id query param is required.' });
  }

  const patientVisits = clinicalVisits
    .filter(v => v.patient_id === patientId)
    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
    .map(enrichVisit);

  return res.json({ success: true, data: patientVisits });
});

/**
 * POST /api/v1/emr/visits
 * Create a new clinical visit / SOAP note (Doctor or Admin)
 */
router.post(
  '/visits',
  authorizeRoles('Emergency Doctor', 'Super Administrator', 'Hospital Administrator') as any,
  async (req: Request, res: Response) => {
    const {
      patient_id, visit_type, department_id, chief_complaint,
      subjective, objective, assessment, plan,
      bp_systolic, bp_diastolic, pulse_rate, temperature_celsius,
      oxygen_saturation, weight_kg, height_cm,
      follow_up_date, referral_to
    } = req.body;

    if (!patient_id || !chief_complaint || !subjective || !objective || !assessment || !plan) {
      return res.status(400).json({ success: false, message: 'Required fields: patient_id, chief_complaint, subjective, objective, assessment, plan.' });
    }

    const doctor = (req as any).user;
    const now = new Date().toISOString();

    const visit: ClinicalVisit = {
      id: genId('visit'),
      patient_id,
      doctor_id: doctor.id,
      visit_type: visit_type || 'OPD',
      department_id: Number(department_id) || 2,
      visit_date: now,
      chief_complaint,
      subjective,
      objective,
      assessment,
      plan,
      bp_systolic:         bp_systolic != null ? Number(bp_systolic) : null,
      bp_diastolic:        bp_diastolic != null ? Number(bp_diastolic) : null,
      pulse_rate:          pulse_rate != null ? Number(pulse_rate) : null,
      temperature_celsius: temperature_celsius != null ? Number(temperature_celsius) : null,
      oxygen_saturation:   oxygen_saturation != null ? Number(oxygen_saturation) : null,
      weight_kg:           weight_kg != null ? Number(weight_kg) : null,
      height_cm:           height_cm != null ? Number(height_cm) : null,
      follow_up_date: follow_up_date || null,
      referral_to:    referral_to || null,
      status: 'Draft',
      created_at: now,
      updated_at: now
    };

    await saveClinicalVisit(visit);
    logAudit(doctor.id, 'CREATE', 'clinical_visits', visit.id, null, visit);

    return res.status(201).json({ success: true, data: enrichVisit(visit) });
  }
);

/**
 * PUT /api/v1/emr/visits/:id
 * Update a visit (sign, amend, or edit while Draft)
 */
router.put(
  '/visits/:id',
  authorizeRoles('Emergency Doctor', 'Super Administrator', 'Hospital Administrator') as any,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const visit = clinicalVisits.find(v => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found.' });
    }

    const doctor = (req as any).user;
    const allowedFields = [
      'status', 'subjective', 'objective', 'assessment', 'plan',
      'chief_complaint', 'follow_up_date', 'referral_to',
      'bp_systolic', 'bp_diastolic', 'pulse_rate', 'temperature_celsius',
      'oxygen_saturation', 'weight_kg', 'height_cm'
    ];

    const updated: ClinicalVisit = { ...visit };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (updated as any)[field] = req.body[field];
      }
    }
    updated.updated_at = new Date().toISOString();

    // When signing: lock the note
    if (req.body.status === 'Signed') {
      updated.status = 'Signed';
    }

    await saveClinicalVisit(updated);
    logAudit(doctor.id, 'UPDATE', 'clinical_visits', id, visit, updated);

    return res.json({ success: true, data: enrichVisit(updated) });
  }
);

/**
 * POST /api/v1/emr/diagnoses
 * Add a diagnosis to a visit
 */
router.post(
  '/diagnoses',
  authorizeRoles('Emergency Doctor', 'Super Administrator', 'Hospital Administrator') as any,
  async (req: Request, res: Response) => {
    const { visit_id, patient_id, icd10_code, icd10_description, diagnosis_type, notes } = req.body;
    if (!visit_id || !patient_id || !icd10_code || !icd10_description) {
      return res.status(400).json({ success: false, message: 'Required: visit_id, patient_id, icd10_code, icd10_description.' });
    }

    const visit = clinicalVisits.find(v => v.id === visit_id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });
    if (visit.status === 'Signed') return res.status(403).json({ success: false, message: 'Cannot modify a signed visit.' });

    const diag: Diagnosis = {
      id: genId('dx'),
      visit_id,
      patient_id,
      icd10_code,
      icd10_description,
      diagnosis_type: diagnosis_type || 'Primary',
      notes: notes || null,
      created_at: new Date().toISOString()
    };

    await saveDiagnosis(diag);
    logAudit((req as any).user.id, 'CREATE', 'diagnoses', diag.id, null, diag);

    return res.status(201).json({ success: true, data: diag });
  }
);

/**
 * DELETE /api/v1/emr/diagnoses/:id
 * Remove a diagnosis
 */
router.delete(
  '/diagnoses/:id',
  authorizeRoles('Emergency Doctor', 'Super Administrator', 'Hospital Administrator') as any,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const diag = diagnoses.find(d => d.id === id);
    if (!diag) return res.status(404).json({ success: false, message: 'Diagnosis not found.' });

    await deleteDiagnosis(id);
    logAudit((req as any).user.id, 'DELETE', 'diagnoses', id, diag, null);

    return res.json({ success: true, message: 'Diagnosis removed.' });
  }
);

/**
 * POST /api/v1/emr/prescriptions
 * Write a prescription linked to a visit
 */
router.post(
  '/prescriptions',
  authorizeRoles('Emergency Doctor', 'Super Administrator', 'Hospital Administrator') as any,
  async (req: Request, res: Response) => {
    const {
      visit_id, patient_id, medication_name, generic_name,
      dosage, route, frequency, duration_days, quantity,
      instructions, is_controlled_substance
    } = req.body;

    if (!visit_id || !patient_id || !medication_name || !dosage || !route || !frequency) {
      return res.status(400).json({ success: false, message: 'Required: visit_id, patient_id, medication_name, dosage, route, frequency.' });
    }

    const visit = clinicalVisits.find(v => v.id === visit_id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });
    if (visit.status === 'Signed') return res.status(403).json({ success: false, message: 'Cannot add prescription to a signed visit.' });

    const doctor = (req as any).user;

    const rx: Prescription = {
      id: genId('rx'),
      visit_id,
      patient_id,
      doctor_id: doctor.id,
      medication_name,
      generic_name: generic_name || null,
      dosage,
      route,
      frequency,
      duration_days: Number(duration_days) || 5,
      quantity: Number(quantity) || 1,
      instructions: instructions || null,
      is_controlled_substance: Boolean(is_controlled_substance),
      status: 'Active',
      created_at: new Date().toISOString()
    };

    await savePrescription(rx);
    logAudit(doctor.id, 'CREATE', 'prescriptions', rx.id, null, rx);

    return res.status(201).json({ success: true, data: rx });
  }
);

/**
 * PUT /api/v1/emr/prescriptions/:id
 * Update prescription status (e.g. Dispensed, Cancelled)
 */
router.put(
  '/prescriptions/:id',
  authorizeRoles('Emergency Doctor', 'Super Administrator', 'Hospital Administrator') as any,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const rx = prescriptions.find(p => p.id === id);
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });

    const updated: Prescription = { ...rx, status: req.body.status || rx.status };
    await savePrescription(updated);
    logAudit((req as any).user.id, 'UPDATE', 'prescriptions', id, rx, updated);

    return res.json({ success: true, data: updated });
  }
);

export default router;
