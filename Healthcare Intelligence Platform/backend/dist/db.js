"use strict";
// In-memory relational data store matching the PostgreSQL schema
// Designed to fallback gracefully and run out-of-the-box for instant demonstration
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.labResults = exports.labSamples = exports.labOrders = exports.emergencyTriages = exports.emergencyIntakes = exports.queues = exports.appointments = exports.patients = exports.users = exports.departments = exports.roles = void 0;
exports.logAudit = logAudit;
// In-Memory Tables Setup
exports.roles = [
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
exports.departments = [
    { id: 1, name: 'Pediatrics', code: 'PEDS' },
    { id: 2, name: 'General Medicine', code: 'GENMED' },
    { id: 3, name: 'Emergency Room', code: 'ER' },
    { id: 4, name: 'Clinical Laboratory', code: 'LAB' }
];
// Predefined Users with roles (Password is plain-checked for simplicity: "password123")
exports.users = [
    { id: 'u1', email: 'admin@hospital.com', password_hash: 'password123', role: 'Super Administrator', full_name: 'Dr. Arthur Pendelton', is_active: true },
    { id: 'u2', email: 'frontdesk@hospital.com', password_hash: 'password123', role: 'Front Desk Officer', full_name: 'Sarah Miller', is_active: true },
    { id: 'u3', email: 'nurse@hospital.com', password_hash: 'password123', role: 'Emergency Nurse', full_name: 'Jane Foster, RN', is_active: true },
    { id: 'u4', email: 'doctor@hospital.com', password_hash: 'password123', role: 'Emergency Doctor', full_name: 'Dr. Gregory House', is_active: true },
    { id: 'u5', email: 'tech@hospital.com', password_hash: 'password123', role: 'Laboratory Technician', full_name: 'Mark Ruffalo', is_active: true },
    { id: 'u6', email: 'supervisor@hospital.com', password_hash: 'password123', role: 'Laboratory Supervisor', full_name: 'Dr. Robert Bruce', is_active: true },
    { id: 'u7', email: 'manager@hospital.com', password_hash: 'password123', role: 'Reporting Manager', full_name: 'Walter White', is_active: true }
];
// Mock database initial contents
exports.patients = [
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
exports.appointments = [];
exports.queues = [];
exports.emergencyIntakes = [
    {
        id: 'er1',
        patient_id: 'p1',
        temporary_name: null,
        arrival_time: new Date(Date.now() - 30 * 60000).toISOString(),
        mode_of_arrival: 'Ambulance',
        ambulance_service: 'Red Crescent',
        ambulance_plate_number: 'LE-9908',
        initial_condition: 'Severe chest pain, short of breath',
        status: 'Waiting for Triage',
        created_at: new Date().toISOString()
    }
];
exports.emergencyTriages = [];
exports.labOrders = [];
exports.labSamples = [];
exports.labResults = [];
exports.auditLogs = [];
// Helper functions for logging transactions
function logAudit(userId, action, tableName, recordId, oldVal, newVal) {
    const log = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        user_id: userId,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldVal ? JSON.stringify(oldVal) : null,
        new_values: newVal ? JSON.stringify(newVal) : null,
        created_at: new Date().toISOString()
    };
    exports.auditLogs.push(log);
    console.log(`[SQL AUDIT TRIGGER] [${action}] ON [${tableName}] ID [${recordId}] logged.`);
}
