import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, CheckCircle, Coins, Eye, Printer,
  X, Building2, Phone, MapPin, Mail, FileText, Trash2
} from 'lucide-react';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
  service_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  patient_id: string;
  patient_name: string;
  mrn: string;
  total_amount: number;
  discount_amount: number;
  net_amount: number;
  payment_status: 'Paid' | 'Unpaid';
  created_at: string;
  items?: InvoiceItem[];
}

// ─── Printable Invoice Component ─────────────────────────────────────────────
// This is purely a display component rendered inside the preview modal.
// All print-specific styles are scoped using the `.print-area` class
// and `@media print` rules injected in index.css.

function PrintableInvoice({ invoice }: { invoice: Invoice }) {
  const items: InvoiceItem[] = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [
        { service_type: 'Consultation', description: 'Consultation Fee', quantity: 1, unit_price: invoice.total_amount, subtotal: invoice.total_amount }
      ];

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const taxRate = 0; // GST 0% — adjust if applicable
  const taxAmount = Math.round(subtotal * taxRate);
  const discountAmount = invoice.discount_amount || 0;
  const netPayable = subtotal + taxAmount - discountAmount;

  const formattedDate = new Date(invoice.created_at).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const formattedTime = new Date(invoice.created_at).toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit'
  });

  // Generate a readable invoice number from the ID
  const invoiceNumber = `INV-${invoice.id.replace('inv-', '').toUpperCase()}`;

  return (
    <div className="print-area bg-white text-gray-900 font-sans" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between pb-6 border-b-2 border-cyan-600 mb-6">
        <div className="flex items-center gap-4">
          {/* Hospital Logo Placeholder */}
          <div className="w-16 h-16 bg-cyan-600 rounded-xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            P
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">PakMed Care HMS</h1>
            <p className="text-sm text-cyan-700 font-semibold">Healthcare Intelligence Platform</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Plot 42, Block 7, PECHS, Karachi</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +92-21-34501234</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> billing@pakmedcare.com</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block px-4 py-2 bg-cyan-600 text-white font-extrabold text-lg rounded-lg tracking-wide shadow">
            TAX INVOICE
          </div>
          <div className="mt-3 space-y-1 text-xs text-gray-600">
            <div className="flex justify-end gap-2">
              <span className="text-gray-400 font-medium">Invoice No:</span>
              <span className="font-extrabold text-gray-900">{invoiceNumber}</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-400 font-medium">Date:</span>
              <span className="font-semibold">{formattedDate}</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-400 font-medium">Time:</span>
              <span className="font-semibold">{formattedTime}</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-400 font-medium">Status:</span>
              <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] uppercase ${
                invoice.payment_status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {invoice.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BILL-TO SECTION ── */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 mb-2">Bill To — Patient</p>
          <p className="font-extrabold text-gray-900 text-base">{invoice.patient_name}</p>
          <p className="text-xs text-gray-500 mt-1 font-mono">MRN: <span className="font-bold text-gray-700">{invoice.mrn}</span></p>
          <p className="text-xs text-gray-500 mt-0.5">Patient ID: <span className="font-semibold text-gray-700">{invoice.patient_id}</span></p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 mb-2">Issuing Facility</p>
          <p className="font-extrabold text-gray-900 text-base">PakMed Care Hospital</p>
          <p className="text-xs text-gray-500 mt-1">NTN: <span className="font-semibold text-gray-700">3456789-0</span></p>
          <p className="text-xs text-gray-500 mt-0.5">STRN: <span className="font-semibold text-gray-700">12-34-5678-001-26</span></p>
          <p className="text-xs text-gray-500 mt-0.5">License: <span className="font-semibold text-gray-700">PMDC/H/2022/1048</span></p>
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <table className="w-full mb-6 text-sm border-collapse">
        <thead>
          <tr className="bg-cyan-600 text-white">
            <th className="py-3 px-4 text-left font-bold text-xs uppercase tracking-wide rounded-tl-lg">#</th>
            <th className="py-3 px-4 text-left font-bold text-xs uppercase tracking-wide">Service Type</th>
            <th className="py-3 px-4 text-left font-bold text-xs uppercase tracking-wide">Description</th>
            <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wide">Qty</th>
            <th className="py-3 px-4 text-right font-bold text-xs uppercase tracking-wide">Unit Price</th>
            <th className="py-3 px-4 text-right font-bold text-xs uppercase tracking-wide rounded-tr-lg">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={idx}
              className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <td className="py-3 px-4 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
              <td className="py-3 px-4">
                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px] font-bold border border-cyan-200">
                  {item.service_type}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-800 font-medium">{item.description}</td>
              <td className="py-3 px-4 text-center text-gray-700 font-semibold">{item.quantity}</td>
              <td className="py-3 px-4 text-right font-mono text-gray-700">Rs. {item.unit_price.toLocaleString()}</td>
              <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">Rs. {item.subtotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTALS SECTION ── */}
      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm text-gray-600 py-1.5 border-b border-gray-100">
            <span>Subtotal</span>
            <span className="font-semibold font-mono">Rs. {subtotal.toLocaleString()}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-600 py-1.5 border-b border-gray-100">
              <span>GST ({(taxRate * 100).toFixed(0)}%)</span>
              <span className="font-semibold font-mono">Rs. {taxAmount.toLocaleString()}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 text-emerald-600">
              <span className="font-semibold">Discount Applied</span>
              <span className="font-bold font-mono">- Rs. {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 px-4 bg-cyan-600 text-white rounded-xl mt-2">
            <span className="font-extrabold text-sm uppercase tracking-wide">Net Payable</span>
            <span className="font-extrabold text-xl font-mono">Rs. {netPayable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── PAYMENT STATUS BANNER ── */}
      {invoice.payment_status === 'Paid' ? (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 text-emerald-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-extrabold text-sm">Payment Received — PAID IN FULL</p>
            <p className="text-xs mt-0.5 text-emerald-600">Thank you. This invoice has been settled.</p>
          </div>
          {/* Watermark-style PAID stamp */}
          <div className="ml-auto px-4 py-1 border-2 border-emerald-500 rounded-lg text-emerald-600 font-extrabold text-sm rotate-[-3deg] tracking-widest">
            PAID
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6 text-amber-700">
          <Coins className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-extrabold text-sm">Payment Due</p>
            <p className="text-xs mt-0.5 text-amber-600">Please present this invoice at the billing counter.</p>
          </div>
          <div className="ml-auto px-4 py-1 border-2 border-amber-500 rounded-lg text-amber-700 font-extrabold text-sm rotate-[-3deg] tracking-widest">
            UNPAID
          </div>
        </div>
      )}

      {/* ── PAYMENT METHODS ACCEPTED ── */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Accepted Payments:</p>
        {['Cash', 'Visa / Mastercard', 'JazzCash', 'EasyPaisa', 'Bank Transfer'].map(m => (
          <span key={m} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold border border-gray-200">
            {m}
          </span>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t-2 border-gray-200 pt-5 mt-4 grid grid-cols-3 gap-6 text-xs text-gray-400">
        <div>
          <p className="font-bold text-gray-600 uppercase tracking-wider mb-1 text-[10px]">Terms & Conditions</p>
          <p>All services are rendered on a fee-for-service basis. Payments are non-refundable once services are delivered. Disputes must be raised within 7 days.</p>
        </div>
        <div className="text-center">
          {/* Authorized Signature Line */}
          <div className="mt-6 border-t border-gray-400 pt-1">
            <p className="text-[10px] font-semibold text-gray-500">Authorized Signatory</p>
            <p className="text-[10px] text-gray-400">Billing Officer — PakMed Care</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-600 uppercase tracking-wider mb-1 text-[10px]">Contact Billing</p>
          <p>billing@pakmedcare.com</p>
          <p>+92-21-34501234</p>
          <p className="mt-1 text-cyan-600 font-semibold">www.pakmedcare.com</p>
          <p className="mt-2 text-[9px] text-gray-300">Generated by PakMed Care HMS v1.0</p>
        </div>
      </div>

    </div>
  );
}

// ─── Main Billing Page ────────────────────────────────────────────────────────

export default function Billing() {
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    patient_id: '',
    discount_amount: 0,
    consultation_doctor_id: '',
    consultation_department_id: '',
    items: [
      { service_type: 'Consultation', description: 'Consultation Fee', quantity: 1, unit_price: 1500, subtotal: 1500 }
    ] as InvoiceItem[]
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    transaction_reference: ''
  });

  // ── Queries ──
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/billing/invoices');
      return res.data.data as Invoice[];
    },
    refetchInterval: 7000
  });

  const { data: patientsList } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await api.get('/patients');
      return res.data.data;
    }
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data;
    }
  });

  const { data: departments } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const res = await api.get('/admin/departments');
      return res.data.data;
    }
  });

  const doctors = usersData?.filter((u: any) => u.role.includes('Doctor') || u.role.includes('Physician') || u.role.includes('Super Administrator')) || [];

  // ── Mutations ──
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const total = invoiceForm.items.reduce((acc, curr) => acc + curr.subtotal, 0);
      const res = await api.post('/billing/invoices', {
        patient_id: invoiceForm.patient_id,
        total_amount: total,
        discount_amount: Number(invoiceForm.discount_amount),
        consultation_doctor_id: invoiceForm.consultation_doctor_id || undefined,
        consultation_department_id: invoiceForm.consultation_department_id || undefined,
        items: invoiceForm.items
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowInvoiceModal(false);

      // Build a preview-ready invoice object from the response + form
      const patient = patientsList?.find((p: any) => p.id === invoiceForm.patient_id);
      const previewObj: Invoice = {
        ...data.data,
        patient_name: patient?.full_name || '—',
        mrn: patient?.mrn || '—',
        items: invoiceForm.items,
        created_at: data.data?.created_at || new Date().toISOString()
      };
      setPreviewInvoice(previewObj);

      setInvoiceForm({
        patient_id: '',
        discount_amount: 0,
        consultation_doctor_id: '',
        consultation_department_id: '',
        items: [{ service_type: 'Consultation', description: 'Consultation Fee', quantity: 1, unit_price: 1500, subtotal: 1500 }]
      });
    }
  });

  const payInvoiceMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await api.post('/billing/payments', paymentData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentForm({ amount: '', payment_method: 'Cash', transaction_reference: '' });
    }
  });

  // ── Handlers ──
  const handleAddInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { service_type: 'Lab Test', description: '', quantity: 1, unit_price: 1000, subtotal: 1000 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceForm.items.length === 1) return;
    const updated = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...invoiceForm.items];
    (updated[index] as any)[field] = value;
    // Recalculate subtotal whenever price or quantity changes
    updated[index].subtotal = updated[index].unit_price * updated[index].quantity;
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.patient_id) return;
    createInvoiceMutation.mutate();
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    payInvoiceMutation.mutate({
      invoice_id: selectedInvoice.id,
      amount: Number(paymentForm.amount || selectedInvoice.net_amount),
      payment_method: paymentForm.payment_method,
      transaction_reference: paymentForm.transaction_reference || undefined
    });
  };

  // ── Print Handler ──
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice — PakMed Care HMS</title>
          <meta charset="UTF-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #111; padding: 32px 40px; font-size: 12px; }
            @media print {
              body { padding: 16px 24px; }
              @page { margin: 12mm; size: A4; }
            }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const getStatusBadge = (status: string) =>
    status === 'Paid'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse';

  const invoiceTotal = invoiceForm.items.reduce((acc, i) => acc + i.subtotal, 0);
  const invoiceNet = invoiceTotal - invoiceForm.discount_amount;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Revenue & Billing</h1>
          <p className="text-slate-400 mt-1">Generate invoices, preview before print, and collect payments.</p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/10 shrink-0"
        >
          <Plus className="h-5 w-5" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* ── INVOICE LEDGER TABLE ── */}
      <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-cyan-400" />
          <span>Invoice Records Ledger</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-4 px-4">Invoice #</th>
                <th className="py-4 px-4">Patient</th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-4">Gross (Rs.)</th>
                <th className="py-4 px-4">Discount</th>
                <th className="py-4 px-4">Net Payable</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">Querying financial ledger...</td>
                </tr>
              ) : !invoices || invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">No invoices found. Click <strong className="text-cyan-400">Generate Invoice</strong> to get started.</td>
                </tr>
              ) : (
                invoices.map((inv: Invoice) => (
                  <tr key={inv.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-xs">
                      INV-{inv.id.replace('inv-', '').toUpperCase()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{inv.patient_name}</div>
                      <div className="text-xs font-mono text-slate-400">MRN: {inv.mrn}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400">
                      {new Date(inv.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 font-semibold text-white">Rs. {(inv.total_amount || 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-slate-400 text-sm">
                      {inv.discount_amount > 0
                        ? <span className="text-emerald-400">- Rs. {inv.discount_amount.toLocaleString()}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-4 px-4 font-extrabold text-cyan-300 font-mono">
                      Rs. {(inv.net_amount || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${getStatusBadge(inv.payment_status)}`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* ── VIEW INVOICE BUTTON ── */}
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-600/50"
                          title="Preview Invoice"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>

                        {/* ── COLLECT PAYMENT BUTTON (Unpaid only) ── */}
                        {inv.payment_status === 'Unpaid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentForm({ ...paymentForm, amount: String(inv.net_amount) });
                              setShowPaymentModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg text-xs font-bold transition-all shadow-md"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            <span>Pay</span>
                          </button>
                        )}

                        {inv.payment_status === 'Paid' && (
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>Settled</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 1 — INVOICE PREVIEW (full-screen with print)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/90 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="w-full max-w-4xl">

            {/* ── Preview Toolbar ── */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="font-bold text-white text-lg leading-tight">Invoice Preview</h2>
                  <p className="text-xs text-slate-400">Review all details below before printing.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg text-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all text-sm border border-slate-600"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* ── Invoice Paper (A4-like white card) ── */}
            <div
              ref={printRef}
              className="bg-white rounded-2xl shadow-2xl shadow-black/40 p-10 border border-slate-200"
            >
              <PrintableInvoice invoice={previewInvoice} />
            </div>

            <p className="text-center text-xs text-slate-500 mt-4">
              This document is generated digitally. Click "Print Invoice" to open the system print dialog.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 2 — CREATE INVOICE FORM
      ═══════════════════════════════════════════════════════════════════════════ */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-white">Generate Clinic Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-6">

              {/* Patient select */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Account *</label>
                <select
                  required
                  value={invoiceForm.patient_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, patient_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                >
                  <option value="">Select patient account...</option>
                  {patientsList?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.mrn} — {p.full_name}</option>
                  ))}
                </select>
              </div>
              {/* Doctor & Department (for auto-queue) */}
              {invoiceForm.items.some(i => i.service_type === 'Consultation') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consultant (For Queue)</label>
                    <select
                      value={invoiceForm.consultation_doctor_id}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, consultation_doctor_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                    >
                      <option value="">No specific consultant</option>
                      {doctors.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department (For Queue)</label>
                    <select
                      value={invoiceForm.consultation_department_id}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, consultation_department_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
                    >
                      <option value="">No specific department</option>
                      {departments?.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {/* Service Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Items *</label>
                  <button
                    type="button"
                    onClick={handleAddInvoiceItem}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-cyan-400/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="col-span-3">Type</span>
                    <span className="col-span-4">Description</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Price (Rs.)</span>
                    <span className="col-span-1"></span>
                  </div>

                  {invoiceForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-700/30">
                      <div className="col-span-3">
                        <select
                          value={item.service_type}
                          onChange={(e) => handleItemChange(index, 'service_type', e.target.value)}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option>Consultation</option>
                          <option>Lab Test</option>
                          <option>Radiology</option>
                          <option>Pharmacy</option>
                          <option>Admission</option>
                          <option>Procedure</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Service description"
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-center focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={0}
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-right font-mono focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={invoiceForm.items.length === 1}
                          className="text-slate-500 hover:text-red-400 disabled:opacity-20 transition-colors p-1 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals + discount */}
              <div className="grid grid-cols-2 gap-6 bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Discount (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={invoiceForm.discount_amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discount_amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="flex flex-col justify-center items-end gap-1">
                  <div className="text-xs text-slate-400 flex justify-between w-full">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-white">Rs. {invoiceTotal.toLocaleString()}</span>
                  </div>
                  {invoiceForm.discount_amount > 0 && (
                    <div className="text-xs text-emerald-400 flex justify-between w-full">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">- Rs. {invoiceForm.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="text-cyan-300 flex justify-between w-full border-t border-slate-700 pt-1 mt-1">
                    <span className="font-bold text-sm">Net Total:</span>
                    <span className="font-extrabold text-lg font-mono">Rs. {invoiceNet.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl text-sm transition-all"
                >
                  <FileText className="h-4 w-4" />
                  {createInvoiceMutation.isPending ? 'Generating...' : 'Finalise & Preview Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 3 — RECORD PAYMENT
      ═══════════════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="h-5 w-5 text-cyan-400" />
                <span>Collect Payment</span>
              </h2>
              <button onClick={() => setShowPaymentModal(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            {/* Invoice summary */}
            <div className="p-4 bg-slate-900 rounded-xl space-y-2.5 border border-slate-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Patient:</span>
                <span className="font-bold text-white">{selectedInvoice.patient_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-mono text-cyan-400">INV-{selectedInvoice.id.replace('inv-', '').toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-slate-400 font-semibold">Net Payable:</span>
                <span className="font-extrabold text-xl text-cyan-300 font-mono">Rs. {selectedInvoice.net_amount.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount Received (Rs.) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'Card', 'JazzCash', 'EasyPaisa'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, payment_method: method })}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold border transition-all ${
                        paymentForm.payment_method === method
                          ? 'bg-cyan-500 text-slate-900 border-cyan-500 shadow-md'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {['JazzCash', 'EasyPaisa', 'Card'].includes(paymentForm.payment_method) && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transaction Reference / ID</label>
                  <input
                    type="text"
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                    placeholder="e.g. TXN-998877"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPreviewInvoice(selectedInvoice);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-sm border border-slate-600 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview Invoice</span>
                </button>
                <button
                  type="submit"
                  disabled={payInvoiceMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl text-sm transition-all"
                >
                  <CheckCircle className="h-4 w-4" />
                  {payInvoiceMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
