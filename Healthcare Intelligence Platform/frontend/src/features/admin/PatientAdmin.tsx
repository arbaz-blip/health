import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export default function PatientAdmin() {
  const [search, setSearch] = useState('');

  const { data: patients, isLoading } = useQuery({
    queryKey: ['admin-patients'],
    queryFn: async () => {
      const res = await api.get('/admin/patients');
      return res.data.data;
    }
  });

  const filtered = patients?.filter((p: any) => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          Global Patient Database
        </h2>
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, MRN, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
              <th className="p-4 pl-6">MRN</th>
              <th className="p-4">Patient Name</th>
              <th className="p-4">Gender / Age</th>
              <th className="p-4">Phone</th>
              <th className="p-4 pr-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">Loading patients...</td>
              </tr>
            ) : filtered?.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  No patients found
                </td>
              </tr>
            ) : filtered?.map((p: any) => {
              const age = new Date().getFullYear() - new Date(p.dob).getFullYear();
              return (
                <tr key={p.id} className="hover:bg-slate-800/20">
                  <td className="p-4 pl-6 font-mono text-cyan-400 text-xs font-bold">{p.mrn}</td>
                  <td className="p-4 font-bold text-white">{p.full_name}</td>
                  <td className="p-4 text-slate-400">{p.gender} / {age} yrs</td>
                  <td className="p-4 text-slate-400 font-mono text-xs">{p.phone}</td>
                  <td className="p-4 pr-6 text-right">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-extrabold rounded">
                      Active
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
