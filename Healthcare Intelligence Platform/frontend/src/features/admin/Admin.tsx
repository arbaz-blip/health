import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  History, 
  Beaker, 
  HeartPulse, 
  Plus, 
  Search, 
  Settings, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Server, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Building2,
  Settings as SettingsIcon,
  HardDriveDownload
} from 'lucide-react';
import DepartmentAdmin from './DepartmentAdmin';
import PatientAdmin from './PatientAdmin';
import SettingsAdmin from './SettingsAdmin';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function Admin() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const isSuperAdmin = session?.role === 'Super Administrator';
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'lab' | 'health' | 'departments' | 'patients' | 'settings'>('users');
  
  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [labSearch, setLabSearch] = useState('');

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [showEditTestModal, setShowEditTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<any | null>(null);

  // Forms state
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'Front Desk Officer'
  });

  const [editUserForm, setEditUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'Front Desk Officer',
    is_active: true
  });

  const [testForm, setTestForm] = useState({
    code: '',
    name: '',
    reference_range: '',
    unit: '',
    price: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- QUERIES ---

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data;
    },
    enabled: activeTab === 'users'
  });

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data.data;
    },
    enabled: activeTab === 'audit'
  });

  const { data: labTests, isLoading: loadingLab } = useQuery({
    queryKey: ['admin-lab-tests'],
    queryFn: async () => {
      const res = await api.get('/admin/lab-tests');
      return res.data.data;
    },
    enabled: activeTab === 'lab' || activeTab === 'users' // shared
  });

  const { data: healthData, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const res = await api.get('/admin/system-health');
      return res.data.data;
    },
    enabled: activeTab === 'health',
    refetchInterval: activeTab === 'health' ? 10000 : false
  });

  // --- MUTATIONS ---

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const res = await api.post('/admin/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-health'] });
      setShowAddUserModal(false);
      setUserForm({ email: '', password: '', full_name: '', role: 'Front Desk Officer' });
      triggerToast('User created successfully!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create user');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/admin/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEditUserModal(false);
      setEditingUser(null);
      triggerToast('User updated successfully!', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update user';
      setErrorMsg(msg);
      triggerToast(msg, 'error');
    }
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/lab-tests', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['lab-test-catalog'] });
      setShowAddTestModal(false);
      setTestForm({ code: '', name: '', reference_range: '', unit: '', price: '' });
      triggerToast('Lab test added to LIMS catalog!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to add lab test');
    }
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/admin/lab-tests/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['lab-test-catalog'] });
      setShowEditTestModal(false);
      setEditingTest(null);
      triggerToast('Lab test configured successfully!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to update lab test');
    }
  });

  // --- ACTIONS ---

  const triggerToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    createUserMutation.mutate(userForm);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg('');
    const updatePayload: any = {
      email: editUserForm.email,
      full_name: editUserForm.full_name,
      role: editUserForm.role,
      is_active: editUserForm.is_active
    };
    if (editUserForm.password.trim() !== '') {
      updatePayload.password = editUserForm.password;
    }
    updateUserMutation.mutate({
      id: editingUser.id,
      data: updatePayload
    });
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    setErrorMsg('');
    setShowEditUserModal(true);
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    createTestMutation.mutate({
      ...testForm,
      price: Number(testForm.price)
    });
  };

  const handleEditTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    setErrorMsg('');
    updateTestMutation.mutate({
      id: editingTest.id,
      data: {
        name: testForm.name,
        reference_range: testForm.reference_range,
        unit: testForm.unit,
        price: Number(testForm.price)
      }
    });
  };

  const openEditTest = (test: any) => {
    setEditingTest(test);
    setTestForm({
      code: test.code,
      name: test.name,
      reference_range: test.reference_range,
      unit: test.unit,
      price: test.price.toString()
    });
    setShowEditTestModal(true);
  };

  // --- FILTERED LISTS ---

  const filteredUsers = usersData?.filter((u: any) => 
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredAudits = auditData?.filter((log: any) => 
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.table_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.operator_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
    (log.record_id && log.record_id.toLowerCase().includes(auditSearch.toLowerCase()))
  );

  const filteredLabTests = labTests?.filter((t: any) => 
    t.name.toLowerCase().includes(labSearch.toLowerCase()) ||
    t.code.toLowerCase().includes(labSearch.toLowerCase())
  );

  // Uptime formatter
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Notifications banner */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-emerald-500 text-slate-900 font-extrabold rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400">
          <CheckCircle className="h-5 w-5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && activeTab !== 'users' && activeTab !== 'lab' && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-red-500 text-slate-100 font-extrabold rounded-2xl shadow-2xl flex items-center gap-2 border border-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs uppercase font-extrabold tracking-widest bg-cyan-400/10 px-2.5 py-1 rounded-lg">Admin Control</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">Administrative Dashboard</h1>
          <p className="text-slate-400 mt-1">Configure staff directories, security settings, audit records, and system integrations.</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          {[
            { id: 'users', label: 'Staff Accounts', icon: Users },
            { id: 'departments', label: 'Departments', icon: Building2 },
            { id: 'patients', label: 'Global Patients', icon: Users },
            { id: 'audit', label: 'Audit Trails', icon: History },
            { id: 'lab', label: 'LIMS Catalog', icon: Beaker },
            { id: 'health', label: 'System Health', icon: HeartPulse },
            { id: 'settings', label: 'Settings', icon: SettingsIcon }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  isActive 
                    ? 'bg-cyan-500 text-slate-900 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB PANEL 1: STAFF ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search filter bar */}
            <div className="relative max-w-md w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search staff by name, email, or role..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            {/* Add User button */}
            <button
              onClick={() => { setErrorMsg(''); setShowAddUserModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Staff User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-450">
                <span className="h-8 w-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-3"></span>
                <span className="text-xs uppercase font-extrabold tracking-wider">Loading staff directory...</span>
              </div>
            ) : filteredUsers?.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="font-bold">No user accounts found matching criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                      <th className="p-4 pl-6">Staff Profile</th>
                      <th className="p-4">Assigned Role</th>
                      <th className="p-4">Security MFA</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredUsers?.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-800/20 transition-all">
                        {/* Name/Email */}
                        <td className="p-4 pl-6">
                          <div>
                            <p className="font-bold text-white leading-snug">{u.full_name}</p>
                            <p className="text-xs text-slate-450 mt-0.5">{u.email}</p>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => updateUserMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                            disabled={!isSuperAdmin || session?.id === u.id}
                            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                          >
                            <option>Super Administrator</option>
                            <option>Hospital Administrator</option>
                            <option>Front Desk Officer</option>
                            <option>Emergency Reception Officer</option>
                            <option>Emergency Nurse</option>
                            <option>Emergency Doctor</option>
                            <option>Laboratory Technician</option>
                            <option>Laboratory Supervisor</option>
                            <option>Reporting Manager</option>
                          </select>
                        </td>
                        {/* MFA Status */}
                        <td className="p-4">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                            u.mfa_enabled 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {u.mfa_enabled ? 'TOTP Enabled' : 'Disabled'}
                          </span>
                        </td>
                        {/* Active state */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => updateUserMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                            disabled={!isSuperAdmin || session?.id === u.id}
                            className={`p-1 rounded-lg transition-colors ${
                              (!isSuperAdmin || session?.id === u.id) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800'
                            }`}
                          >
                            {u.is_active ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-extrabold">
                                <ToggleRight className="h-6 w-6 text-cyan-400" />
                                <span>Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-extrabold">
                                <ToggleLeft className="h-6 w-6 text-slate-600" />
                                <span>Deactivated</span>
                              </div>
                            )}
                          </button>
                        </td>
                        {/* Self Indicator */}
                        <td className="p-4 pr-6 text-right font-semibold">
                          {session?.id === u.id ? (
                            <span className="text-[10px] bg-cyan-400/10 text-cyan-400 font-extrabold px-2 py-1 rounded-lg uppercase tracking-wider">Your Session</span>
                          ) : isSuperAdmin ? (
                            <button
                              onClick={() => openEditUser(u)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-lg text-xs border border-slate-750 transition-colors"
                            >
                              Edit Account
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 italic">View Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB PANEL 2: AUDIT TRAILS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Audit filter search */}
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search audit trail (e.g. login, patient ID)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Audit table list */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingAudit ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-450">
                <span className="h-8 w-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-3"></span>
                <span className="text-xs uppercase font-extrabold tracking-wider">Loading system logs...</span>
              </div>
            ) : filteredAudits?.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="font-bold">No audit entries match filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                      <th className="p-4 pl-6">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Operator</th>
                      <th className="p-4">Affected Resource</th>
                      <th className="p-4 pr-6">Changes/Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-medium text-slate-300">
                    {filteredAudits?.map((log: any) => {
                      const hasDetails = log.new_values || log.old_values;
                      let parsedDetails = null;
                      try {
                        if (log.new_values) parsedDetails = JSON.parse(log.new_values);
                        else if (log.old_values) parsedDetails = JSON.parse(log.old_values);
                      } catch {
                        parsedDetails = log.new_values || log.old_values;
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition-all font-mono">
                          {/* Time */}
                          <td className="p-4 pl-6 text-slate-450 leading-snug whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          {/* Action Code */}
                          <td className="p-4">
                            <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-750">
                              {log.action}
                            </span>
                          </td>
                          {/* Operator */}
                          <td className="p-4 whitespace-nowrap">
                            <span className="font-bold text-cyan-400">{log.operator_name}</span>
                            <span className="block text-[10px] text-slate-500 uppercase font-extrabold">{log.operator_role}</span>
                          </td>
                          {/* Table / ID */}
                          <td className="p-4">
                            <span className="text-slate-450">{log.table_name}</span>
                            <span className="block text-[10px] text-slate-400 font-bold truncate max-w-[140px]">{log.record_id}</span>
                          </td>
                          {/* JSON details */}
                          <td className="p-4 pr-6 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                            {hasDetails ? (
                              <span className="text-slate-350 bg-slate-900/50 p-1 px-1.5 rounded inline-block max-w-full overflow-hidden truncate">
                                {typeof parsedDetails === 'object' 
                                  ? JSON.stringify(parsedDetails) 
                                  : String(parsedDetails)
                                }
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">No details logged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB PANEL 3: LAB CATALOG CONFIGURATION */}
      {activeTab === 'lab' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Lab Test Search */}
            <div className="relative max-w-md w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                placeholder="Search catalog tests by code or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            {/* Create Test button */}
            <button
              onClick={() => {
                setErrorMsg('');
                setTestForm({ code: '', name: '', reference_range: '', unit: '', price: '' });
                setShowAddTestModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Configure Lab Test</span>
            </button>
          </div>

          {/* Test Catalog Table */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingLab ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-450">
                <span className="h-8 w-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-3"></span>
                <span className="text-xs uppercase font-extrabold tracking-wider">Loading lab catalog...</span>
              </div>
            ) : filteredLabTests?.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="font-bold">No laboratory investigations catalogued</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                      <th className="p-4 pl-6">Test Code</th>
                      <th className="p-4">Test Name / Description</th>
                      <th className="p-4">Reference Range</th>
                      <th className="p-4">Diagnostic Unit</th>
                      <th className="p-4">Base Pricing</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredLabTests?.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-800/20 transition-all">
                        {/* Code */}
                        <td className="p-4 pl-6">
                          <span className="font-mono font-bold text-white bg-slate-900 border border-slate-750 px-2 py-0.5 rounded">
                            {t.code}
                          </span>
                        </td>
                        {/* Name */}
                        <td className="p-4">
                          <span className="font-bold text-slate-100">{t.name}</span>
                        </td>
                        {/* Ref Range */}
                        <td className="p-4">
                          <span className="text-slate-400 font-medium">{t.reference_range}</span>
                        </td>
                        {/* Unit */}
                        <td className="p-4">
                          <span className="text-slate-450 font-mono">{t.unit || 'n/a'}</span>
                        </td>
                        {/* Price */}
                        <td className="p-4">
                          <span className="font-bold text-cyan-400 flex items-center">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>PKR {t.price}</span>
                          </span>
                        </td>
                        {/* Edit Action */}
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => openEditTest(t)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold rounded-lg text-xs border border-slate-750 transition-colors"
                          >
                            Edit Pricing & Specs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB PANEL 4: SYSTEM DIAGNOSTICS */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Diagnostic overview controls */}
          <div className="flex justify-between items-center bg-slate-850 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-cyan-400" />
              <span className="text-sm font-bold text-slate-300">Live Server Status diagnostics</span>
            </div>
            <button
              onClick={() => refetchHealth()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white text-xs font-bold rounded-lg border border-slate-750 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {loadingHealth ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-450 bg-slate-850 border border-slate-800 rounded-2xl">
              <span className="h-8 w-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-3"></span>
              <span className="text-xs uppercase font-extrabold tracking-wider">Acquiring host diagnostics...</span>
            </div>
          ) : !healthData ? (
            <div className="p-16 text-center text-slate-500 bg-slate-850 border border-slate-800 rounded-2xl">
              <AlertCircle className="h-10 w-10 text-slate-650 mx-auto mb-3" />
              <p className="font-bold">Failed to load system health diagnostics</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Aggregates stats block */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
                {[
                  { label: 'Staff Accounts', val: healthData.aggregates.total_users, color: 'text-cyan-400' },
                  { label: 'Registered Patients', val: healthData.aggregates.total_patients, color: 'text-emerald-400' },
                  { label: 'Queued Intake', val: healthData.aggregates.total_queues, color: 'text-amber-400' },
                  { label: 'ER Intake Records', val: healthData.aggregates.total_emergency, color: 'text-rose-400' },
                  { label: 'LIS Orders', val: healthData.aggregates.total_lab_orders, color: 'text-indigo-400' },
                  { label: 'Audit Log Entries', val: healthData.aggregates.total_audit_logs, color: 'text-slate-400' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-800 border border-slate-700/40 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <h3 className={`text-2xl font-black ${item.color}`}>{item.val}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Host Info */}
                <div className="p-6 bg-slate-850 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Cpu className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-bold text-white">Application Server (Node.js)</h3>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-slate-400 font-medium">Process Uptime</span>
                      <span className="font-mono text-white font-bold">{formatUptime(healthData.uptime)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-slate-400 font-medium">Node Version</span>
                      <span className="font-mono text-white">{healthData.system.node_version}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-slate-400 font-medium">Operating Platform</span>
                      <span className="font-mono text-white capitalize">{healthData.system.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Simulated CPU Utilization</span>
                      <span className="font-mono text-emerald-400 font-extrabold flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>{healthData.system.cpu_usage_percent}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Database Engine */}
                <div className="p-6 bg-slate-850 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Database className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-bold text-white">Database Engine</h3>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-slate-400 font-medium">Database Layer Type</span>
                      <span className="text-white font-bold">{healthData.database.type}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-slate-400 font-medium">Status</span>
                      <span className="text-emerald-450 font-extrabold flex items-center gap-1">
                        <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span>Connected</span>
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-slate-400 font-medium">Active Postgres Connections</span>
                      <span className="font-mono text-white">{healthData.database.active_connections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Memory Allocation (RSS / Heap)</span>
                      <span className="font-mono text-white font-bold">{healthData.system.memory_rss_mb} MB / {healthData.system.memory_heap_used_mb} MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE STAFF USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-700/80 pb-3">Create Staff Account</h2>
            
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="e.g. name@hospital.com"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Staff Name</label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Security Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option>Super Administrator</option>
                  <option>Hospital Administrator</option>
                  <option>Front Desk Officer</option>
                  <option>Emergency Reception Officer</option>
                  <option>Emergency Nurse</option>
                  <option>Emergency Doctor</option>
                  <option>Laboratory Technician</option>
                  <option>Laboratory Supervisor</option>
                  <option>Reporting Manager</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                >
                  {createUserMutation.isPending ? 'Saving...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1.5: EDIT STAFF USER */}
      {showEditUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-700/80 pb-3">Edit Staff Account</h2>
            
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  placeholder="e.g. name@hospital.com"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Staff Name</label>
                <input
                  type="text"
                  required
                  value={editUserForm.full_name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                  placeholder="e.g. Dr. Arthur Pendelton"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Security Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option>Super Administrator</option>
                  <option>Hospital Administrator</option>
                  <option>Front Desk Officer</option>
                  <option>Emergency Reception Officer</option>
                  <option>Emergency Nurse</option>
                  <option>Emergency Doctor</option>
                  <option>Laboratory Technician</option>
                  <option>Laboratory Supervisor</option>
                  <option>Reporting Manager</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/55 rounded-xl border border-slate-700/50">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider">Account Status</label>
                  <span className="text-[10px] text-slate-450">Active staff members can log in.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditUserForm({ ...editUserForm, is_active: !editUserForm.is_active })}
                  disabled={session?.id === editingUser?.id}
                  className={`p-1 ${session?.id === editingUser?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {editUserForm.is_active ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-extrabold">
                      <ToggleRight className="h-7 w-7 text-cyan-400" />
                      <span>Enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-extrabold">
                      <ToggleLeft className="h-7 w-7 text-slate-650" />
                      <span>Disabled</span>
                    </div>
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TEST TO CATALOG */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-700/80 pb-3">Configure Lab Investigation</h2>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Test Code</label>
                  <input
                    type="text"
                    required
                    value={testForm.code}
                    onChange={(e) => setTestForm({ ...testForm, code: e.target.value })}
                    placeholder="e.g. DENGUE_NS1"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Base Pricing (PKR)</label>
                  <input
                    type="number"
                    required
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Test Name</label>
                <input
                  type="text"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Dengue NS1 Rapid Antigen"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reference Range</label>
                  <input
                    type="text"
                    required
                    value={testForm.reference_range}
                    onChange={(e) => setTestForm({ ...testForm, reference_range: e.target.value })}
                    placeholder="e.g. 13.8 - 17.2"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnostic Unit</label>
                  <input
                    type="text"
                    value={testForm.unit}
                    onChange={(e) => setTestForm({ ...testForm, unit: e.target.value })}
                    placeholder="e.g. g/dL, U/L"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddTestModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTestMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                >
                  {createTestMutation.isPending ? 'Publishing...' : 'Catalog Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT TEST SPECS / PRICING */}
      {showEditTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-700/80 pb-3">Edit Lab Test Configuration</h2>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Test Code (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={testForm.code}
                    className="w-full p-2.5 bg-slate-900/50 border border-slate-700/40 rounded-xl text-sm text-slate-500 focus:outline-none uppercase cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Base Pricing (PKR)</label>
                  <input
                    type="number"
                    required
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Test Name</label>
                <input
                  type="text"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Dengue NS1 Rapid Antigen"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reference Range</label>
                  <input
                    type="text"
                    required
                    value={testForm.reference_range}
                    onChange={(e) => setTestForm({ ...testForm, reference_range: e.target.value })}
                    placeholder="e.g. 13.8 - 17.2"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnostic Unit</label>
                  <input
                    type="text"
                    value={testForm.unit}
                    onChange={(e) => setTestForm({ ...testForm, unit: e.target.value })}
                    placeholder="e.g. g/dL, U/L"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => { setShowEditTestModal(false); setEditingTest(null); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTestMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                >
                  {updateTestMutation.isPending ? 'Saving...' : 'Update Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'departments' && <DepartmentAdmin />}
      {activeTab === 'patients' && <PatientAdmin />}
      {activeTab === 'settings' && <SettingsAdmin />}

    </div>
  );
}
