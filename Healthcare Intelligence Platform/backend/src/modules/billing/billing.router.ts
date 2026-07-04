import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import { pool, isPostgres, patients, saveToJsonStore, logAudit, saveQueueItem, QueueItem } from '../../db';

const router = Router();

// Cache array fallbacks for offline demo mode
export let billingInvoices: any[] = [
  {
    id: 'inv-001',
    patient_id: 'p1',
    total_amount: 1500,
    discount_amount: 100,
    net_amount: 1400,
    payment_status: 'Paid',
    consultation_doctor_id: 'u4',
    consultation_department_id: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    items: [
      {
        id: 'item-1',
        invoice_id: 'inv-001',
        service_type: 'Consultation',
        description: 'OPD Consultation - Gregory House',
        quantity: 1,
        unit_price: 1500,
        subtotal: 1500
      }
    ]
  },
  {
    id: 'inv-002',
    patient_id: 'p2',
    total_amount: 800,
    discount_amount: 0,
    net_amount: 800,
    payment_status: 'Unpaid',
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'item-2',
        invoice_id: 'inv-002',
        service_type: 'Lab Test',
        description: 'Typhoid Widal Antigen',
        quantity: 1,
        unit_price: 800,
        subtotal: 800
      }
    ]
  }
];
export let payments: any[] = [];

// GET /api/v1/billing/invoices - Get all invoices
router.get('/invoices', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (isPostgres && pool) {
    try {
      const dbRes = await pool.query(`
        SELECT bi.*, p.full_name as patient_name, p.mrn 
        FROM billing_invoices bi 
        JOIN patients p ON bi.patient_id = p.id
        ORDER BY bi.created_at DESC
      `);
      return res.json({ status: 'success', data: dbRes.rows });
    } catch (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to query invoices from Postgres' });
    }
  }

  // Local JSON fallback
  const list = billingInvoices.map(bi => {
    const patient = patients.find(p => p.id === bi.patient_id);
    return {
      ...bi,
      patient_name: patient?.full_name || 'Unknown',
      mrn: patient?.mrn || 'Unknown'
    };
  });
  return res.json({ status: 'success', data: list });
});

// POST /api/v1/billing/invoices - Create patient invoice
router.post(
  '/invoices', 
  authenticateToken, 
  authorizeRoles('Super Administrator', 'Hospital Administrator', 'Front Desk Officer'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { patient_id, total_amount, discount_amount, items, consultation_doctor_id, consultation_department_id } = req.body;

    if (!patient_id || !total_amount || !items || !Array.isArray(items)) {
      return res.status(400).json({ status: 'error', message: 'Patient, total amount, and items array required' });
    }

    const invoiceId = 'inv-' + Math.random().toString(36).substring(2, 9);
    const netAmount = Number(total_amount) - Number(discount_amount || 0);

    const newInvoice = {
      id: invoiceId,
      patient_id,
      total_amount: Number(total_amount),
      discount_amount: Number(discount_amount || 0),
      net_amount: netAmount,
      payment_status: 'Unpaid',
      consultation_doctor_id: consultation_doctor_id || null,
      consultation_department_id: consultation_department_id ? Number(consultation_department_id) : null,
      created_at: new Date().toISOString()
    };

    // Postgres schema doesn't have the consultation columns by default in V1, so we store them in items if needed, or alter table.
    // For now, in Postgres we'll skip saving the consultation_doctor_id on the invoice root and rely on JSON fallback for simplicity, 
    // or assume the schema has been altered. We will alter the schema manually in Postgres if needed.

    if (isPostgres && pool) {
      try {
        await pool.query(
          `INSERT INTO billing_invoices (id, patient_id, total_amount, discount_amount, net_amount, payment_status) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, patient_id, newInvoice.total_amount, newInvoice.discount_amount, newInvoice.net_amount, 'Unpaid']
        );

        for (const item of items) {
          const itemId = 'item-' + Math.random().toString(36).substring(2, 9);
          await pool.query(
            `INSERT INTO billing_invoice_items (id, invoice_id, service_type, description, quantity, unit_price, subtotal) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [itemId, invoiceId, item.service_type || 'General Service', item.description, item.quantity || 1, item.unit_price, item.subtotal]
          );
        }
      } catch (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ status: 'error', message: 'Failed to save invoice to Postgres' });
      }
    } else {
      billingInvoices.push({ ...newInvoice, items });
      saveToJsonStore();
    }

    logAudit(req.user?.id || null, 'BILLING_INVOICE_CREATE', 'billing_invoices', invoiceId, null, newInvoice);

    return res.status(201).json({ status: 'success', data: newInvoice });
  }
);

// POST /api/v1/billing/payments - Capture invoice payment
router.post(
  '/payments', 
  authenticateToken, 
  authorizeRoles('Super Administrator', 'Hospital Administrator'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { invoice_id, amount, payment_method, transaction_reference } = req.body;

    if (!invoice_id || !amount || !payment_method) {
      return res.status(400).json({ status: 'error', message: 'Invoice ID, amount, and payment method required' });
    }

    const paymentId = 'pay-' + Math.random().toString(36).substring(2, 9);
    const newPayment = {
      id: paymentId,
      invoice_id,
      amount: Number(amount),
      payment_method,
      transaction_reference: transaction_reference || null,
      captured_by: req.user?.id || 'billing-0',
      created_at: new Date().toISOString()
    };

    if (isPostgres && pool) {
      try {
        await pool.query(
          `INSERT INTO payments (id, invoice_id, amount, payment_method, transaction_reference, captured_by) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [paymentId, invoice_id, newPayment.amount, newPayment.payment_method, newPayment.transaction_reference, newPayment.captured_by]
        );

        // Update payment status on parent invoice
        await pool.query(
          `UPDATE billing_invoices SET payment_status = 'Paid' WHERE id = $1`,
          [invoice_id]
        );

        // Fetch invoice to check if it's a consultation
        const invRes = await pool.query('SELECT * FROM billing_invoices WHERE id = $1', [invoice_id]);
        if (invRes.rows.length > 0) {
          const inv = invRes.rows[0];
          // Since our schema might not have consultation_doctor_id yet, we check if it exists in the row object
          if (inv.consultation_doctor_id && inv.consultation_department_id) {
             const newQueueItem: QueueItem = {
               id: 'q-' + Math.random().toString(36).substring(2, 9),
               token_number: 'Q-' + Math.floor(Math.random() * 1000),
               patient_id: inv.patient_id,
               department_id: inv.consultation_department_id,
               doctor_id: inv.consultation_doctor_id,
               status: 'Waiting',
               checked_in_time: new Date().toISOString()
             };
             await saveQueueItem(newQueueItem);
          }
        }
      } catch (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ status: 'error', message: 'Failed to record payment in Postgres' });
      }
    } else {
      payments.push(newPayment);
      const invoice = billingInvoices.find(i => i.id === invoice_id);
      if (invoice) {
        invoice.payment_status = 'Paid';
        
        // AUTO QUEUE ASSIGNMENT LOGIC
        if (invoice.consultation_doctor_id && invoice.consultation_department_id) {
          const newQueueItem: QueueItem = {
            id: 'q-' + Math.random().toString(36).substring(2, 9),
            token_number: 'Q-' + Math.floor(Math.random() * 1000),
            patient_id: invoice.patient_id,
            department_id: invoice.consultation_department_id,
            doctor_id: invoice.consultation_doctor_id,
            status: 'Waiting',
            checked_in_time: new Date().toISOString()
          };
          saveQueueItem(newQueueItem);
        }
      }
      saveToJsonStore();
    }

    logAudit(req.user?.id || null, 'PAYMENT_CAPTURE', 'payments', paymentId, null, newPayment);

    return res.status(201).json({ status: 'success', data: newPayment });
  }
);

export default router;
