import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  Activity, 
  Users, 
  Calendar, 
  FlaskConical, 
  CreditCard, 
  LogOut, 
  Clock, 
  LayoutDashboard,
  User,
  Stethoscope,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export default function Layout() {
  const { session, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time ticking clock in header
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!session) {
    return null;
  }

  // Sidebar authorization helper
  const hasAccess = (itemPath: string) => {
    const role = session.role;
    if (role === 'Super Administrator' || role === 'Hospital Administrator') return true;

    switch (itemPath) {
      case '/':
        return true; // Dashboard is read-only accessible to all
      case '/front-desk':
        return ['Front Desk Officer', 'Emergency Reception Officer'].includes(role);
      case '/emergency':
        return ['Emergency Nurse', 'Emergency Doctor', 'Emergency Reception Officer'].includes(role);
      case '/lab':
        return ['Laboratory Technician', 'Laboratory Supervisor', 'Emergency Doctor'].includes(role);
      case '/billing':
        return ['Billing Officer', 'Reporting Manager'].includes(role); // Allow Billing/Manager
      case '/emr':
        return ['Emergency Doctor', 'Emergency Nurse'].includes(role);
      case '/admin':
        return ['Super Administrator', 'Hospital Administrator'].includes(role);
      case '/workflow':
        return true; // Everyone can see the workflow and architecture explorer
      default:
        return false;
    }
  };

  const navItems = [
    { label: 'Executive Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Front Desk', path: '/front-desk', icon: Users },
    { label: 'Emergency Room', path: '/emergency', icon: Activity },
    { label: 'Lab / LIMS', path: '/lab', icon: FlaskConical },
    { label: 'Medical Records', path: '/emr', icon: Stethoscope },
    { label: 'Billing & Invoicing', path: '/billing', icon: CreditCard },
    { label: 'Admin Panel', path: '/admin', icon: ShieldCheck },
    { label: 'System Workflow', path: '/workflow', icon: BookOpen }
  ];

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Super Administrator':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Hospital Administrator':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Emergency Doctor':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'Emergency Nurse':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Laboratory Supervisor':
      case 'Laboratory Technician':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20';
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-slate-850 border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Sidebar Brand */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-white leading-none tracking-tight">PakMed Care</h2>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Clinical SaaS</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isAllowed = hasAccess(item.path);
            if (!isAllowed) return null;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/10' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User profile footer */}
        <div className="p-4 border-t border-slate-850 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-750">
              <User className="h-5 w-5 text-slate-350" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white truncate">{session.full_name}</p>
              <p className={`text-[9px] font-extrabold px-1.5 py-0.5 mt-1 rounded uppercase inline-block ${getRoleBadgeClass(session.role)}`}>
                {session.role.replace(' Officer', '')}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs border border-slate-750 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out Session</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Global Facility Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-850/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>All facility networks: connected</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5 py-1 px-3 bg-slate-800 rounded-lg border border-slate-750/30">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-white">{currentTime.toLocaleTimeString()}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Content Outlet scroll area */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-900/95">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
