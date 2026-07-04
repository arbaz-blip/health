import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Calendar, UserPlus, CheckCircle, Printer, Users } from 'lucide-react';
import { api } from '../../lib/api';

export default function FrontDesk() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegModal, setShowRegModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Form states
  const [regForm, setRegForm] = useState({
    full_name: '',
    cnic: '',
    gender: 'Male',
    dob: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_state: 'Punjab',
    blood_group: 'Unknown',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: ''
  });

  const [queueForm, setQueueForm] = useState({
    department_id: '2', // Default GENMED
    doctor_id: ''
  });

  // Query: Get Patients
  const { data: patientsRes, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients', searchQuery],
    queryFn: async () => {
      const res = await api.get(`/patients?q=${searchQuery}`);
      return res.data.data;
    }
  });

  // Query: Get Queues
  const { data: queuesRes } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const res = await api.get('/patients/queues');
      return res.data.data;
    }
  });

  // Mutation: Register Patient
  const registerMutation = useMutation({
    mutationFn: async (newPatient: typeof regForm) => {
      const res = await api.post('/patients', {
        ...newPatient,
        consent_accepted: true
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowRegModal(false);
      // Reset Form
      setRegForm({
        full_name: '',
        cnic: '',
        gender: 'Male',
        dob: '',
        phone: '',
        address_street: '',
        address_city: '',
        address_state: 'Punjab',
        blood_group: 'Unknown',
        emergency_contact_name: '',
        emergency_contact_relation: '',
        emergency_contact_phone: ''
      });
    }
  });

  // Mutation: Generate Token
  const tokenMutation = useMutation({
    mutationFn: async (tokenData: { patient_id: string; department_id: number; doctor_id?: string }) => {
      const res = await api.post('/patients/queues/token', tokenData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowQueueModal(false);
    }
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(regForm);
  };

  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    tokenMutation.mutate({
      patient_id: selectedPatientId,
      department_id: Number(queueForm.department_id),
      doctor_id: queueForm.doctor_id || undefined
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Front Desk Operations</h1>
          <p className="text-slate-400 mt-1">Manage patient registrations, appointments, and general flow queues.</p>
        </div>
        <button
          onClick={() => setShowRegModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/10 shrink-0"
        >
          <UserPlus className="h-5 w-5" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Main Grid: Search & Queues */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Patient Directory Section */}
        <div className="xl:col-span-2 p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <span>Patient Directory</span>
            </h2>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by MRN, Name, CNIC, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-4 px-4">MRN</th>
                  <th className="py-4 px-4">Full Name</th>
                  <th className="py-4 px-4">CNIC / Mobile</th>
                  <th className="py-4 px-4">Blood Group</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750">
                {patientsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">Searching records...</td>
                  </tr>
                ) : patientsRes?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No patients registered match criteria.</td>
                  </tr>
                ) : (
                  patientsRes?.map((pat: any) => (
                    <tr key={pat.id} className="hover:bg-slate-750/30 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-cyan-400">{pat.mrn}</td>
                      <td className="py-4 px-4 font-semibold text-white">{pat.full_name}</td>
                      <td className="py-4 px-4">
                        <div className="text-xs text-slate-400">{pat.cnic || 'No CNIC'}</div>
                        <div className="font-medium text-slate-350">{pat.phone}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-slate-700/50 text-cyan-300 rounded-md text-xs font-bold border border-slate-600/30">
                          {pat.blood_group}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => { setSelectedPatientId(pat.id); setShowQueueModal(true); }}
                          className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold transition-colors border border-cyan-400/20"
                        >
                          Generate Token
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Token Queue Section */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <span>Today's Active Queue</span>
          </h2>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {queuesRes?.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No active queue tokens generated today.</div>
            ) : (
              queuesRes?.map((q: any) => (
                <div key={q.id} className="p-4 bg-slate-900 border border-slate-700/40 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400 text-base">{q.token_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        q.status === 'Serving' 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/20'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate max-w-[180px]">{q.patient_name}</p>
                    <p className="text-xs text-slate-500">{q.department_name}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={async () => {
                        await api.put(`/patients/queues/${q.id}`, { status: q.status === 'Waiting' ? 'Serving' : 'Completed' });
                        queryClient.invalidateQueries({ queryKey: ['queues'] });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        q.status === 'Waiting'
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                          : q.status === 'Serving'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                      }`}
                      disabled={q.status === 'Completed'}
                    >
                      {q.status === 'Waiting' ? 'Call' : q.status === 'Serving' ? 'Complete' : 'Finished'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: Registration Form */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6 my-8">
            <h2 className="text-xl font-bold text-white border-b border-slate-750 pb-4">Register Patient Demographics</h2>
            
            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Patient Basics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CNIC (National ID)</label>
                  <input
                    type="text"
                    value={regForm.cnic}
                    onChange={(e) => setRegForm({ ...regForm, cnic: e.target.value })}
                    placeholder="42101-1234567-1"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gender *</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={regForm.dob}
                    onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+923001234567"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Blood Group</label>
                  <select
                    value={regForm.blood_group}
                    onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option>Unknown</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Street Address</label>
                  <input
                    type="text"
                    value={regForm.address_street}
                    onChange={(e) => setRegForm({ ...regForm, address_street: e.target.value })}
                    placeholder="123 Clinical St"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">City</label>
                  <input
                    type="text"
                    value={regForm.address_city}
                    onChange={(e) => setRegForm({ ...regForm, address_city: e.target.value })}
                    placeholder="Karachi"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="border-t border-slate-750 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-350">Emergency Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={regForm.emergency_contact_name}
                      onChange={(e) => setRegForm({ ...regForm, emergency_contact_name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Relation *</label>
                    <input
                      type="text"
                      required
                      value={regForm.emergency_contact_relation}
                      onChange={(e) => setRegForm({ ...regForm, emergency_contact_relation: e.target.value })}
                      placeholder="Spouse, Mother, Friend"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={regForm.emergency_contact_phone}
                      onChange={(e) => setRegForm({ ...regForm, emergency_contact_phone: e.target.value })}
                      placeholder="+923009998887"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Queue Token Form */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-750 pb-3">Generate Queue Token</h2>
            
            <form onSubmit={handleGenerateToken} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinic Department</label>
                <select
                  value={queueForm.department_id}
                  onChange={(e) => setQueueForm({ ...queueForm, department_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="1">Pediatrics</option>
                  <option value="2">General Medicine</option>
                  <option value="3">Emergency Room</option>
                  <option value="4">Clinical Laboratory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign Doctor (Optional)</label>
                <select
                  value={queueForm.doctor_id}
                  onChange={(e) => setQueueForm({ ...queueForm, doctor_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">First Available Doctor (Generic Queue)</option>
                  <option value="u4">Dr. Gregory House (ER/GP)</option>
                  <option value="u1">Dr. Arthur Pendelton (Admin/GP)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tokenMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {tokenMutation.isPending ? 'Generating...' : 'Print Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
