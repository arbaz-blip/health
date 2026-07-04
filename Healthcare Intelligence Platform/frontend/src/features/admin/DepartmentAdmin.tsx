import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';

export default function DepartmentAdmin() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: departments, isLoading } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const res = await api.get('/admin/departments');
      return res.data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('/admin/departments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setShowAdd(false);
      setForm({ name: '', code: '' });
      setSuccessMsg('Department created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create department');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/admin/departments/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    }
  });

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
          <Building2 className="h-5 w-5 text-cyan-400" />
          Hospital Departments
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-3">New Department</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Department Name (e.g. Cardiology)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Code (e.g. CARD)"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
            <button
              onClick={() => createMutation.mutate(form)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg text-sm"
            >
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
              <th className="p-4 pl-6">Code</th>
              <th className="p-4">Department Name</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">Loading...</td>
              </tr>
            ) : departments?.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-800/20">
                <td className="p-4 pl-6 font-mono font-bold text-cyan-400">{d.code}</td>
                <td className="p-4 font-bold text-slate-200">{d.name}</td>
                <td className="p-4 pr-6 text-right">
                  <button
                    onClick={() => {
                      if(window.confirm('Delete this department?')) deleteMutation.mutate(d.id);
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold rounded-lg text-xs transition-colors border border-red-500/20"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
