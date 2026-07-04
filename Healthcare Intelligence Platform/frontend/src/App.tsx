import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';

// Feature Components
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import FrontDesk from './features/front-desk/FrontDesk';
import Emergency from './features/emergency/Emergency';
import Laboratory from './features/laboratory/Laboratory';
import Billing from './features/billing/Billing';
import EMR from './features/emr/EMR';
import Admin from './features/admin/Admin';
import WorkflowExplorer from './features/workflow/WorkflowExplorer';

// Shared Layout Wrapper
import Layout from './components/Layout';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Route Guard: Redirects anonymous visitors to login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Route Guard: Prevents authenticated users from returning to login
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore();
  if (session) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          
          {/* Public Authentication Route */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />

          {/* Secure Layout Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Nested Feature Routing */}
            <Route index element={<Dashboard />} />
            <Route path="front-desk" element={<FrontDesk />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="lab" element={<Laboratory />} />
            <Route path="billing" element={<Billing />} />
            <Route path="emr" element={<EMR />} />
            <Route path="admin" element={<Admin />} />
            <Route path="workflow" element={<WorkflowExplorer />} />
          </Route>

          {/* Route Catch All fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
