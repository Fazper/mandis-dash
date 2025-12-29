import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MoneyTracker from './components/MoneyTracker';
import Projections from './components/Projections';
import Stats from './components/Stats';
import './App.css';

function AppContent() {
    const { user, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

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
                    {['dashboard', 'money', 'projections', 'stats'].map(tab => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'dashboard' && 'Dashboard'}
                            {tab === 'money' && 'Money'}
                            {tab === 'projections' && 'Projections'}
                            {tab === 'stats' && 'Stats & Log'}
                        </button>
                    ))}
                </nav>
                <main className="tab-content">
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'money' && <MoneyTracker />}
                    {activeTab === 'projections' && <Projections />}
                    {activeTab === 'stats' && <Stats />}
                </main>
            </div>
        </DashboardProvider>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
