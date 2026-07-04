import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity, Clock, FileText, TrendingUp, AlertTriangle, Wallet, Coins, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { api } from '../../lib/api';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const res = await api.get('/reports/executive-dashboard');
      return res.data.data;
    },
    refetchInterval: 8000 // auto-refresh dashboard stats every 8s
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <span className="h-10 w-10 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-4"></span>
        <p className="text-sm font-semibold tracking-wider uppercase">Loading clinical analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-6">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-bold">Failed to load analytics</h3>
        <p className="text-sm text-slate-500 mt-1">Make sure the backend API is online.</p>
      </div>
    );
  }

  // Format chart data
  const triageData = [
    { name: 'Critical', value: data.triage_breakdown.critical, color: '#EF4444' },
    { name: 'High', value: data.triage_breakdown.high, color: '#F97316' },
    { name: 'Medium', value: data.triage_breakdown.medium, color: '#EAB308' },
    { name: 'Low', value: data.triage_breakdown.low, color: '#10B981' }
  ];

  const revenueServiceData = data.finance?.revenue_by_service || [];
  const queueDeptData = data.queue_by_department || [];

  const topTestsData = data.top_tests.map((t: any) => ({
    name: t.name.length > 20 ? t.name.substring(0, 20) + '...' : t.name,
    count: t.count
  }));

  const COLORS = ['#00B5CC', '#6366F1', '#A855F7', '#EC4899'];
  const REVENUE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const DEPT_COLORS = ['#06B6D4', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#3B82F6'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Executive Dashboard</h1>
        <p className="text-slate-400 mt-1">Real-time clinical operations, finance, and departmental analytics.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered Patients</p>
            <h3 className="text-3xl font-extrabold text-white">{data.total_patients}</h3>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+{data.daily_registrations.change_pct}% today</span>
            </div>
          </div>
          <div className="p-4 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* ER Visits */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active ER Intakes</p>
            <h3 className="text-3xl font-extrabold text-white">{data.emergency_visits.count}</h3>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Priority treatment</span>
            </div>
          </div>
          <div className="p-4 bg-rose-500/10 text-rose-400 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        {/* Lab Tests */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Lab Orders</p>
            <h3 className="text-3xl font-extrabold text-white">{data.laboratory_tests.count}</h3>
            <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium">
              <span>+{data.laboratory_tests.change_pct}% weekly rise</span>
            </div>
          </div>
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Avg Waiting Time */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Queue Response Time</p>
            <h3 className="text-3xl font-extrabold text-white">{data.avg_waiting_minutes}m</h3>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Target: &lt;15 minutes</span>
            </div>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Secondary KPI Cards Grid (Finance & Operations) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Collected Revenue</p>
            <h3 className="text-3xl font-extrabold text-white font-mono">Rs. {(data.finance?.total_collected_revenue || 0).toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <span>Paid in full</span>
            </div>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding Dues</p>
            <h3 className="text-3xl font-extrabold text-amber-400 font-mono">Rs. {(data.finance?.pending_revenue || 0).toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <span>Pending collections</span>
            </div>
          </div>
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl">
            <Coins className="h-6 w-6" />
          </div>
        </div>

        {/* Active Queues */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Waiting Patients</p>
            <h3 className="text-3xl font-extrabold text-white">{data.active_queues || 0}</h3>
            <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium">
              <span>Across all departments</span>
            </div>
          </div>
          <div className="p-4 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Building2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Critical Vitals Banner if cases exist */}
      {data.critical_cases > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 animate-pulse shadow-lg">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Critical Cases Active in Triage</h4>
            <p className="text-xs text-red-400/80 mt-0.5">There are currently {data.critical_cases} patient(s) marked as Critical needing immediate doctor review.</p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ER Triage Board priority chart */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">ER Triage Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Patient distribution by priority category</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={triageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {triageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Laboratory top tests chart */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Top Diagnostic Panels</h3>
            <p className="text-xs text-slate-400 mt-0.5">Most frequently ordered laboratory items</p>
          </div>
          <div className="h-64 flex items-center justify-between">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topTestsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {topTestsData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="w-1/2 space-y-3.5 pr-2">
              {data.top_tests.map((test: any, index: number) => (
                <div key={test.name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-slate-300 font-medium truncate">{test.name}</span>
                  </div>
                  <span className="text-white font-bold">{test.count} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Finance & Operations Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Revenue by Service Type — Donut Chart */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Revenue by Service Type</h3>
            <p className="text-xs text-slate-400 mt-0.5">Breakdown of collected revenue across service categories</p>
          </div>
          <div className="h-64 flex items-center justify-between">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueServiceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {revenueServiceData.map((_: any, index: number) => (
                      <Cell key={`rev-cell-${index}`} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="w-1/2 space-y-3 pr-2">
              {revenueServiceData.map((item: any, index: number) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: REVENUE_COLORS[index % REVENUE_COLORS.length] }}></span>
                    <span className="text-slate-300 font-medium truncate">{item.name}</span>
                  </div>
                  <span className="text-white font-bold font-mono">Rs. {item.value.toLocaleString()}</span>
                </div>
              ))}
              {revenueServiceData.length === 0 && (
                <p className="text-xs text-slate-500 italic">No revenue data recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Department Queue Volume — Bar Chart */}
        <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Queue Volume by Department</h3>
            <p className="text-xs text-slate-400 mt-0.5">Current patient load distribution across departments</p>
          </div>
          <div className="h-64">
            {queueDeptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueDeptData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="department" stroke="#64748B" fontSize={10} tickLine={false} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {queueDeptData.map((_: any, index: number) => (
                      <Cell key={`dept-cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-slate-500 italic">No active queues across departments.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── System Status Footer ── */}
      <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/30 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-400">API Online</span>
          </span>
          <span>Auto-refresh: <span className="text-cyan-400 font-bold">8s</span></span>
          <span>Last updated: <span className="text-slate-300 font-semibold">{new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></span>
        </div>
        <span className="text-slate-600 font-mono">PakMed Care HMS v1.0</span>
      </div>
    </div>
  );
}
