import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import {
  labOrders,
  labSamples,
  labResults,
  patients,
  users,
  saveLabOrder,
  saveLabSample,
  saveLabResult,
  logAudit,
  LabOrder,
  LabSample,
  LabResult,
  labTestCatalog
} from '../../db';

const router = Router();

// GET /api/v1/laboratory/test-catalog - Get available tests catalog
router.get('/test-catalog', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ status: 'success', data: labTestCatalog });
});

// GET /api/v1/laboratory/orders - Get all laboratory orders and test results
router.get('/orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const list = labOrders.map(order => {
    const patient = patients.find(p => p.id === order.patient_id);
    const doctor = users.find(u => u.id === order.ordering_doctor_id);
    const samples = labSamples.filter(s => s.lab_order_id === order.id);
    const results = labResults.filter(r => r.lab_order_id === order.id);
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

// POST /api/v1/laboratory/orders - Create laboratory order
router.post(
  '/orders', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Emergency Doctor', 'Laboratory Technician', 'Laboratory Supervisor'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { patient_id, tests, clinical_notes } = req.body;

    if (!patient_id || !tests || !Array.isArray(tests)) {
      return res.status(400).json({ status: 'error', message: 'Patient and tests array required' });
    }

    const orderId = 'order-' + Math.random().toString(36).substring(2, 9);
    const newOrder: LabOrder = {
      id: orderId,
      patient_id,
      ordering_doctor_id: req.user?.id || 'doctor-0',
      status: 'Ordered',
      clinical_notes: clinical_notes || null,
      created_at: new Date().toISOString()
    };

    await saveLabOrder(newOrder);
    logAudit(req.user?.id || null, 'LAB_ORDER_CREATE', 'lab_orders', orderId, null, newOrder);

    // Auto-generate result placeholders based on test codes
    for (const test of tests) {
      const resultId = 'res-' + Math.random().toString(36).substring(2, 9);
      const catalogTest = labTestCatalog.find(t => t.code === test);
      
      const testName = catalogTest ? catalogTest.name : test;
      const refRange = catalogTest ? catalogTest.reference_range : 'Normal';
      const unit = catalogTest ? catalogTest.unit : '';

      const newResult: LabResult = {
        id: resultId,
        lab_order_id: orderId,
        test_code: test,
        test_name: testName,
        result_value: '',
        reference_range: refRange,
        unit: unit || null,
        is_flagged_critical: false,
        status: 'Pending Validation'
      };
      await saveLabResult(newResult);
    }

    return res.status(201).json({ status: 'success', lab_order_id: orderId });
  }
);

// PUT /api/v1/laboratory/samples/collect - Log specimen collection
router.put(
  '/samples/collect', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Laboratory Technician'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { lab_order_id, sample_number, sample_type } = req.body;

    if (!lab_order_id || !sample_number || !sample_type) {
      return res.status(400).json({ status: 'error', message: 'Order ID, sample number, and sample type required' });
    }

    const order = labOrders.find(o => o.id === lab_order_id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Lab order not found' });
    }

    const sampleId = 'sample-' + Math.random().toString(36).substring(2, 9);
    const newSample: LabSample = {
      id: sampleId,
      lab_order_id,
      sample_number,
      sample_type,
      collection_time: new Date().toISOString(),
      collector_id: req.user?.id || 'tech-0',
      status: 'Collected'
    };

    await saveLabSample(newSample);
    
    const oldOrder = { ...order };
    order.status = 'Sample Collected';
    await saveLabOrder(order);

    logAudit(req.user?.id || null, 'LAB_SAMPLE_COLLECT', 'lab_samples', sampleId, null, newSample);
    logAudit(req.user?.id || null, 'LAB_ORDER_UPDATE', 'lab_orders', order.id, oldOrder, order);

    return res.json({ status: 'success', message: 'Sample collection logged successfully' });
  }
);

// POST /api/v1/laboratory/results - Submit test results
router.post(
  '/results', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Laboratory Technician'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { lab_order_id, results } = req.body;

    if (!lab_order_id || !results || !Array.isArray(results)) {
      return res.status(400).json({ status: 'error', message: 'Order ID and results array required' });
    }

    const order = labOrders.find(o => o.id === lab_order_id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Lab order not found' });
    }

    const oldOrder = { ...order };
    order.status = 'Processing';
    await saveLabOrder(order);

    for (const resItem of results) {
      const existing = labResults.find(r => r.lab_order_id === lab_order_id && r.test_code === resItem.test_code);
      if (existing) {
        const oldRes = { ...existing };
        existing.result_value = String(resItem.result_value);
        existing.is_flagged_critical = !!resItem.is_flagged_critical;
        existing.technician_id = req.user?.id;
        existing.entered_at = new Date().toISOString();
        
        await saveLabResult(existing);
        logAudit(req.user?.id || null, 'LAB_RESULT_INPUT', 'lab_results', existing.id, oldRes, existing);
      }
    }

    logAudit(req.user?.id || null, 'LAB_ORDER_UPDATE', 'lab_orders', order.id, oldOrder, order);

    return res.json({ status: 'success', message: 'Results submitted for verification' });
  }
);

// PUT /api/v1/laboratory/results/verify - Pathologist review and approval
router.put(
  '/results/verify', 
  authenticateToken,
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Laboratory Supervisor'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { lab_order_id, action, rejection_reason } = req.body;

    if (!lab_order_id || !action) {
      return res.status(400).json({ status: 'error', message: 'Order ID and action required' });
    }

    const order = labOrders.find(o => o.id === lab_order_id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Lab order not found' });
    }

    const results = labResults.filter(r => r.lab_order_id === lab_order_id);
    const oldOrder = { ...order };

    if (action === 'APPROVE') {
      order.status = 'Verified';
      order.verified_by = req.user?.id;
      order.verified_at = new Date().toISOString();
      await saveLabOrder(order);

      for (const r of results) {
        r.status = 'Approved';
        await saveLabResult(r);
      }
      logAudit(req.user?.id || null, 'LAB_RESULTS_VERIFIED', 'lab_results', lab_order_id, null, { status: 'Approved' });
    } else {
      order.status = 'Ordered'; // Reset status to re-enter
      await saveLabOrder(order);

      for (const r of results) {
        r.status = 'Rejected';
        // Re-cast to extend rejection details
        (r as any).rejection_reason = rejection_reason;
        await saveLabResult(r);
      }
      logAudit(req.user?.id || null, 'LAB_RESULTS_REJECTED', 'lab_results', lab_order_id, null, { status: 'Rejected', reason: rejection_reason });
    }

    logAudit(req.user?.id || null, 'LAB_ORDER_UPDATE', 'lab_orders', order.id, oldOrder, order);

    return res.json({ status: 'success', message: `Results ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully` });
  }
);

export default router;
