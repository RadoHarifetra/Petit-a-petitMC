import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';

// Lazy load components for performance
const Dashboard = lazy(() => import('./views/Dashboard'));
const Clients = lazy(() => import('./views/Clients'));
const Quotes = lazy(() => import('./views/Quotes'));
const Tracking = lazy(() => import('./views/Tracking'));
const Forwarders = lazy(() => import('./views/Forwarders'));
const Warehouse = lazy(() => import('./views/Warehouse'));
const History = lazy(() => import('./views/History'));
const Settings = lazy(() => import('./views/Settings'));

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-bg overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 pt-20 md:pt-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/forwarders" element={<Forwarders />} />
            <Route path="/warehouse" element={<Warehouse />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
