import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { generateMonthProjection } from '../utils/projections';

export default function Projections() {
    const { state, firms, accountTypes, accounts } = useDashboard();
    const [month, setMonth] = useState(1);
    const [year, setYear] = useState(2026);
    const [passRate, setPassRate] = useState(50);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const calendarData = useMemo(() => {
        return generateMonthProjection({
            year,
            month,
            passRate,
            firms,
            accountTypes,
            accounts,
            payoutStartDate: state.payoutStartDate
        });
    }, [month, year, passRate, state.payoutStartDate, firms, accountTypes, accounts]);

    const [payoutYear, payoutMonth] = state.payoutStartDate.split('-').map(Number);
    const payoutStartLabel = `${monthNames[payoutMonth - 1]} ${payoutYear}`;

    return (
        <div className="projections-tab">
            <section className="simulator">
                <h2>Projections Calendar</h2>
                <div className="simulator-card">
                    <div className="simulator-inputs">
                        <div className="sim-input-group">
                            <label>Month</label>
                            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                                {monthNames.map((name, i) => (
                                    <option key={i} value={i}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sim-input-group">
                            <label>Year</label>
                            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                            </select>
                        </div>
                        <div className="sim-input-group">
                            <label>Pass Rate (%)</label>
                            <input
                                type="number"
                                value={passRate}
                                onChange={(e) => setPassRate(parseInt(e.target.value) || 0)}
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>

                    <div className="calendar-container">
                        <div className="calendar-header">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="day-label">{day}</div>
                            ))}
                        </div>
                        <div className="calendar-grid">
                            {calendarData.days.map((d, i) => (
                                <div
                                    key={i}
                                    className={`calendar-day ${d.empty ? 'empty' : ''} ${d.isWeekend ? 'weekend' : ''} ${d.isHolidayDay ? 'holiday' : ''} ${d.isToday ? 'today' : ''} ${d.isPast ? 'past' : ''}`}
                                >
                                    {!d.empty && (
                                        <>
                                            <span className="day-number">{d.day}</span>
                                            {!d.isPast && !d.isWeekend && (
                                                <div className="day-stats">
                                                    <div className="stat-row">
                                                        <span className="stat-label">Accts</span>
                                                        <span className="stat-value accounts">{d.totalAccounts}</span>
                                                    </div>
                                                    <div className="stat-row">
                                                        <span className="stat-label">Pay</span>
                                                        <span className={`stat-value payout ${!d.payoutsEnabled ? 'disabled' : ''}`}>
                                                            {d.payoutsEnabled ? `$${(d.totalPayout/1000).toFixed(1)}k` : '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="calendar-summary">
                        <div className="summary-item">
                            <div className="label">End of {monthNames[month]}</div>
                            <div className="value purple">{calendarData.summary.totalAccounts} accounts</div>
                        </div>
                        <div className="summary-item">
                            <div className="label">{monthNames[month]} Expenses</div>
                            <div className="value red">${calendarData.summary.monthlyExpenses.toLocaleString()}</div>
                        </div>
                        <div className="summary-item">
                            <div className="label">
                                Potential Payout
                                {!calendarData.summary.payoutsEnabled && ` (starts ${payoutStartLabel})`}
                            </div>
                            <div className={`value ${calendarData.summary.payoutsEnabled ? 'green' : 'muted'}`}>
                                {calendarData.summary.payoutsEnabled ? `$${calendarData.summary.totalPayout.toLocaleString()}` : '$0'}
                            </div>
                        </div>
                        <div className="summary-item">
                            <div className="label">Net Profit</div>
                            <div className={`value ${calendarData.summary.netProfit >= 0 ? 'green' : 'red'}`}>
                                ${calendarData.summary.netProfit.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
