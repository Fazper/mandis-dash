import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/money', label: 'Money', icon: '💰' },
    { path: '/projections', label: 'Projections', icon: '📈' },
    { path: '/stats', label: 'Stats & Log', icon: '📋' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
];

export default function Sidebar({ onExpandChange }) {
    const { user, profile, signOut } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const expanded = true; // Always expanded on desktop

    useEffect(() => {
        onExpandChange?.(expanded);
    }, [expanded, onExpandChange]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const getInitials = () => {
        if (profile?.display_name) {
            return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return '?';
    };

    return (
        <>
            <button
                className="mobile-menu-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            {mobileOpen && (
                <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}>
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
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `user-info ${isActive ? 'active' : ''}`}
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="user-avatar-img" />
                        ) : (
                            <span className="user-avatar-initials">{getInitials()}</span>
                        )}
                        <span className="user-email">{profile?.display_name || user?.email}</span>
                    </NavLink>
                    <button className="sign-out-btn" onClick={signOut}>
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
