import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
    const { user, profile, updateProfile, updateAvatar, updatePassword } = useAuth();
    const { accounts, expenses, payouts, firms, accountTypes } = useDashboard();
    const toast = useToast();

    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const fileInputRef = useRef(null);

    // Calculate stats
    const allAccounts = Object.values(accounts).flat();
    const totalAccounts = allAccounts.length;
    const fundedAccounts = allAccounts.filter(a => a.status === 'funded').length;
    const passedAccounts = allAccounts.filter(a => a.status === 'passed').length;
    const failedAccounts = allAccounts.filter(a => a.status === 'failed').length;
    const inProgressAccounts = allAccounts.filter(a => a.status === 'in-progress' || a.status === 'halfway').length;
    const successRate = totalAccounts > 0 ? (((fundedAccounts + passedAccounts) / totalAccounts) * 100).toFixed(0) : 0;

    const totalSpent = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPayouts = (payouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const netProfit = totalPayouts - totalSpent;

    const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    }) : 'Unknown';

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        setAvatarLoading(true);
        const { error } = await updateAvatar(file);
        setAvatarLoading(false);

        if (error) {
            toast.error(`Failed to upload avatar: ${error.message}`);
        } else {
            toast.success('Avatar updated!');
        }
    };

    const handleSaveName = async () => {
        if (!displayName.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        const { error } = await updateProfile({ display_name: displayName.trim() });

        if (error) {
            toast.error(`Failed to update name: ${error.message}`);
        } else {
            toast.success('Display name updated!');
            setIsEditingName(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setPasswordLoading(true);
        const { error } = await updatePassword(newPassword);
        setPasswordLoading(false);

        if (error) {
            toast.error(`Failed to update password: ${error.message}`);
        } else {
            toast.success('Password updated successfully!');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordForm(false);
        }
    };

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
        <div className="profile-page">
            <section className="profile-header-section">
                <div className="profile-avatar-container">
                    <button
                        className="avatar-button"
                        onClick={handleAvatarClick}
                        disabled={avatarLoading}
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="avatar-image" />
                        ) : (
                            <span className="avatar-initials">{getInitials()}</span>
                        )}
                        <div className="avatar-overlay">
                            {avatarLoading ? 'Uploading...' : 'Change'}
                        </div>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />
                </div>

                <div className="profile-info">
                    {isEditingName ? (
                        <div className="name-edit-row">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter display name"
                                autoFocus
                            />
                            <button className="save-btn" onClick={handleSaveName}>Save</button>
                            <button className="cancel-btn" onClick={() => setIsEditingName(false)}>Cancel</button>
                        </div>
                    ) : (
                        <div className="name-display-row">
                            <h1 className="profile-name">
                                {profile?.display_name || 'Set Display Name'}
                            </h1>
                            <button className="edit-name-btn" onClick={() => {
                                setDisplayName(profile?.display_name || '');
                                setIsEditingName(true);
                            }}>
                                Edit
                            </button>
                        </div>
                    )}
                    <p className="profile-email">{user?.email}</p>
                    <p className="profile-joined">Member since {joinDate}</p>
                </div>
            </section>

            <div className="profile-grid">
                <section className="profile-stats">
                    <h2>Account Statistics</h2>
                    <div className="stats-cards">
                        <div className="stat-card">
                            <span className="stat-value">{totalAccounts}</span>
                            <span className="stat-label">Total Accounts</span>
                        </div>
                        <div className="stat-card green">
                            <span className="stat-value">{fundedAccounts}</span>
                            <span className="stat-label">Funded</span>
                        </div>
                        <div className="stat-card blue">
                            <span className="stat-value">{passedAccounts}</span>
                            <span className="stat-label">Passed</span>
                        </div>
                        <div className="stat-card purple">
                            <span className="stat-value">{inProgressAccounts}</span>
                            <span className="stat-label">In Progress</span>
                        </div>
                        <div className="stat-card red">
                            <span className="stat-value">{failedAccounts}</span>
                            <span className="stat-label">Failed</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{successRate}%</span>
                            <span className="stat-label">Success Rate</span>
                        </div>
                    </div>
                </section>

                <section className="profile-financials">
                    <h2>Financial Summary</h2>
                    <div className="financial-cards">
                        <div className="financial-card">
                            <span className="financial-label">Total Spent</span>
                            <span className="financial-value red">${totalSpent.toLocaleString()}</span>
                        </div>
                        <div className="financial-card">
                            <span className="financial-label">Total Payouts</span>
                            <span className="financial-value green">${totalPayouts.toLocaleString()}</span>
                        </div>
                        <div className="financial-card highlight">
                            <span className="financial-label">Net Profit</span>
                            <span className={`financial-value ${netProfit >= 0 ? 'green' : 'red'}`}>
                                {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </section>

                <section className="profile-firms">
                    <h2>Active Firms</h2>
                    <div className="firms-list">
                        {Object.values(firms).length > 0 ? (
                            Object.values(firms).map(firm => {
                                const firmTypes = Object.values(accountTypes).filter(t => t.firmId === firm.id);
                                const firmAccounts = firmTypes.flatMap(type => accounts[type.id] || []);
                                const firmFunded = firmAccounts.filter(a => a.status === 'funded').length;

                                return (
                                    <div key={firm.id} className={`firm-badge ${firm.color}`}>
                                        <span className="firm-name">{firm.name}</span>
                                        <span className="firm-count">{firmFunded} funded</span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="no-firms">No firms configured yet</p>
                        )}
                    </div>
                </section>

                <section className="profile-security">
                    <h2>Security</h2>
                    {showPasswordForm ? (
                        <form className="password-form" onSubmit={handlePasswordChange}>
                            <div className="form-field">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    minLength={6}
                                    required
                                />
                            </div>
                            <div className="form-field">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                            <div className="password-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="save-btn"
                                    disabled={passwordLoading}
                                >
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="security-info">
                            <p>Protect your account with a strong password.</p>
                            <button
                                className="change-password-btn"
                                onClick={() => setShowPasswordForm(true)}
                            >
                                Change Password
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
