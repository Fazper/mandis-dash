import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MoneyTracker from './components/MoneyTracker';
import Projections from './components/Projections';
import Stats from './components/Stats';
import './App.css';

function AppContent() {
    const { user, loading } = useAuth();
    const [sidebarExpanded, setSidebarExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebarExpanded');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const handleSidebarChange = useCallback((expanded) => {
        setSidebarExpanded(expanded);
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loader"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    return (
        <DashboardProvider>
            <div className={`app-layout ${sidebarExpanded ? '' : 'sidebar-collapsed'}`}>
                <Sidebar onExpandChange={handleSidebarChange} />
                <main className="main-content">
                    <ErrorBoundary>
                        <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/money" element={<MoneyTracker />} />
                            <Route path="/projections" element={<Projections />} />
                            <Route path="/stats" element={<Stats />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </ErrorBoundary>
                </main>
            </div>
        </DashboardProvider>
    );
}

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter basename="/mandis-dash">
                    <AppContent />
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
