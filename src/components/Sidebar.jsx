import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/money', label: 'Money', icon: '💰' },
    { path: '/projections', label: 'Projections', icon: '📈' },
    { path: '/stats', label: 'Stats & Log', icon: '📋' }
];

export default function Sidebar({ onExpandChange }) {
    const { user, signOut } = useAuth();
    const [expanded, setExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebarExpanded');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('sidebarExpanded', JSON.stringify(expanded));
        onExpandChange?.(expanded);
    }, [expanded, onExpandChange]);

    const toggleSidebar = () => {
        setExpanded(prev => !prev);
    };

    return (
        <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <span className="brand-icon">🎯</span>
                    {expanded && (
                        <div className="brand-text">
                            <h1>Mandis Dash</h1>
                            <p>Daily Goals & Account Tracker</p>
                        </div>
                    )}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={toggleSidebar}
                    aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    <span className="toggle-icon">{expanded ? '‹' : '›'}</span>
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        title={!expanded ? item.label : undefined}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {expanded && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {expanded ? (
                    <>
                        <div className="user-info">
                            <span className="user-avatar">👤</span>
                            <span className="user-email">{user?.email}</span>
                        </div>
                        <button className="sign-out-btn" onClick={signOut}>
                            Sign Out
                        </button>
                    </>
                ) : (
                    <button
                        className="sign-out-btn icon-only"
                        onClick={signOut}
                        title="Sign Out"
                    >
                        🚪
                    </button>
                )}
            </div>
        </aside>
    );
}
