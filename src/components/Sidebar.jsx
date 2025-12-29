import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/money', label: 'Money', icon: '💰' },
    { path: '/projections', label: 'Projections', icon: '📈' },
    { path: '/stats', label: 'Stats & Log', icon: '📋' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
];

export default function Sidebar({ onExpandChange }) {
    const { user, signOut } = useAuth();
    const expanded = true; // Always expanded

    useEffect(() => {
        onExpandChange?.(expanded);
    }, [expanded, onExpandChange]);

    return (
        <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <h1 className="brand-title">Mandis Dash</h1>
                    <p className="brand-subtitle">by fazper</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <span className="user-avatar">👤</span>
                    <span className="user-email">{user?.email}</span>
                </div>
                <button className="sign-out-btn" onClick={signOut}>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
