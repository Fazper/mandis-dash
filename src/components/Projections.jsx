import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';

const HOLIDAYS_2025 = ['2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'];
const HOLIDAYS_2026 = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25'];

function isHoliday(date) {
    const dateStr = date.toISOString().split('T')[0];
    return HOLIDAYS_2025.includes(dateStr) || HOLIDAYS_2026.includes(dateStr);
}

function isMarketDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6 && !isHoliday(date);
}

function getMarketDaysCount(start, end) {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        if (isMarketDay(current)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

export default function Projections() {
    const { state, ACCOUNT_LIMITS, calculateMoneyStats } = useDashboard();
    const [month, setMonth] = useState(1);
    const [year, setYear] = useState(2026);
    const [passRate, setPassRate] = useState(50);
    const [payoutPerAccount, setPayoutPerAccount] = useState(500);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const canReceivePayouts = (y, m) => {
        const [payoutYear, payoutMonth] = state.payoutStartDate.split('-').map(Number);
        if (y > payoutYear) return true;
        if (y === payoutYear && m >= payoutMonth - 1) return true;
        return false;
    };

    const calendarData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const payoutsEnabled = canReceivePayouts(year, month);

        const currentApexPassed = state.accounts.apex.filter(a => a.status === 'passed').length;
        const currentLucidPassed = state.accounts.lucid.filter(a => a.status === 'passed').length;
        const currentStats = calculateMoneyStats();

        let cumulativeApexPassed = currentApexPassed;
        let cumulativeLucidPassed = currentLucidPassed;
        let cumulativeExpenses = currentStats.totalSpent;
        const rate = passRate / 100;

        // Pre-month calculation
        if (firstDay > today) {
            const daysToStart = getMarketDaysCount(today, new Date(firstDay.getTime() - 86400000));
            for (let i = 0; i < daysToStart; i++) {
                const canBuyApex = Math.floor(cumulativeApexPassed) < ACCOUNT_LIMITS.apex;
                const canBuyLucid = Math.floor(cumulativeLucidPassed) < ACCOUNT_LIMITS.lucid;

                if (canBuyApex) {
                    cumulativeExpenses += state.costs.apexEval;
                    cumulativeApexPassed = Math.min(cumulativeApexPassed + rate, ACCOUNT_LIMITS.apex);
                    cumulativeExpenses += rate * state.costs.apexActivation;
                }
                if (canBuyLucid) {
                    cumulativeExpenses += state.costs.lucidEval;
                    cumulativeLucidPassed = Math.min(cumulativeLucidPassed + rate, ACCOUNT_LIMITS.lucid);
                }
            }
        }

        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ empty: true });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isHolidayDay = isHoliday(date);
            const isToday = date.toDateString() === today.toDateString();
            const isPast = date < today;
            const isMarket = isMarketDay(date);

            if (isMarket && !isPast) {
                const canBuyApex = Math.floor(cumulativeApexPassed) < ACCOUNT_LIMITS.apex;
                const canBuyLucid = Math.floor(cumulativeLucidPassed) < ACCOUNT_LIMITS.lucid;

                if (canBuyApex) {
                    cumulativeExpenses += state.costs.apexEval;
                    cumulativeApexPassed = Math.min(cumulativeApexPassed + rate, ACCOUNT_LIMITS.apex);
                    cumulativeExpenses += rate * state.costs.apexActivation;
                }
                if (canBuyLucid) {
                    cumulativeExpenses += state.costs.lucidEval;
                    cumulativeLucidPassed = Math.min(cumulativeLucidPassed + rate, ACCOUNT_LIMITS.lucid);
                }
            }

            const totalAccounts = Math.floor(cumulativeApexPassed) + Math.floor(cumulativeLucidPassed);
            const totalPayout = payoutsEnabled ? totalAccounts * payoutPerAccount : 0;

            days.push({
                day,
                isWeekend,
                isHolidayDay,
                isToday,
                isPast,
                isMarket,
                totalAccounts,
                totalPayout,
                payoutsEnabled
            });
        }

        const finalTotalAccounts = Math.floor(cumulativeApexPassed) + Math.floor(cumulativeLucidPassed);
        const finalPayout = payoutsEnabled ? finalTotalAccounts * payoutPerAccount : 0;
        const netProfit = finalPayout - cumulativeExpenses;

        return {
            days,
            summary: {
                totalAccounts: finalTotalAccounts,
                totalExpenses: cumulativeExpenses,
                totalPayout: finalPayout,
                netProfit,
                payoutsEnabled
            }
        };
    }, [month, year, passRate, payoutPerAccount, state]);

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
                        <div className="sim-input-group">
                            <label>Payout/Account ($)</label>
                            <input
                                type="number"
                                value={payoutPerAccount}
                                onChange={(e) => setPayoutPerAccount(parseInt(e.target.value) || 0)}
                                step="100"
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
                            <div className="label">Total Expenses</div>
                            <div className="value red">${calendarData.summary.totalExpenses.toLocaleString()}</div>
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
