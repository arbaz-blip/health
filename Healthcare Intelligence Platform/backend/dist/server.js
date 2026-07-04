"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_12345';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Logger Middleware
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Access Token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    }
};
// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }
    const user = db_1.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password_hash !== password) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
    // Sign Token
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '2h' });
    (0, db_1.logAudit)(user.id, 'LOGIN', 'users', user.id, null, { email: user.email });
    return res.json({
        status: 'success',
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name
        }
    });
});
// --- PATIENT REGISTRATION ENDPOINTS ---
app.get('/api/v1/patients', authenticateToken, (req, res) => {
    const q = req.query.q;
    if (!q) {
        return res.json({ status: 'success', data: db_1.patients });
    }
    const query = q.toLowerCase();
    const filtered = db_1.patients.filter(p => p.mrn.toLowerCase().includes(query) ||
        (p.cnic && p.cnic.includes(query)) ||
        p.phone.includes(query) ||
        p.full_name.toLowerCase().includes(query));
    return res.json({ status: 'success', data: filtered });
});
app.post('/api/v1/patients', authenticateToken, (req, res) => {
    const { full_name, cnic, passport_number, gender, dob, phone, email, address_street, address_city, address_state, address_postal_code, blood_group, emergency_contact_name, emergency_contact_relation, emergency_contact_phone, consent_accepted } = req.body;
    if (!full_name || !gender || !dob || !phone || !consent_accepted) {
        return res.status(400).json({ status: 'error', message: 'Missing required registration fields' });
    }
    // Generate unique MRN
    const sequence = String(db_1.patients.length + 45).padStart(5, '0');
    const mrn = `MRN-2026-${sequence}`;
    const id = 'p-' + Math.random().toString(36).substring(2, 9);
    const newPatient = {
        id,
        mrn,
        full_name,
        cnic: cnic || null,
        passport_number: passport_number || null,
        gender,
        dob,
        phone,
        email,
        address_street,
        address_city,
        address_state,
        address_postal_code,
        blood_group: blood_group || 'Unknown',
        emergency_contact_name,
        emergency_contact_relation,
        emergency_contact_phone,
        consent_accepted,
        created_at: new Date().toISOString()
    };
    db_1.patients.push(newPatient);
    (0, db_1.logAudit)(req.user?.id || null, 'PATIENT_CREATE', 'patients', id, null, newPatient);
    return res.status(201).json({
        status: 'success',
        message: 'Patient registered successfully',
        data: newPatient
    });
});
// --- APPOINTMENTS ENDPOINTS ---
app.get('/api/v1/appointments', authenticateToken, (req, res) => {
    const list = db_1.appointments.map(appt => {
        const patient = db_1.patients.find(p => p.id === appt.patient_id);
        const doctor = db_1.users.find(u => u.id === appt.doctor_id);
        const dept = db_1.departments.find(d => d.id === appt.department_id);
        return {
            ...appt,
            patient_name: patient?.full_name || 'Unknown',
            doctor_name: doctor?.full_name || 'Unknown',
            department_name: dept?.name || 'Unknown'
        };
    });
    return res.json({ status: 'success', data: list });
});
app.post('/api/v1/appointments', authenticateToken, (req, res) => {
    const { patient_id, doctor_id, department_id, scheduled_time } = req.body;
    if (!patient_id || !doctor_id || !department_id || !scheduled_time) {
        return res.status(400).json({ status: 'error', message: 'Missing scheduling fields' });
    }
    const id = 'appt-' + Math.random().toString(36).substring(2, 9);
    const newAppt = {
        id,
        patient_id,
        doctor_id,
        department_id: Number(department_id),
        scheduled_time,
        status: 'Scheduled',
        created_at: new Date().toISOString()
    };
    db_1.appointments.push(newAppt);
    (0, db_1.logAudit)(req.user?.id || null, 'APPOINTMENT_CREATE', 'appointments', id, null, newAppt);
    return res.status(201).json({
        status: 'success',
        message: 'Appointment scheduled successfully',
        data: newAppt
    });
});
// --- QUEUE MANAGEMENT ENDPOINTS ---
app.get('/api/v1/queues', authenticateToken, (req, res) => {
    const list = db_1.queues.map(q => {
        const patient = db_1.patients.find(p => p.id === q.patient_id);
        const doctor = db_1.users.find(u => u.id === q.doctor_id);
        const dept = db_1.departments.find(d => d.id === q.department_id);
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
app.post('/api/v1/queues/token', authenticateToken, (req, res) => {
    const { patient_id, department_id, doctor_id } = req.body;
    if (!patient_id || !department_id) {
        return res.status(400).json({ status: 'error', message: 'Patient and department required' });
    }
    const dept = db_1.departments.find(d => d.id === Number(department_id));
    const deptCode = dept ? dept.code : 'GEN';
    const deptQueueCount = db_1.queues.filter(q => q.department_id === Number(department_id)).length;
    const token_number = `${deptCode}-${String(deptQueueCount + 1).padStart(3, '0')}`;
    const id = 'q-' + Math.random().toString(36).substring(2, 9);
    const newQueue = {
        id,
        token_number,
        patient_id,
        department_id: Number(department_id),
        doctor_id: doctor_id || null,
        status: 'Waiting',
        checked_in_time: new Date().toISOString()
    };
    db_1.queues.push(newQueue);
    (0, db_1.logAudit)(req.user?.id || null, 'QUEUE_TOKEN_GEN', 'queues', id, null, newQueue);
    return res.status(201).json({
        status: 'success',
        data: newQueue
    });
});
app.put('/api/v1/queues/:id', authenticateToken, (req, res) => {
    const { status } = req.body;
    const qItem = db_1.queues.find(q => q.id === req.params.id);
    if (!qItem) {
        return res.status(404).json({ status: 'error', message: 'Queue item not found' });
    }
    const oldVal = { ...qItem };
    qItem.status = status;
    if (status === 'Serving') {
        qItem.serving_time = new Date().toISOString();
    }
    else if (status === 'Completed') {
        qItem.completed_time = new Date().toISOString();
    }
    (0, db_1.logAudit)(req.user?.id || null, 'QUEUE_STATUS_UPDATE', 'queues', qItem.id, oldVal, qItem);
    return res.json({ status: 'success', data: qItem });
});
// --- EMERGENCY ENDPOINTS ---
app.get('/api/v1/emergency/intakes', authenticateToken, (req, res) => {
    const list = db_1.emergencyIntakes.map(e => {
        const patient = db_1.patients.find(p => p.id === e.patient_id);
        const triage = db_1.emergencyTriages.find(t => t.emergency_intake_id === e.id);
        return {
            ...e,
            patient_name: patient ? patient.full_name : e.temporary_name,
            mrn: patient ? patient.mrn : 'TEMP-ID',
            triage: triage || null
        };
    });
    return res.json({ status: 'success', data: list });
});
app.post('/api/v1/emergency/intake', authenticateToken, (req, res) => {
    const { temporary_name, mode_of_arrival, ambulance_service, ambulance_plate_number, initial_condition, emergency_contact_name, emergency_contact_phone } = req.body;
    if (!mode_of_arrival || !initial_condition) {
        return res.status(400).json({ status: 'error', message: 'Mode of arrival and initial condition required' });
    }
    const id = 'er-' + Math.random().toString(36).substring(2, 9);
    const newIntake = {
        id,
        patient_id: null,
        temporary_name: temporary_name || `Unknown Patient ${String(db_1.emergencyIntakes.length + 1).padStart(2, '0')}`,
        arrival_time: new Date().toISOString(),
        mode_of_arrival,
        ambulance_service,
        ambulance_plate_number,
        emergency_contact_name,
        emergency_contact_phone,
        initial_condition,
        status: 'Waiting for Triage',
        created_at: new Date().toISOString()
    };
    db_1.emergencyIntakes.push(newIntake);
    (0, db_1.logAudit)(req.user?.id || null, 'EMERGENCY_INTAKE', 'emergency_intakes', id, null, newIntake);
    return res.status(201).json({ status: 'success', data: newIntake });
});
app.post('/api/v1/emergency/triage', authenticateToken, (req, res) => {
    const { emergency_intake_id, bp_systolic, bp_diastolic, pulse_rate, temperature_celsius, oxygen_saturation, respiratory_rate, consciousness_level, priority_level } = req.body;
    const intake = db_1.emergencyIntakes.find(e => e.id === emergency_intake_id);
    if (!intake) {
        return res.status(404).json({ status: 'error', message: 'Emergency intake record not found' });
    }
    const id = 'tr-' + Math.random().toString(36).substring(2, 9);
    const newTriage = {
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
    db_1.emergencyTriages.push(newTriage);
    const oldIntake = { ...intake };
    intake.status = 'Triage Completed';
    (0, db_1.logAudit)(req.user?.id || null, 'EMERGENCY_TRIAGE', 'emergency_triages', id, null, newTriage);
    (0, db_1.logAudit)(req.user?.id || null, 'EMERGENCY_STATUS_UPDATE', 'emergency_intakes', intake.id, oldIntake, intake);
    return res.status(201).json({ status: 'success', data: newTriage });
});
app.put('/api/v1/emergency/intake/:id', authenticateToken, (req, res) => {
    const { status, patient_id } = req.body;
    const intake = db_1.emergencyIntakes.find(e => e.id === req.params.id);
    if (!intake) {
        return res.status(404).json({ status: 'error', message: 'Record not found' });
    }
    const oldVal = { ...intake };
    intake.status = status;
    if (patient_id) {
        intake.patient_id = patient_id;
    }
    (0, db_1.logAudit)(req.user?.id || null, 'EMERGENCY_STATUS_UPDATE', 'emergency_intakes', intake.id, oldVal, intake);
    return res.json({ status: 'success', data: intake });
});
// --- LABORATORY LIMS ENDPOINTS ---
app.get('/api/v1/laboratory/orders', authenticateToken, (req, res) => {
    const list = db_1.labOrders.map(order => {
        const patient = db_1.patients.find(p => p.id === order.patient_id);
        const doctor = db_1.users.find(u => u.id === order.ordering_doctor_id);
        const samples = db_1.labSamples.filter(s => s.lab_order_id === order.id);
        const results = db_1.labResults.filter(r => r.lab_order_id === order.id);
        return {
            ...order,
            patient_name: patient?.full_name || 'Unknown',
            mrn: patient?.mrn || 'Unknown',
            doctor_name: doctor?.full_name || 'Unknown',
            samples,
            results
        };
    });
    return res.json({ status: 'success', data: list });
});
app.post('/api/v1/laboratory/orders', authenticateToken, (req, res) => {
    const { patient_id, tests, clinical_notes } = req.body;
    if (!patient_id || !tests || !Array.isArray(tests)) {
        return res.status(400).json({ status: 'error', message: 'Patient and tests array required' });
    }
    const orderId = 'order-' + Math.random().toString(36).substring(2, 9);
    const newOrder = {
        id: orderId,
        patient_id,
        ordering_doctor_id: req.user?.id || 'doctor-0',
        status: 'Ordered',
        clinical_notes,
        created_at: new Date().toISOString()
    };
    db_1.labOrders.push(newOrder);
    (0, db_1.logAudit)(req.user?.id || null, 'LAB_ORDER_CREATE', 'lab_orders', orderId, null, newOrder);
    // Auto-generate result placeholders based on test codes
    tests.forEach((test) => {
        const resultId = 'res-' + Math.random().toString(36).substring(2, 9);
        let testName = test;
        let refRange = 'Normal';
        let unit = '';
        if (test === 'CBC_HEMOGLOBIN') {
            testName = 'Hemoglobin';
            refRange = '13.8 - 17.2';
            unit = 'g/dL';
        }
        else if (test === 'CBC_WBC') {
            testName = 'White Blood Cell (WBC)';
            refRange = '4,500 - 11,000';
            unit = '/uL';
        }
        else if (test === 'LFT_ALT') {
            testName = 'ALT (SGPT)';
            refRange = '7 - 56';
            unit = 'U/L';
        }
        const newResult = {
            id: resultId,
            lab_order_id: orderId,
            test_code: test,
            test_name: testName,
            result_value: '',
            reference_range: refRange,
            unit,
            is_flagged_critical: false,
            status: 'Pending Validation'
        };
        db_1.labResults.push(newResult);
    });
    return res.status(201).json({ status: 'success', lab_order_id: orderId });
});
app.put('/api/v1/laboratory/samples/collect', authenticateToken, (req, res) => {
    const { lab_order_id, sample_number, sample_type } = req.body;
    if (!lab_order_id || !sample_number || !sample_type) {
        return res.status(400).json({ status: 'error', message: 'Order ID, sample number, and sample type required' });
    }
    const order = db_1.labOrders.find(o => o.id === lab_order_id);
    if (!order) {
        return res.status(404).json({ status: 'error', message: 'Lab order not found' });
    }
    const sampleId = 'sample-' + Math.random().toString(36).substring(2, 9);
    const newSample = {
        id: sampleId,
        lab_order_id,
        sample_number,
        sample_type,
        collection_time: new Date().toISOString(),
        collector_id: req.user?.id || 'tech-0',
        status: 'Collected'
    };
    db_1.labSamples.push(newSample);
    const oldOrder = { ...order };
    order.status = 'Sample Collected';
    (0, db_1.logAudit)(req.user?.id || null, 'LAB_SAMPLE_COLLECT', 'lab_samples', sampleId, null, newSample);
    (0, db_1.logAudit)(req.user?.id || null, 'LAB_ORDER_UPDATE', 'lab_orders', order.id, oldOrder, order);
    return res.json({ status: 'success', message: 'Sample collection logged successfully' });
});
app.post('/api/v1/laboratory/results', authenticateToken, (req, res) => {
    const { lab_order_id, results } = req.body;
    if (!lab_order_id || !results || !Array.isArray(results)) {
        return res.status(400).json({ status: 'error', message: 'Order ID and results array required' });
    }
    const order = db_1.labOrders.find(o => o.id === lab_order_id);
    if (!order) {
        return res.status(404).json({ status: 'error', message: 'Lab order not found' });
    }
    const oldOrder = { ...order };
    order.status = 'Processing';
    results.forEach((resItem) => {
        const existing = db_1.labResults.find(r => r.lab_order_id === lab_order_id && r.test_code === resItem.test_code);
        if (existing) {
            const oldRes = { ...existing };
            existing.result_value = String(resItem.result_value);
            existing.is_flagged_critical = !!resItem.is_flagged_critical;
            existing.technician_id = req.user?.id;
            existing.entered_at = new Date().toISOString();
            (0, db_1.logAudit)(req.user?.id || null, 'LAB_RESULT_INPUT', 'lab_results', existing.id, oldRes, existing);
        }
    });
    (0, db_1.logAudit)(req.user?.id || null, 'LAB_ORDER_UPDATE', 'lab_orders', order.id, oldOrder, order);
    return res.json({ status: 'success', message: 'Results submitted for verification' });
});
app.put('/api/v1/laboratory/results/verify', authenticateToken, (req, res) => {
    const { lab_order_id, action, rejection_reason } = req.body;
    if (!lab_order_id || !action) {
        return res.status(400).json({ status: 'error', message: 'Order ID and action required' });
    }
    const order = db_1.labOrders.find(o => o.id === lab_order_id);
    if (!order) {
        return res.status(404).json({ status: 'error', message: 'Lab order not found' });
    }
    const results = db_1.labResults.filter(r => r.lab_order_id === lab_order_id);
    const oldOrder = { ...order };
    if (action === 'APPROVE') {
        order.status = 'Verified';
        results.forEach(r => {
            r.status = 'Approved';
            r.supervisor_id = req.user?.id;
            r.verified_at = new Date().toISOString();
        });
        (0, db_1.logAudit)(req.user?.id || null, 'LAB_RESULTS_VERIFIED', 'lab_results', lab_order_id, null, { status: 'Approved' });
    }
    else {
        order.status = 'Ordered'; // reset back to enter results again
        results.forEach(r => {
            r.status = 'Rejected';
            r.rejection_reason = rejection_reason;
        });
        (0, db_1.logAudit)(req.user?.id || null, 'LAB_RESULTS_REJECTED', 'lab_results', lab_order_id, null, { status: 'Rejected', reason: rejection_reason });
    }
    (0, db_1.logAudit)(req.user?.id || null, 'LAB_ORDER_UPDATE', 'lab_orders', order.id, oldOrder, order);
    return res.json({ status: 'success', message: `Results ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully` });
});
// --- ANALYTICS & DASHBOARD ENDPOINTS ---
app.get('/api/v1/reports/executive-dashboard', authenticateToken, (req, res) => {
    const totalPatients = db_1.patients.length;
    const activeQueues = db_1.queues.length;
    // Calculate mock or real statistics from local store
    const criticalCases = db_1.emergencyIntakes.filter(e => {
        const triage = db_1.emergencyTriages.find(t => t.emergency_intake_id === e.id);
        return triage?.priority_level === 'Critical' && e.status !== 'Discharged';
    }).length;
    return res.json({
        status: 'success',
        data: {
            total_patients: totalPatients,
            daily_registrations: { count: db_1.patients.length, change_pct: 12.5 },
            emergency_visits: { count: db_1.emergencyIntakes.length, change_pct: -4.2 },
            laboratory_tests: { count: db_1.labOrders.length, change_pct: 8.1 },
            avg_waiting_minutes: 14.5,
            avg_emergency_response_minutes: 5.8,
            active_queues: activeQueues,
            critical_cases: criticalCases,
            top_tests: [
                { name: 'Complete Blood Count (CBC)', count: 18 },
                { name: 'ALT Liver Panel', count: 12 },
                { name: 'Basic Metabolic Panel', count: 8 }
            ],
            triage_breakdown: {
                critical: db_1.emergencyTriages.filter(t => t.priority_level === 'Critical').length || 2,
                high: db_1.emergencyTriages.filter(t => t.priority_level === 'High').length || 4,
                medium: db_1.emergencyTriages.filter(t => t.priority_level === 'Medium').length || 5,
                low: db_1.emergencyTriages.filter(t => t.priority_level === 'Low').length || 3
            }
        }
    });
});
app.listen(PORT, () => {
    console.log(`[HIP SERVER] Server listening on port ${PORT}`);
});
