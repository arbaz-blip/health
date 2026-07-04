import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { api } from '../../lib/api';

export default function SettingsAdmin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ hospital_name: '', contact_email: '', maintenance_mode: false });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.put('/admin/settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSuccessMsg('System settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to update settings');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-emerald-500 text-slate-900 font-extrabold rounded-2xl shadow-2xl flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-red-500 text-slate-100 font-extrabold rounded-2xl shadow-2xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-cyan-400" />
          Global System Settings
        </h2>
        <button
          onClick={() => updateMutation.mutate(form)}
          className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg text-sm transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      <div className="bg-slate-850 p-6 border border-slate-800 rounded-2xl shadow-xl space-y-6 max-w-2xl">
        
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hospital / Clinic Name</label>
          <input
            type="text"
            value={form.hospital_name}
            onChange={e => setForm({ ...form, hospital_name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Contact Email</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={e => setForm({ ...form, contact_email: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-white font-bold">Maintenance Mode</h4>
            <p className="text-xs text-slate-400">If enabled, standard users will be blocked from logging in.</p>
          </div>
          <button
            onClick={() => setForm({ ...form, maintenance_mode: !form.maintenance_mode })}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.maintenance_mode ? 'bg-red-500' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${form.maintenance_mode ? 'left-7' : 'left-1'}`}></span>
          </button>
        </div>

      </div>
    </div>
  );
}
