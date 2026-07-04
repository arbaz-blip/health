import { create } from 'zustand';

export type Role = 
  | 'Super Administrator'
  | 'Hospital Administrator'
  | 'Front Desk Officer'
  | 'Emergency Reception Officer'
  | 'Emergency Nurse'
  | 'Emergency Doctor'
  | 'Laboratory Technician'
  | 'Laboratory Supervisor'
  | 'Reporting Manager';

export interface UserSession {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  token: string;
}

interface AuthState {
  session: UserSession | null;
  setSession: (session: UserSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load initial session from local storage if present
  const savedSession = localStorage.getItem('hip_session');
  let initialSession: UserSession | null = null;
  
  if (savedSession) {
    try {
      initialSession = JSON.parse(savedSession);
    } catch {
      localStorage.removeItem('hip_session');
    }
  }

  return {
    session: initialSession,
    setSession: (session) => {
      if (session) {
        localStorage.setItem('hip_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('hip_session');
      }
      set({ session });
    },
    logout: () => {
      localStorage.removeItem('hip_session');
      set({ session: null });
    }
  };
});
