import React, { useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { useAuthStore, Role } from '../../stores/authStore';
import { api } from '../../lib/api';

export default function Login() {
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data;
      if (data.status === 'success') {
        setSession({
          id: data.user.id,
          email: data.user.email,
          role: data.user.role as Role,
          full_name: data.user.full_name,
          token: data.token
        });
      } else {
        setLoginError(data.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      // Check if backend responded or if offline fallback login is needed
      const errorMessage = err.response?.data?.message;
      if (errorMessage) {
        setLoginError(errorMessage);
      } else {
        // Offline fallback login for easy local development evaluation
        const demoUsers: Record<string, { role: Role; name: string }> = {
          'admin@hospital.com': { role: 'Super Administrator', name: 'Dr. Arthur Pendelton' },
          'frontdesk@hospital.com': { role: 'Front Desk Officer', name: 'Sarah Miller' },
          'nurse@hospital.com': { role: 'Emergency Nurse', name: 'Jane Foster, RN' },
          'doctor@hospital.com': { role: 'Emergency Doctor', name: 'Dr. Gregory House' },
          'tech@hospital.com': { role: 'Laboratory Technician', name: 'Mark Ruffalo' },
          'supervisor@hospital.com': { role: 'Laboratory Supervisor', name: 'Dr. Robert Bruce' },
          'manager@hospital.com': { role: 'Reporting Manager', name: 'Walter White' }
        };

        if (demoUsers[email]) {
          const demo = demoUsers[email];
          setSession({
            id: 'u-mock',
            email,
            role: demo.role,
            full_name: demo.name,
            token: 'mock-token-secret'
          });
        } else {
          setLoginError('Backend offline and demo credentials not found. Try "frontdesk@hospital.com" with password123.');
        }
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl mb-4">
            <Activity className="h-10 w-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">PakMed Care HMS</h1>
          <p className="text-slate-400 mt-2">Enterprise Clinical Portal</p>
        </div>

        {loginError && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm animate-shake">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Staff Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., frontdesk@hospital.com" 
              className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loginLoading}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loginLoading ? (
              <><span className="h-4 w-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin"></span> Authenticating...</>
            ) : 'Log In to Workspace'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 text-center">Quick Login Assist</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { name: 'Front Desk', email: 'frontdesk@hospital.com' },
              { name: 'ER Nurse', email: 'nurse@hospital.com' },
              { name: 'ER Doctor', email: 'doctor@hospital.com' },
              { name: 'Lab Tech', email: 'tech@hospital.com' },
              { name: 'Supervisor', email: 'supervisor@hospital.com' },
              { name: 'Admin', email: 'admin@hospital.com' }
            ].map(u => (
              <button
                key={u.email}
                onClick={() => { setEmail(u.email); setPassword('password123'); }}
                className="px-2.5 py-1 text-xs bg-slate-750 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/50 transition-colors"
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
