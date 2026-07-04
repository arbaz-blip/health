import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Plus, Heart, UserCheck, AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import { api } from '../../lib/api';

export default function Emergency() {
  const queryClient = useQueryClient();
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedIntakeId, setSelectedIntakeId] = useState('');

  // Form states
  const [intakeForm, setIntakeForm] = useState({
    temporary_name: '',
    mode_of_arrival: 'Self',
    ambulance_service: '',
    ambulance_plate_number: '',
    initial_condition: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const [triageForm, setTriageForm] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    pulse_rate: '',
    temperature_celsius: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    consciousness_level: 'Alert',
    priority_level: 'Medium'
  });

  const [linkPatientId, setLinkPatientId] = useState('');

  // Query: Get Emergency Intakes
  const { data: intakes, isLoading } = useQuery({
    queryKey: ['emergency-intakes'],
    queryFn: async () => {
      const res = await api.get('/emergency/intakes');
      return res.data.data;
    },
    refetchInterval: 5000 // Refetch ER arrivals every 5s (critical workflow)
  });

  // Query: Get Patients for linking
  const { data: patientsList } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const res = await api.get('/patients');
      return res.data.data;
    }
  });

  // Mutation: Log ER Intake
  const intakeMutation = useMutation({
    mutationFn: async (intakeData: typeof intakeForm) => {
      const res = await api.post('/emergency/intake', intakeData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowIntakeModal(false);
      setIntakeForm({
        temporary_name: '',
        mode_of_arrival: 'Self',
        ambulance_service: '',
        ambulance_plate_number: '',
        initial_condition: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
    }
  });

  // Mutation: Log Triage Vitals
  const triageMutation = useMutation({
    mutationFn: async (vitals: {
      bp_systolic: number;
      bp_diastolic: number;
      pulse_rate: number;
      temperature_celsius: number;
      oxygen_saturation: number;
      respiratory_rate: number;
      consciousness_level: string;
      priority_level: string;
      emergency_intake_id: string;
    }) => {
      const res = await api.post('/emergency/triage', vitals);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowTriageModal(false);
      setTriageForm({
        bp_systolic: '',
        bp_diastolic: '',
        pulse_rate: '',
        temperature_celsius: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        consciousness_level: 'Alert',
        priority_level: 'Medium'
      });
    }
  });

  // Mutation: Link Intake to Registered MRN
  const linkMutation = useMutation({
    mutationFn: async ({ intakeId, patientId }: { intakeId: string; patientId: string }) => {
      const res = await api.put(`/emergency/intake/${intakeId}`, {
        status: 'Under Treatment',
        patient_id: patientId
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowLinkModal(false);
    }
  });

  // Mutation: Direct Discharge or Admit status updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ intakeId, status }: { intakeId: string; status: string }) => {
      const res = await api.put(`/emergency/intake/${intakeId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    }
  });

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    intakeMutation.mutate(intakeForm);
  };

  const handleTriageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntakeId) return;
    triageMutation.mutate({
      ...triageForm,
      bp_systolic: Number(triageForm.bp_systolic),
      bp_diastolic: Number(triageForm.bp_diastolic),
      pulse_rate: Number(triageForm.pulse_rate),
      temperature_celsius: Number(triageForm.temperature_celsius),
      oxygen_saturation: Number(triageForm.oxygen_saturation),
      respiratory_rate: Number(triageForm.respiratory_rate),
      emergency_intake_id: selectedIntakeId
    });
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntakeId || !linkPatientId) return;
    linkMutation.mutate({ intakeId: selectedIntakeId, patientId: linkPatientId });
  };

  const getPriorityBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse';
      case 'High':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Emergency Department (ER)</h1>
          <p className="text-slate-400 mt-1">Real-time Emergency room intakes, triage monitoring, and critical interventions.</p>
        </div>
        <button
          onClick={() => setShowIntakeModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/10 shrink-0"
        >
          <Plus className="h-5 w-5" />
          <span>New ER Intake</span>
        </button>
      </div>

      {/* ER Triage Board */}
      <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-red-400" />
          <span>Emergency Triage Worklist</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 text-center py-12 text-slate-500">Loading triage workspace...</div>
          ) : intakes?.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500">No active intakes in the emergency room.</div>
          ) : (
            intakes?.map((int: any) => (
              <div 
                key={int.id} 
                className={`p-5 bg-slate-900 border rounded-2xl flex flex-col justify-between h-80 transition-all ${
                  int.triage?.priority_level === 'Critical' 
                    ? 'border-red-500/30 shadow-red-500/5 hover:border-red-500/40 shadow-lg' 
                    : 'border-slate-750 hover:border-slate-700'
                }`}
              >
                {/* Upper Details */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base truncate max-w-[160px]">
                        {int.patient_name || int.temporary_name}
                      </h3>
                      <p className="text-xs font-mono text-cyan-400">{int.mrn}</p>
                    </div>
                    {int.triage && (
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase ${getPriorityBadge(int.triage.priority_level)}`}>
                        {int.triage.priority_level}
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-750/30">
                    <p className="text-slate-400"><strong className="text-slate-350">Arrival:</strong> {int.mode_of_arrival} {int.ambulance_service ? `(${int.ambulance_service})` : ''}</p>
                    <p className="text-slate-400"><strong className="text-slate-350">Condition:</strong> <span className="text-slate-300 font-medium">{int.initial_condition}</span></p>
                    <p className="text-slate-400"><strong className="text-slate-350">Status:</strong> <span className="text-slate-300 font-medium">{int.status}</span></p>
                  </div>
                </div>

                {/* Vitals summary if triage completed */}
                {int.triage ? (
                  <div className="grid grid-cols-4 gap-2 text-center bg-slate-800/20 p-2.5 rounded-xl border border-slate-750/30">
                    <div>
                      <p className="text-[10px] text-slate-500">BP</p>
                      <p className="text-xs font-bold text-white">{int.triage.bp_systolic}/{int.triage.bp_diastolic}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">HR</p>
                      <p className="text-xs font-bold text-red-400">{int.triage.pulse_rate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">O₂Sat</p>
                      <p className="text-xs font-bold text-cyan-400">{int.triage.oxygen_saturation}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Temp</p>
                      <p className="text-xs font-bold text-amber-400">{int.triage.temperature_celsius}°C</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-3 border border-dashed border-red-500/20 bg-red-500/5 rounded-xl">
                    <p className="text-xs font-bold text-red-400 uppercase flex items-center gap-1.5 animate-pulse">
                      <Heart className="h-4 w-4 shrink-0" />
                      <span>Pending Nurse Triage</span>
                    </p>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  {!int.triage ? (
                    <button
                      onClick={() => { setSelectedIntakeId(int.id); setShowTriageModal(true); }}
                      className="w-full py-2 bg-red-500 hover:bg-red-400 text-slate-900 font-bold rounded-xl text-xs transition-colors"
                    >
                      Start Triage
                    </button>
                  ) : int.status === 'Triage Completed' ? (
                    <button
                      onClick={() => { setSelectedIntakeId(int.id); setShowLinkModal(true); }}
                      className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Link Registered Patient</span>
                    </button>
                  ) : (
                    <div className="flex w-full gap-2">
                      <button
                        onClick={() => updateStatusMutation.mutate({ intakeId: int.id, status: 'Discharged' })}
                        className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-750 transition-colors"
                      >
                        Discharge
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ intakeId: int.id, status: 'Admitted' })}
                        className="w-1/2 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-bold rounded-xl text-xs border border-cyan-400/20 transition-colors"
                      >
                        Admit Ward
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: ER Intake Entry */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-slate-750 pb-4">Log Emergency Room Arrival</h2>
            
            <form onSubmit={handleIntakeSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Temporary Name / Patient ID</label>
                  <input
                    type="text"
                    value={intakeForm.temporary_name}
                    onChange={(e) => setIntakeForm({ ...intakeForm, temporary_name: e.target.value })}
                    placeholder="e.g. Unknown Male 02 or Free Text"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mode of Arrival *</label>
                  <select
                    value={intakeForm.mode_of_arrival}
                    onChange={(e) => setIntakeForm({ ...intakeForm, mode_of_arrival: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option>Self</option>
                    <option>Ambulance</option>
                    <option>Police</option>
                    <option>Bystander</option>
                  </select>
                </div>
              </div>

              {intakeForm.mode_of_arrival === 'Ambulance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-750">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ambulance Service</label>
                    <input
                      type="text"
                      value={intakeForm.ambulance_service}
                      onChange={(e) => setIntakeForm({ ...intakeForm, ambulance_service: e.target.value })}
                      placeholder="e.g. Edhi, Chippa, Rescue 1122"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle Plate Number</label>
                    <input
                      type="text"
                      value={intakeForm.ambulance_plate_number}
                      onChange={(e) => setIntakeForm({ ...intakeForm, ambulance_plate_number: e.target.value })}
                      placeholder="e.g. LE-1234"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Presenting Complaint / Initial Condition *</label>
                <textarea
                  required
                  rows={3}
                  value={intakeForm.initial_condition}
                  onChange={(e) => setIntakeForm({ ...intakeForm, initial_condition: e.target.value })}
                  placeholder="Describe patient status, trauma signs, complaints..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-750 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={intakeMutation.isPending}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {intakeMutation.isPending ? 'Logging Intake...' : 'Log Arrival'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Triage Vitals Logging */}
      {showTriageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-slate-750 pb-4">Emergency Clinical Triage Vitals</h2>
            
            <form onSubmit={handleTriageSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">BP Systolic *</label>
                  <input
                    type="number"
                    required
                    value={triageForm.bp_systolic}
                    onChange={(e) => setTriageForm({ ...triageForm, bp_systolic: e.target.value })}
                    placeholder="mmHg (e.g. 120)"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">BP Diastolic *</label>
                  <input
                    type="number"
                    required
                    value={triageForm.bp_diastolic}
                    onChange={(e) => setTriageForm({ ...triageForm, bp_diastolic: e.target.value })}
                    placeholder="mmHg (e.g. 80)"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pulse Rate (BPM) *</label>
                  <input
                    type="number"
                    required
                    value={triageForm.pulse_rate}
                    onChange={(e) => setTriageForm({ ...triageForm, pulse_rate: e.target.value })}
                    placeholder="BPM"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">O₂ Saturation (%) *</label>
                  <input
                    type="number"
                    required
                    value={triageForm.oxygen_saturation}
                    onChange={(e) => setTriageForm({ ...triageForm, oxygen_saturation: e.target.value })}
                    placeholder="%"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Temp (°C) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={triageForm.temperature_celsius}
                    onChange={(e) => setTriageForm({ ...triageForm, temperature_celsius: e.target.value })}
                    placeholder="Celsius"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Respiratory Rate *</label>
                  <input
                    type="number"
                    required
                    value={triageForm.respiratory_rate}
                    onChange={(e) => setTriageForm({ ...triageForm, respiratory_rate: e.target.value })}
                    placeholder="Breaths/Min"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consciousness Level (AVPU)</label>
                  <select
                    value={triageForm.consciousness_level}
                    onChange={(e) => setTriageForm({ ...triageForm, consciousness_level: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  >
                    <option>Alert</option>
                    <option>Voice</option>
                    <option>Pain</option>
                    <option>Unresponsive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Triage Priority Category</label>
                  <select
                    value={triageForm.priority_level}
                    onChange={(e) => setTriageForm({ ...triageForm, priority_level: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-750 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTriageModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triageMutation.isPending}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {triageMutation.isPending ? 'Logging Vitals...' : 'Log Triage Vitals'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Link ER Intake to Patient */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-750 pb-3">Link to Patient Database</h2>
            
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Choose Registered Patient</label>
                <select
                  value={linkPatientId}
                  onChange={(e) => setLinkPatientId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  required
                >
                  <option value="">Select registered patient...</option>
                  {patientsList?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.mrn} - {p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {linkMutation.isPending ? 'Linking...' : 'Confirm Association'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
