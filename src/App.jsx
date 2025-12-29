import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MoneyTracker from './components/MoneyTracker';
import Projections from './components/Projections';
import Stats from './components/Stats';
import './App.css';

function AppContent() {
    const { user, loading } = useAuth();

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
            <div className="container">
                <Header />
                <nav className="tab-nav">
                    <NavLink to="/dashboard" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/money" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                        Money
                    </NavLink>
                    <NavLink to="/projections" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                        Projections
                    </NavLink>
                    <NavLink to="/stats" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                        Stats & Log
                    </NavLink>
                </nav>
                <main className="tab-content">
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
