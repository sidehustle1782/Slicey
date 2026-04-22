import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import NewGroup from './pages/NewGroup';
import GroupDetail from './pages/GroupDetail';
import AddMember from './pages/AddMember';
import EditGroup from './pages/EditGroup';
import Activity from './pages/Activity';
import Notifications from './pages/Notifications';

import './styles/global.css';

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border2)',
              borderRadius: '12px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0f0e0c' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f0e0c' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/groups/new" element={<NewGroup />} />
                    <Route path="/groups/:groupId" element={<GroupDetail />} />
                    <Route path="/groups/:groupId/add-member" element={<AddMember />} />
                    <Route path="/groups/:groupId/edit" element={<EditGroup />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  );
}
