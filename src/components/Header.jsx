import { useAuth } from '../context/AuthContext';

export default function Header() {
    const { user, signOut } = useAuth();

    return (
        <header className="app-header">
            <div className="header-left">
                <h1>Prop Trading Dashboard</h1>
                <p className="subtitle">Daily Goals & Account Tracker</p>
            </div>
            <div className="header-right">
                <span className="user-email">{user?.email}</span>
                <button className="sign-out-btn" onClick={signOut}>Sign Out</button>
            </div>
        </header>
    );
}
