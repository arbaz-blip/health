import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import {
  emergencyIntakes,
  emergencyTriages,
  patients,
  saveEmergencyIntake,
  saveEmergencyTriage,
  logAudit,
  EmergencyIntake,
  EmergencyTriage
} from '../../db';

const router = Router();

// GET /api/v1/emergency/intakes - List emergency room intakes
router.get('/intakes', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const list = emergencyIntakes.map(e => {
    const patient = patients.find(p => p.id === e.patient_id);
    const triage = emergencyTriages.find(t => t.emergency_intake_id === e.id);
    return {
      ...e,
      patient_name: patient ? patient.full_name : e.temporary_name,
      mrn: patient ? patient.mrn : 'TEMP-ID',
      triage: triage || null
    };
  });
  return res.json({ status: 'success', data: list });
});

// POST /api/v1/emergency/intake - Register emergency intake
router.post(
  '/intake', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Emergency Reception Officer', 'Emergency Nurse'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { temporary_name, mode_of_arrival, ambulance_service, ambulance_plate_number, initial_condition, emergency_contact_name, emergency_contact_phone } = req.body;

    if (!mode_of_arrival || !initial_condition) {
      return res.status(400).json({ status: 'error', message: 'Mode of arrival and initial condition required' });
    }

    const id = 'er-' + Math.random().toString(36).substring(2, 9);
    const newIntake: EmergencyIntake = {
      id,
      patient_id: null,
      temporary_name: temporary_name || `Unknown Patient ${String(emergencyIntakes.length + 1).padStart(2, '0')}`,
      arrival_time: new Date().toISOString(),
      mode_of_arrival,
      ambulance_service: ambulance_service || null,
      ambulance_plate_number: ambulance_plate_number || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      initial_condition,
      status: 'Waiting for Triage',
      created_at: new Date().toISOString()
    };

    await saveEmergencyIntake(newIntake);
    logAudit(req.user?.id || null, 'EMERGENCY_INTAKE', 'emergency_intakes', id, null, newIntake);

    return res.status(201).json({ status: 'success', data: newIntake });
  }
);

// POST /api/v1/emergency/triage - Record emergency triage vitals & priority
router.post(
  '/triage', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Emergency Nurse'),
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      emergency_intake_id,
      bp_systolic,
      bp_diastolic,
      pulse_rate,
      temperature_celsius,
      oxygen_saturation,
      respiratory_rate,
      consciousness_level,
      priority_level
    } = req.body;

    const intake = emergencyIntakes.find(e => e.id === emergency_intake_id);
    if (!intake) {
      return res.status(404).json({ status: 'error', message: 'Emergency intake record not found' });
    }

    const id = 'tr-' + Math.random().toString(36).substring(2, 9);
    const newTriage: EmergencyTriage = {
      id,
      emergency_intake_id,
      triage_nurse_id: req.user?.id || 'nurse-0',
      bp_systolic: Number(bp_systolic),
      bp_diastolic: Number(bp_diastolic),
      pulse_rate: Number(pulse_rate),
      temperature_celsius: Number(temperature_celsius),
      oxygen_saturation: Number(oxygen_saturation),
      respiratory_rate: Number(respiratory_rate),
      consciousness_level,
      priority_level,
      created_at: new Date().toISOString()
    };

    await saveEmergencyTriage(newTriage);
    
    const oldIntake = { ...intake };
    intake.status = 'Triage Completed';
    await saveEmergencyIntake(intake);
    
    logAudit(req.user?.id || null, 'EMERGENCY_TRIAGE', 'emergency_triages', id, null, newTriage);
    logAudit(req.user?.id || null, 'EMERGENCY_STATUS_UPDATE', 'emergency_intakes', intake.id, oldIntake, intake);

    return res.status(201).json({ status: 'success', data: newTriage });
  }
);

// PUT /api/v1/emergency/intake/:id - Update emergency status or link patient
router.put(
  '/intake/:id', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Emergency Nurse', 'Emergency Doctor'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, patient_id } = req.body;
    const intake = emergencyIntakes.find(e => e.id === req.params.id);

    if (!intake) {
      return res.status(404).json({ status: 'error', message: 'Record not found' });
    }

    const oldVal = { ...intake };
    intake.status = status;
    if (patient_id) {
      intake.patient_id = patient_id;
    }

    await saveEmergencyIntake(intake);
    logAudit(req.user?.id || null, 'EMERGENCY_STATUS_UPDATE', 'emergency_intakes', intake.id, oldVal, intake);

    return res.json({ status: 'success', data: intake });
  }
);

export default router;
