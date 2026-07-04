import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope, Plus, Search, FileText, ChevronDown, ChevronUp,
  User, Calendar, Clock, Pill, AlertTriangle, CheckCircle,
  ClipboardList, Printer, X, Pencil, Trash2, Activity, Heart
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Diagnosis {
  id: string;
  icd10_code: string;
  icd10_description: string;
  diagnosis_type: 'Primary' | 'Secondary' | 'Differential';
  notes?: string;
  created_at: string;
}

interface Prescription {
  id: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  route: string;
  frequency: string;
  duration_days: number;
  quantity: number;
  instructions?: string;
  is_controlled_substance: boolean;
  status: string;
  created_at: string;
}

interface ClinicalVisit {
  id: string;
  patient_id: string;
  patient_name?: string;
  mrn?: string;
  doctor_id: string;
  doctor_name?: string;
  visit_type: string;
  department_id: number;
  department_name?: string;
  visit_date: string;
  chief_complaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse_rate?: number;
  temperature_celsius?: number;
  oxygen_saturation?: number;
  weight_kg?: number;
  height_cm?: number;
  follow_up_date?: string;
  referral_to?: string;
  status: string;
  diagnoses?: Diagnosis[];
  prescriptions?: Prescription[];
  created_at: string;
  updated_at: string;
}

// ─── ICD-10 Search Component ──────────────────────────────────────────────────

function ICD10SearchInput({ onSelect }: { onSelect: (code: string, desc: string) => void }) {
  const [query, setQuery] = useState('');

  const { data: results } = useQuery({
    queryKey: ['icd10', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await api.get(`/emr/icd10/search?q=${encodeURIComponent(query)}`);
      return res.data.data;
    },
    enabled: query.length >= 2
  });

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search ICD-10 code or diagnosis name..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
        />
      </div>
      {results && results.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {results.map((r: any) => (
            <button
              key={r.code}
              type="button"
              onClick={() => { onSelect(r.code, r.description); setQuery(''); }}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors flex items-start gap-3 border-b border-slate-700/40 last:border-0"
            >
              <span className="font-mono text-xs text-cyan-400 font-bold shrink-0 mt-0.5 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                {r.code}
              </span>
              <span className="text-sm text-slate-200">{r.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Printable SOAP Note ──────────────────────────────────────────────────────

function PrintableSOAP({ visit }: { visit: ClinicalVisit }) {
  const handlePrint = () => {
    const content = document.getElementById(`soap-print-${visit.id}`);
    if (!content) return;
    const win = window.open('', '_blank', 'width=860,height=720');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Clinical Note — ${visit.patient_name}</title>
      <meta charset="UTF-8"/>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px 32px}
        h1{font-size:16px;font-weight:900}h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#0891b2;margin-bottom:4px}
        .section{margin-bottom:14px;padding:10px;border:1px solid #e5e7eb;border-radius:8px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#e0f2fe;color:#0369a1}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th{background:#0891b2;color:#fff;padding:5px 8px;text-align:left}
        td{padding:5px 8px;border-bottom:1px solid #e5e7eb}
        tr:nth-child(even) td{background:#f9fafb}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #0891b2;margin-bottom:16px}
        @page{margin:12mm;size:A4}
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-600/50"
    >
      <Printer className="h-3.5 w-3.5" />
      <span>Print Note</span>
    </button>
  );
}

// ─── Visit Card ───────────────────────────────────────────────────────────────

function VisitCard({
  visit,
  onAddDiagnosis,
  onAddPrescription,
  onSign,
  isDoctor
}: {
  visit: ClinicalVisit;
  onAddDiagnosis: (visitId: string) => void;
  onAddPrescription: (visitId: string) => void;
  onSign: (visitId: string) => void;
  isDoctor: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    visit.status === 'Signed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    visit.status === 'Amended' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    'bg-slate-700/50 text-slate-400 border-slate-600/30';

  const visitTypeColor =
    visit.visit_type === 'ER' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    visit.visit_type === 'Admission' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
    visit.visit_type === 'Follow-Up' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    'bg-cyan-500/10 text-cyan-400 border-cyan-400/20';

  return (
    <div id={`soap-print-${visit.id}`} className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden transition-all">

      {/* ── Card Header (always visible) ── */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-750/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-2.5 bg-slate-700 rounded-xl shrink-0">
            <Stethoscope className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded border uppercase ${visitTypeColor}`}>
                {visit.visit_type}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded border uppercase ${statusColor}`}>
                {visit.status}
              </span>
              {visit.diagnoses && visit.diagnoses.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {visit.diagnoses.length} Dx
                </span>
              )}
              {visit.prescriptions && visit.prescriptions.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {visit.prescriptions.length} Rx
                </span>
              )}
            </div>
            <p className="font-bold text-white mt-1 truncate">{visit.chief_complaint}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(visit.visit_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}{visit.doctor_name || 'Unknown Doctor'}
              {visit.department_name ? ` · ${visit.department_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <PrintableSOAP visit={visit} />
          {expanded
            ? <ChevronUp className="h-5 w-5 text-slate-400" />
            : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-5 space-y-6">

          {/* Vitals strip */}
          {(visit.bp_systolic || visit.pulse_rate || visit.oxygen_saturation || visit.temperature_celsius) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: 'BP', value: visit.bp_systolic ? `${visit.bp_systolic}/${visit.bp_diastolic}` : null, unit: 'mmHg', color: 'text-rose-400' },
                { label: 'Pulse', value: visit.pulse_rate, unit: 'bpm', color: 'text-red-400' },
                { label: 'SpO₂', value: visit.oxygen_saturation, unit: '%', color: 'text-cyan-400' },
                { label: 'Temp', value: visit.temperature_celsius, unit: '°C', color: 'text-amber-400' },
                { label: 'Weight', value: visit.weight_kg, unit: 'kg', color: 'text-slate-300' },
                { label: 'Height', value: visit.height_cm, unit: 'cm', color: 'text-slate-300' },
                { label: 'BMI', value: (visit.weight_kg && visit.height_cm) ? (visit.weight_kg / ((visit.height_cm / 100) ** 2)).toFixed(1) : null, unit: '', color: 'text-purple-400' },
              ].filter(v => v.value !== null && v.value !== undefined).map(v => (
                <div key={v.label} className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{v.label}</p>
                  <p className={`font-extrabold text-base font-mono mt-1 ${v.color}`}>{v.value}</p>
                  <p className="text-[10px] text-slate-600">{v.unit}</p>
                </div>
              ))}
            </div>
          )}

          {/* SOAP Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'S — Subjective (Patient History)', value: visit.subjective, color: 'border-blue-500/30 bg-blue-500/5' },
              { label: 'O — Objective (Examination Findings)', value: visit.objective, color: 'border-cyan-500/30 bg-cyan-500/5' },
              { label: 'A — Assessment (Clinical Impression)', value: visit.assessment, color: 'border-amber-500/30 bg-amber-500/5' },
              { label: 'P — Plan (Treatment & Advice)', value: visit.plan, color: 'border-emerald-500/30 bg-emerald-500/5' },
            ].map(section => (
              <div key={section.label} className={`p-4 rounded-xl border ${section.color}`}>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">{section.label}</p>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{section.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Diagnoses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-400" />
                Diagnoses
              </h4>
              {isDoctor && visit.status !== 'Signed' && (
                <button
                  onClick={() => onAddDiagnosis(visit.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Dx
                </button>
              )}
            </div>
            {!visit.diagnoses || visit.diagnoses.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No diagnoses recorded.</p>
            ) : (
              <div className="space-y-2">
                {visit.diagnoses.map((dx) => (
                  <div key={dx.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                    <span className="font-mono text-xs font-extrabold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded shrink-0">
                      {dx.icd10_code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{dx.icd10_description}</p>
                      {dx.notes && <p className="text-xs text-slate-400 mt-0.5">{dx.notes}</p>}
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase shrink-0 ${
                      dx.diagnosis_type === 'Primary' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      dx.diagnosis_type === 'Secondary' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    }`}>
                      {dx.diagnosis_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prescriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-400" />
                Prescriptions
              </h4>
              {isDoctor && visit.status !== 'Signed' && (
                <button
                  onClick={() => onAddPrescription(visit.id)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Rx
                </button>
              )}
            </div>
            {!visit.prescriptions || visit.prescriptions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No prescriptions issued.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Drug (Generic)</th>
                      <th className="py-2.5 px-3 text-left">Dose</th>
                      <th className="py-2.5 px-3 text-left">Route</th>
                      <th className="py-2.5 px-3 text-left">Frequency</th>
                      <th className="py-2.5 px-3 text-center">Days</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {visit.prescriptions.map((rx) => (
                      <tr key={rx.id} className="hover:bg-slate-700/20">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-white">{rx.medication_name}</p>
                          {rx.generic_name && <p className="text-slate-500 text-[10px]">{rx.generic_name}</p>}
                          {rx.is_controlled_substance && (
                            <span className="text-[9px] text-red-400 font-bold">⚠ Controlled</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-cyan-300">{rx.dosage}</td>
                        <td className="py-2.5 px-3">{rx.route}</td>
                        <td className="py-2.5 px-3">{rx.frequency}</td>
                        <td className="py-2.5 px-3 text-center">{rx.duration_days}d</td>
                        <td className="py-2.5 px-3 text-center">{rx.quantity}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rx.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                            rx.status === 'Dispensed' ? 'bg-slate-700 text-slate-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {rx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Follow-up / Referral */}
          {(visit.follow_up_date || visit.referral_to) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visit.follow_up_date && (
                <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Follow-up Scheduled</p>
                    <p className="text-sm font-semibold text-white">
                      {new Date(visit.follow_up_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
              {visit.referral_to && (
                <div className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                  <Activity className="h-4 w-4 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-purple-400 uppercase">Referral Issued</p>
                    <p className="text-sm font-semibold text-white">{visit.referral_to}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sign note button */}
          {isDoctor && visit.status === 'Draft' && (
            <div className="pt-2 border-t border-slate-700/50 flex justify-end">
              <button
                onClick={() => onSign(visit.id)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl text-sm transition-all"
              >
                <CheckCircle className="h-4 w-4" />
                Sign & Lock Clinical Note
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main EMR Page ────────────────────────────────────────────────────────────

export default function EMR() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();

  const isDoctor = session?.role === 'Emergency Doctor' ||
    session?.role === 'Super Administrator' ||
    session?.role === 'Hospital Administrator';

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [showDxModal, setShowDxModal] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  const [activeVisitId, setActiveVisitId] = useState('');

  // New visit form
  const [visitForm, setVisitForm] = useState({
    visit_type: 'OPD',
    department_id: 2,
    chief_complaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    bp_systolic: '',
    bp_diastolic: '',
    pulse_rate: '',
    temperature_celsius: '',
    oxygen_saturation: '',
    weight_kg: '',
    height_cm: '',
    follow_up_date: '',
    referral_to: ''
  });

  // Diagnosis form
  const [dxForm, setDxForm] = useState({
    icd10_code: '',
    icd10_description: '',
    diagnosis_type: 'Primary',
    notes: ''
  });

  // Prescription form
  const [rxForm, setRxForm] = useState({
    medication_name: '',
    generic_name: '',
    dosage: '',
    route: 'Oral',
    frequency: 'Once daily',
    duration_days: 5,
    quantity: 5,
    instructions: '',
    is_controlled_substance: false
  });

  // ── Queries ──
  const { data: patients } = useQuery({
    queryKey: ['patients', patientSearch],
    queryFn: async () => {
      const res = await api.get(`/patients?q=${patientSearch}`);
      return res.data.data;
    }
  });

  const selectedPatient = patients?.find((p: any) => p.id === selectedPatientId);

  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ['emr-visits', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const res = await api.get(`/emr/visits?patient_id=${selectedPatientId}`);
      return res.data.data as ClinicalVisit[];
    },
    enabled: !!selectedPatientId,
    refetchInterval: 10000
  });

  // ── Mutations ──
  const createVisitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/emr/visits', {
        patient_id: selectedPatientId,
        ...visitForm,
        bp_systolic: visitForm.bp_systolic ? Number(visitForm.bp_systolic) : null,
        bp_diastolic: visitForm.bp_diastolic ? Number(visitForm.bp_diastolic) : null,
        pulse_rate: visitForm.pulse_rate ? Number(visitForm.pulse_rate) : null,
        temperature_celsius: visitForm.temperature_celsius ? Number(visitForm.temperature_celsius) : null,
        oxygen_saturation: visitForm.oxygen_saturation ? Number(visitForm.oxygen_saturation) : null,
        weight_kg: visitForm.weight_kg ? Number(visitForm.weight_kg) : null,
        height_cm: visitForm.height_cm ? Number(visitForm.height_cm) : null,
        follow_up_date: visitForm.follow_up_date || null,
        referral_to: visitForm.referral_to || null,
        department_id: Number(visitForm.department_id)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emr-visits', selectedPatientId] });
      setShowNewVisitModal(false);
      setVisitForm({
        visit_type: 'OPD', department_id: 2, chief_complaint: '', subjective: '',
        objective: '', assessment: '', plan: '', bp_systolic: '', bp_diastolic: '',
        pulse_rate: '', temperature_celsius: '', oxygen_saturation: '', weight_kg: '',
        height_cm: '', follow_up_date: '', referral_to: ''
      });
    }
  });

  const addDxMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/emr/diagnoses', { visit_id: activeVisitId, patient_id: selectedPatientId, ...dxForm });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emr-visits', selectedPatientId] });
      setShowDxModal(false);
      setDxForm({ icd10_code: '', icd10_description: '', diagnosis_type: 'Primary', notes: '' });
    }
  });

  const addRxMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/emr/prescriptions', {
        visit_id: activeVisitId,
        patient_id: selectedPatientId,
        ...rxForm,
        duration_days: Number(rxForm.duration_days),
        quantity: Number(rxForm.quantity)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emr-visits', selectedPatientId] });
      setShowRxModal(false);
      setRxForm({ medication_name: '', generic_name: '', dosage: '', route: 'Oral', frequency: 'Once daily', duration_days: 5, quantity: 5, instructions: '', is_controlled_substance: false });
    }
  });

  const signVisitMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const res = await api.put(`/emr/visits/${visitId}`, { status: 'Signed' });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emr-visits', selectedPatientId] })
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Electronic Medical Records</h1>
          <p className="text-slate-400 mt-1">SOAP notes, ICD-10 diagnoses, prescriptions, and clinical visit history.</p>
        </div>
        {isDoctor && selectedPatientId && (
          <button
            onClick={() => setShowNewVisitModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg shrink-0"
          >
            <Plus className="h-5 w-5" />
            <span>New SOAP Note</span>
          </button>
        )}
      </div>

      {/* ── Patient Selector ── */}
      <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-cyan-400" />
          Select Patient to View Records
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient by name, MRN, CNIC..."
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="sm:w-72 py-2.5 px-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
          >
            <option value="">Choose patient from list...</option>
            {patients?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.mrn} — {p.full_name}</option>
            ))}
          </select>
        </div>

        {/* Selected patient info strip */}
        {selectedPatient && (
          <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-slate-900/60 rounded-xl border border-cyan-500/20">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl">
              <User className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-white text-base">{selectedPatient.full_name}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                <span className="font-mono font-bold text-cyan-400">{selectedPatient.mrn}</span>
                <span>DOB: {selectedPatient.dob}</span>
                <span>{selectedPatient.gender}</span>
                <span className="font-bold text-red-300">{selectedPatient.blood_group}</span>
                <span>{selectedPatient.phone}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {visits && visits.length > 0 && (
                <span className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold">
                  {visits.length} Visit{visits.length !== 1 ? 's' : ''} on Record
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Visit History ── */}
      {selectedPatientId && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-cyan-400" />
            Clinical Visit History
          </h2>

          {visitsLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <span className="h-8 w-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mr-3"></span>
              Loading clinical records...
            </div>
          ) : !visits || visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-800 rounded-2xl border border-slate-700/50 text-slate-500">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="font-semibold">No clinical visits on record for this patient.</p>
              {isDoctor && (
                <button
                  onClick={() => setShowNewVisitModal(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-bold border border-cyan-400/20 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Start First Consultation
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((visit: ClinicalVisit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  isDoctor={isDoctor}
                  onAddDiagnosis={(id) => { setActiveVisitId(id); setShowDxModal(true); }}
                  onAddPrescription={(id) => { setActiveVisitId(id); setShowRxModal(true); }}
                  onSign={(id) => signVisitMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedPatientId && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <Stethoscope className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-semibold">Select a patient above to view their medical records.</p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 1 — NEW CLINICAL VISIT (SOAP)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/90 backdrop-blur-sm overflow-y-auto py-6 px-4">
          <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl my-4">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white">New Clinical Consultation</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Patient: <span className="font-semibold text-cyan-400">{selectedPatient?.full_name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500">{selectedPatient?.mrn}</span>
                </p>
              </div>
              <button onClick={() => setShowNewVisitModal(false)}>
                <X className="h-6 w-6 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createVisitMutation.mutate(); }} className="p-6 space-y-6">

              {/* Visit metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Visit Type</label>
                  <select value={visitForm.visit_type} onChange={e => setVisitForm({...visitForm, visit_type: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400">
                    <option>OPD</option>
                    <option>ER</option>
                    <option>Follow-Up</option>
                    <option>Admission</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                  <select value={visitForm.department_id} onChange={e => setVisitForm({...visitForm, department_id: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400">
                    <option value={1}>Pediatrics</option>
                    <option value={2}>General Medicine</option>
                    <option value={3}>Emergency Room</option>
                    <option value={5}>Radiology</option>
                    <option value={6}>Pharmacy</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chief Complaint *</label>
                  <input type="text" required value={visitForm.chief_complaint}
                    onChange={e => setVisitForm({...visitForm, chief_complaint: e.target.value})}
                    placeholder="Primary presenting complaint"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400" />
                </div>
              </div>

              {/* Vitals */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vitals at Visit (Optional)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { key: 'bp_systolic', label: 'BP Sys', placeholder: 'mmHg' },
                    { key: 'bp_diastolic', label: 'BP Dia', placeholder: 'mmHg' },
                    { key: 'pulse_rate', label: 'Pulse', placeholder: 'bpm' },
                    { key: 'temperature_celsius', label: 'Temp °C', placeholder: '37.0' },
                    { key: 'oxygen_saturation', label: 'SpO₂ %', placeholder: '98' },
                    { key: 'weight_kg', label: 'Weight kg', placeholder: '70' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{field.label}</label>
                      <input type="number" step="0.1"
                        value={(visitForm as any)[field.key]}
                        onChange={e => setVisitForm({...visitForm, [field.key]: e.target.value})}
                        placeholder={field.placeholder}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-center focus:outline-none focus:border-cyan-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* SOAP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'subjective', label: 'S — Subjective', placeholder: 'Patient-reported symptoms, history of present illness, duration, severity, associated symptoms...', color: 'focus:border-blue-400' },
                  { key: 'objective', label: 'O — Objective', placeholder: 'Physical examination findings, auscultation, palpation, percussion, neurological exam...', color: 'focus:border-cyan-400' },
                  { key: 'assessment', label: 'A — Assessment', placeholder: 'Clinical impression, differential diagnoses considered, working diagnosis...', color: 'focus:border-amber-400' },
                  { key: 'plan', label: 'P — Plan', placeholder: 'Investigations ordered, treatment started, medications prescribed, follow-up advice, referrals...', color: 'focus:border-emerald-400' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{field.label}</label>
                    <textarea rows={4} required value={(visitForm as any)[field.key]}
                      onChange={e => setVisitForm({...visitForm, [field.key]: e.target.value})}
                      placeholder={field.placeholder}
                      className={`w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none ${field.color} transition-colors resize-none`} />
                  </div>
                ))}
              </div>

              {/* Follow-up / Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Follow-up Date</label>
                  <input type="date" value={visitForm.follow_up_date}
                    onChange={e => setVisitForm({...visitForm, follow_up_date: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Referral To (if any)</label>
                  <input type="text" value={visitForm.referral_to}
                    onChange={e => setVisitForm({...visitForm, referral_to: e.target.value})}
                    placeholder="e.g. Cardiologist, Orthopedic Surgeon"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button type="button" onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createVisitMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl text-sm transition-all">
                  <FileText className="h-4 w-4" />
                  {createVisitMutation.isPending ? 'Saving...' : 'Save as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 2 — ADD DIAGNOSIS
      ═══════════════════════════════════════════════════════════════════════ */}
      {showDxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-400" />
                Add ICD-10 Diagnosis
              </h2>
              <button onClick={() => setShowDxModal(false)}><X className="h-5 w-5 text-slate-400 hover:text-white" /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); addDxMutation.mutate(); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Search ICD-10 Code *</label>
                <ICD10SearchInput onSelect={(code, desc) => setDxForm({...dxForm, icd10_code: code, icd10_description: desc})} />
                {dxForm.icd10_code && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <span className="font-mono font-bold text-indigo-400 text-sm">{dxForm.icd10_code}</span>
                    <span className="text-sm text-slate-200">{dxForm.icd10_description}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnosis Type</label>
                <div className="flex gap-2">
                  {['Primary', 'Secondary', 'Differential'].map(t => (
                    <button key={t} type="button" onClick={() => setDxForm({...dxForm, diagnosis_type: t})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                        dxForm.diagnosis_type === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinical Notes</label>
                <textarea rows={2} value={dxForm.notes} onChange={e => setDxForm({...dxForm, notes: e.target.value})}
                  placeholder="Additional context or qualifier..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button type="button" onClick={() => setShowDxModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={!dxForm.icd10_code || addDxMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                  {addDxMutation.isPending ? 'Adding...' : 'Add Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 3 — ADD PRESCRIPTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 my-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-400" />
                Write Prescription
              </h2>
              <button onClick={() => setShowRxModal(false)}><X className="h-5 w-5 text-slate-400 hover:text-white" /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); addRxMutation.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Brand / Drug Name *</label>
                  <input type="text" required value={rxForm.medication_name}
                    onChange={e => setRxForm({...rxForm, medication_name: e.target.value})}
                    placeholder="e.g. Augmentin, Panadol, Flagyl"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Generic Name</label>
                  <input type="text" value={rxForm.generic_name}
                    onChange={e => setRxForm({...rxForm, generic_name: e.target.value})}
                    placeholder="e.g. Amoxicillin-Clavulanate"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dosage *</label>
                  <input type="text" required value={rxForm.dosage}
                    onChange={e => setRxForm({...rxForm, dosage: e.target.value})}
                    placeholder="e.g. 625mg, 500mg"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Route</label>
                  <select value={rxForm.route} onChange={e => setRxForm({...rxForm, route: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none">
                    <option>Oral</option>
                    <option>IV</option>
                    <option>IM</option>
                    <option>Topical</option>
                    <option>Inhaled</option>
                    <option>Sublingual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Frequency</label>
                  <select value={rxForm.frequency} onChange={e => setRxForm({...rxForm, frequency: e.target.value})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none">
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>Three times daily</option>
                    <option>Four times daily</option>
                    <option>Every 8 hours</option>
                    <option>Every 6 hours</option>
                    <option>As needed (PRN)</option>
                    <option>At bedtime</option>
                    <option>Before meals</option>
                    <option>After meals</option>
                    <option>Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Duration (Days) *</label>
                  <input type="number" min={1} required value={rxForm.duration_days}
                    onChange={e => setRxForm({...rxForm, duration_days: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity to Dispense</label>
                  <input type="number" min={1} value={rxForm.quantity}
                    onChange={e => setRxForm({...rxForm, quantity: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Instructions</label>
                <input type="text" value={rxForm.instructions}
                  onChange={e => setRxForm({...rxForm, instructions: e.target.value})}
                  placeholder="e.g. Take with food, avoid alcohol, complete full course"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                <input type="checkbox" checked={rxForm.is_controlled_substance}
                  onChange={e => setRxForm({...rxForm, is_controlled_substance: e.target.checked})}
                  className="accent-red-500 h-4 w-4" />
                <div>
                  <p className="text-sm font-bold text-red-400">Controlled Substance</p>
                  <p className="text-xs text-slate-500">Narcotics, benzodiazepines, psychotropics — requires PMDC authorization</p>
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button type="button" onClick={() => setShowRxModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={addRxMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl text-sm">
                  <Pill className="h-4 w-4" />
                  {addRxMutation.isPending ? 'Writing...' : 'Write Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
