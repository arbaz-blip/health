import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import {
  users,
  auditLogs,
  patients,
  queues,
  emergencyIntakes,
  labOrders,
  labTestCatalog,
  saveUser,
  saveLabTest,
  logAudit,
  isPostgres,
  pool,
  User,
  LabTest
} from '../../db';

const router = Router();

// Secure all admin endpoints to Super Admin & Hospital Admin
router.use(authenticateToken);
router.use(authorizeRoles('Super Administrator', 'Hospital Administrator'));

// --- USER MANAGEMENT ---

// GET /api/v1/admin/users - Get all users (excluding password hashes)
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const safeUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    full_name: u.full_name,
    is_active: u.is_active,
    mfa_enabled: u.mfa_enabled || false
  }));
  return res.json({ status: 'success', data: safeUsers });
});

// POST /api/v1/admin/users - Create new user account
router.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ status: 'error', message: 'Email, password, full name, and role are required' });
  }

  const emailLower = email.toLowerCase();
  const exists = users.some(u => u.email.toLowerCase() === emailLower);
  if (exists) {
    return res.status(400).json({ status: 'error', message: 'User with this email already exists' });
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const newUserId = uuidv4();

  const newUser: User = {
    id: newUserId,
    email: emailLower,
    password_hash: passwordHash,
    role,
    full_name,
    is_active: true,
    mfa_enabled: false,
    mfa_secret: null
  };

  await saveUser(newUser);
  logAudit(req.user?.id || null, 'USER_REGISTER', 'users', newUserId, null, {
    email: newUser.email,
    role: newUser.role,
    full_name: newUser.full_name
  });

  return res.status(201).json({
    status: 'success',
    data: {
      id: newUserId,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.full_name,
      is_active: newUser.is_active
    }
  });
});

// PUT /api/v1/admin/users/:id - Update user details & status
router.put('/users/:id', authorizeRoles('Super Administrator'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { full_name, role, is_active, email, password } = req.body;

  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found' });
  }

  // Prevent self-deactivation or self-role change
  if (req.user?.id === id) {
    if (is_active === false) {
      return res.status(400).json({ status: 'error', message: 'You cannot deactivate your own active session' });
    }
    if (role && role !== user.role) {
      return res.status(400).json({ status: 'error', message: 'You cannot modify your own administrative role' });
    }
  }

  // Check email uniqueness if email is changed
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const emailLower = email.toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === emailLower && u.id !== id);
    if (exists) {
      return res.status(400).json({ status: 'error', message: 'User with this email already exists' });
    }
    user.email = emailLower;
  }

  const oldUser = { ...user };

  if (full_name !== undefined) user.full_name = full_name;
  if (role !== undefined) user.role = role;
  if (is_active !== undefined) user.is_active = !!is_active;

  if (password) {
    const saltRounds = 12;
    user.password_hash = await bcrypt.hash(password, saltRounds);
  }

  await saveUser(user);
  logAudit(req.user?.id || null, 'USER_UPDATE', 'users', id, {
    email: oldUser.email,
    full_name: oldUser.full_name,
    role: oldUser.role,
    is_active: oldUser.is_active
  }, {
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active
  });

  return res.json({
    status: 'success',
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active
    }
  });
});

// --- AUDIT TRAIL MONITORING ---

// GET /api/v1/admin/audit-logs - Retrieve all system audit logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const sortedLogs = [...auditLogs].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const logsWithUsers = sortedLogs.map(log => {
    const operator = users.find(u => u.id === log.user_id);
    return {
      ...log,
      operator_name: operator ? operator.full_name : (log.user_id ? 'Unknown Staff' : 'System Agent'),
      operator_role: operator ? operator.role : 'System'
    };
  });

  return res.json({ status: 'success', data: logsWithUsers });
});

// --- LAB CATALOG MANAGEMENT ---

// GET /api/v1/admin/lab-tests - Get lab investigations catalog
router.get('/lab-tests', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ status: 'success', data: labTestCatalog });
});

// POST /api/v1/admin/lab-tests - Add new lab test to catalog
router.post('/lab-tests', async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, reference_range, unit, price } = req.body;

  if (!code || !name || !reference_range || price === undefined) {
    return res.status(400).json({ status: 'error', message: 'Code, Name, Reference Range and Price are required' });
  }

  const exists = labTestCatalog.some(t => t.code.toUpperCase() === code.toUpperCase());
  if (exists) {
    return res.status(400).json({ status: 'error', message: 'Test with this code already exists in catalog' });
  }

  const newTestId = 'lt-' + Math.random().toString(36).substring(2, 9);
  const newTest: LabTest = {
    id: newTestId,
    code: code.toUpperCase(),
    name,
    reference_range,
    unit: unit || '',
    price: Number(price)
  };

  await saveLabTest(newTest);
  logAudit(req.user?.id || null, 'LAB_TEST_CATALOG_ADD', 'lab_test_catalog', newTestId, null, newTest);

  return res.status(201).json({ status: 'success', data: newTest });
});

// PUT /api/v1/admin/lab-tests/:id - Edit catalog lab test details
router.put('/lab-tests/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, reference_range, unit, price } = req.body;

  const test = labTestCatalog.find(t => t.id === id);
  if (!test) {
    return res.status(404).json({ status: 'error', message: 'Laboratory test not found in catalog' });
  }

  const oldTest = { ...test };

  if (name !== undefined) test.name = name;
  if (reference_range !== undefined) test.reference_range = reference_range;
  if (unit !== undefined) test.unit = unit;
  if (price !== undefined) test.price = Number(price);

  await saveLabTest(test);
  logAudit(req.user?.id || null, 'LAB_TEST_CATALOG_UPDATE', 'lab_test_catalog', id, oldTest, test);

  return res.json({ status: 'success', data: test });
});

// --- SYSTEM HEALTH DIAGNOSTICS ---

// GET /api/v1/admin/system-health - Diagnostics & metrics dashboard
router.get('/system-health', (req: AuthenticatedRequest, res: Response) => {
  const memUsage = process.memoryUsage();
  
  // Calculate simulated CPU load
  const simulatedCpu = Math.floor(Math.random() * 8) + 3; // 3% to 10%
  
  const healthData = {
    uptime: Math.floor(process.uptime()),
    database: {
      type: isPostgres ? 'PostgreSQL' : 'JSON File Cache Store',
      status: 'Connected',
      active_connections: isPostgres && pool ? 1 : 0
    },
    system: {
      memory_heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      memory_heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      memory_rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      cpu_usage_percent: simulatedCpu,
      node_version: process.version,
      platform: process.platform
    },
    aggregates: {
      total_users: users.length,
      total_patients: patients.length,
      total_queues: queues.length,
      total_emergency: emergencyIntakes.length,
      total_lab_orders: labOrders.length,
      total_audit_logs: auditLogs.length
    }
  };

  return res.json({ status: 'success', data: healthData });
});

// --- DEPARTMENT MANAGEMENT ---

router.get('/departments', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ status: 'success', data: require('../../db').departments });
});

router.post('/departments', authorizeRoles('Super Administrator'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ status: 'error', message: 'Name and Code required' });
  
  const depts = require('../../db').departments;
  const exists = depts.some((d: any) => d.code === code);
  if (exists) return res.status(400).json({ status: 'error', message: 'Department code already exists' });
  
  const newDept = { id: Date.now(), name, code: code.toUpperCase() };
  await require('../../db').saveDepartment(newDept);
  
  require('../../db').logAudit(req.user?.id || null, 'DEPARTMENT_CREATE', 'departments', String(newDept.id), null, newDept);
  return res.status(201).json({ status: 'success', data: newDept });
});

router.put('/departments/:id', authorizeRoles('Super Administrator'), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { name, code } = req.body;
  const depts = require('../../db').departments;
  const dept = depts.find((d: any) => d.id === id);
  if (!dept) return res.status(404).json({ status: 'error', message: 'Department not found' });
  
  const oldDept = { ...dept };
  if (name) dept.name = name;
  if (code) dept.code = code.toUpperCase();
  
  await require('../../db').saveDepartment(dept);
  require('../../db').logAudit(req.user?.id || null, 'DEPARTMENT_UPDATE', 'departments', String(id), oldDept, dept);
  
  return res.json({ status: 'success', data: dept });
});

router.delete('/departments/:id', authorizeRoles('Super Administrator'), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  await require('../../db').deleteDepartment(id);
  require('../../db').logAudit(req.user?.id || null, 'DEPARTMENT_DELETE', 'departments', String(id), null, null);
  return res.json({ status: 'success', message: 'Department deleted successfully' });
});

// --- GLOBAL SYSTEM SETTINGS ---

router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ status: 'success', data: require('../../db').systemSettings });
});

router.put('/settings', authorizeRoles('Super Administrator'), async (req: AuthenticatedRequest, res: Response) => {
  const { hospital_name, contact_email, maintenance_mode } = req.body;
  const currentSettings = require('../../db').systemSettings;
  
  const newSettings = {
    ...currentSettings,
    hospital_name: hospital_name !== undefined ? hospital_name : currentSettings.hospital_name,
    contact_email: contact_email !== undefined ? contact_email : currentSettings.contact_email,
    maintenance_mode: maintenance_mode !== undefined ? maintenance_mode : currentSettings.maintenance_mode
  };
  
  await require('../../db').saveSystemSettings(newSettings);
  require('../../db').logAudit(req.user?.id || null, 'SYSTEM_SETTINGS_UPDATE', 'system_settings', 'global', currentSettings, newSettings);
  
  return res.json({ status: 'success', data: newSettings });
});

// --- GLOBAL PATIENT DATABASE ---

router.get('/patients', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ status: 'success', data: require('../../db').patients });
});

export default router;
