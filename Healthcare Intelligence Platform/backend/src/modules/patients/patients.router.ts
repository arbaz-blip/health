import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import {
  patients,
  appointments,
  queues,
  users,
  departments,
  savePatient,
  saveAppointment,
  saveQueueItem,
  logAudit,
  Patient,
  Appointment,
  QueueItem
} from '../../db';

const router = Router();

// --- PATIENTS ---

// GET /api/v1/patients - Search patients
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const q = req.query.q as string;
  
  if (!q) {
    return res.json({ status: 'success', data: patients });
  }

  const query = q.toLowerCase();
  const filtered = patients.filter(p => 
    p.mrn.toLowerCase().includes(query) ||
    (p.cnic && p.cnic.includes(query)) ||
    p.phone.includes(query) ||
    p.full_name.toLowerCase().includes(query)
  );

  return res.json({ status: 'success', data: filtered });
});

// POST /api/v1/patients - Register new patient
router.post(
  '/', 
  authenticateToken, 
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Front Desk Officer', 'Emergency Reception Officer'),
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      full_name,
      cnic,
      passport_number,
      gender,
      dob,
      phone,
      email,
      address_street,
      address_city,
      address_state,
      address_postal_code,
      blood_group,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_phone,
      consent_accepted
    } = req.body;

    if (!full_name || !gender || !dob || !phone || !consent_accepted) {
      return res.status(400).json({ status: 'error', message: 'Missing required registration fields' });
    }

    // Generate unique MRN (Medical Record Number)
    const sequence = String(patients.length + 45).padStart(5, '0');
    const mrn = `MRN-2026-${sequence}`;
    const id = 'p-' + Math.random().toString(36).substring(2, 9);

    const newPatient: Patient = {
      id,
      mrn,
      full_name,
      cnic: cnic || null,
      passport_number: passport_number || null,
      gender,
      dob,
      phone,
      email: email || null,
      address_street,
      address_city,
      address_state,
      address_postal_code: address_postal_code || null,
      blood_group: blood_group || 'Unknown',
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_phone,
      consent_accepted,
      created_at: new Date().toISOString()
    };

    // Save using database helper to trigger SQL / JSON persistence
    await savePatient(newPatient);
    logAudit(req.user?.id || null, 'PATIENT_CREATE', 'patients', id, null, newPatient);

    return res.status(201).json({
      status: 'success',
      message: 'Patient registered successfully',
      data: newPatient
    });
  }
);

// --- APPOINTMENTS ---

// GET /api/v1/patients/appointments - List appointments
router.get('/appointments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const list = appointments.map(appt => {
    const patient = patients.find(p => p.id === appt.patient_id);
    const doctor = users.find(u => u.id === appt.doctor_id);
    const dept = departments.find(d => d.id === appt.department_id);
    return {
      ...appt,
      patient_name: patient?.full_name || 'Unknown',
      doctor_name: doctor?.full_name || 'Unknown',
      department_name: dept?.name || 'Unknown'
    };
  });
  return res.json({ status: 'success', data: list });
});

// POST /api/v1/patients/appointments - Book appointment
router.post(
  '/appointments', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Front Desk Officer'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { patient_id, doctor_id, department_id, scheduled_time } = req.body;

    if (!patient_id || !doctor_id || !department_id || !scheduled_time) {
      return res.status(400).json({ status: 'error', message: 'Missing scheduling fields' });
    }

    const id = 'appt-' + Math.random().toString(36).substring(2, 9);
    const newAppt: Appointment = {
      id,
      patient_id,
      doctor_id,
      department_id: Number(department_id),
      scheduled_time,
      status: 'Scheduled',
      created_at: new Date().toISOString()
    };

    await saveAppointment(newAppt);
    logAudit(req.user?.id || null, 'APPOINTMENT_CREATE', 'appointments', id, null, newAppt);

    return res.status(201).json({
      status: 'success',
      message: 'Appointment scheduled successfully',
      data: newAppt
    });
  }
);

// --- QUEUE MANAGEMENT ---

// GET /api/v1/patients/queues - List tokens
router.get('/queues', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const list = queues.map(q => {
    const patient = patients.find(p => p.id === q.patient_id);
    const doctor = users.find(u => u.id === q.doctor_id);
    const dept = departments.find(d => d.id === q.department_id);
    return {
      ...q,
      patient_name: patient?.full_name || 'Unknown',
      mrn: patient?.mrn || '',
      doctor_name: doctor?.full_name || 'Generic Queue',
      department_name: dept?.name || 'Unknown'
    };
  });
  return res.json({ status: 'success', data: list });
});

// POST /api/v1/patients/queues/token - Generate a queue token
router.post(
  '/queues/token', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Front Desk Officer', 'Emergency Reception Officer'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { patient_id, department_id, doctor_id } = req.body;

    if (!patient_id || !department_id) {
      return res.status(400).json({ status: 'error', message: 'Patient and department required' });
    }

    const dept = departments.find(d => d.id === Number(department_id));
    const deptCode = dept ? dept.code : 'GEN';
    
    const deptQueueCount = queues.filter(q => q.department_id === Number(department_id)).length;
    const token_number = `${deptCode}-${String(deptQueueCount + 1).padStart(3, '0')}`;
    
    const id = 'q-' + Math.random().toString(36).substring(2, 9);
    const newQueue: QueueItem = {
      id,
      token_number,
      patient_id,
      department_id: Number(department_id),
      doctor_id: doctor_id || null,
      status: 'Waiting',
      checked_in_time: new Date().toISOString()
    };

    await saveQueueItem(newQueue);
    logAudit(req.user?.id || null, 'QUEUE_TOKEN_GEN', 'queues', id, null, newQueue);

    return res.status(201).json({
      status: 'success',
      data: newQueue
    });
  }
);

// PUT /api/v1/patients/queues/:id - Update queue status
router.put(
  '/queues/:id', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Front Desk Officer', 'Emergency Nurse', 'Emergency Doctor', 'Laboratory Technician'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const qItem = queues.find(q => q.id === req.params.id);

    if (!qItem) {
      return res.status(404).json({ status: 'error', message: 'Queue item not found' });
    }

    const oldVal = { ...qItem };
    qItem.status = status;

    if (status === 'Serving') {
      qItem.serving_time = new Date().toISOString();
    } else if (status === 'Completed') {
      qItem.completed_time = new Date().toISOString();
    }

    await saveQueueItem(qItem);
    logAudit(req.user?.id || null, 'QUEUE_STATUS_UPDATE', 'queues', qItem.id, oldVal, qItem);

    return res.json({ status: 'success', data: qItem });
  }
);

export default router;
