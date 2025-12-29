// Shared projection utilities for calculating future expenses, payouts, and account growth

const HOLIDAYS_2025 = ['2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'];
const HOLIDAYS_2026 = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25'];

export function isHoliday(date) {
    const dateStr = date.toISOString().split('T')[0];
    return HOLIDAYS_2025.includes(dateStr) || HOLIDAYS_2026.includes(dateStr);
}

export function isMarketDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6 && !isHoliday(date);
}

export function getMarketDaysCount(start, end) {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        if (isMarketDay(current)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

/**
 * ProjectionEngine - Simulates account growth and calculates expenses/payouts
 * This is the core simulation logic used by both Projections calendar and Stats charts
 */
export class ProjectionEngine {
    constructor({ firms, accountTypes, accounts, passRate = 50, payoutStartDate }) {
        this.firms = firms;
        this.accountTypes = accountTypes;
        this.accounts = accounts;
        this.passRate = passRate / 100;
        this.payoutStartDate = payoutStartDate;

        // Initialize passed accounts from current state
        this.passedAccounts = {};
        Object.values(accountTypes).forEach(type => {
            const typeAccounts = accounts[type.id] || [];
            this.passedAccounts[type.id] = typeAccounts.filter(
                a => a.status === 'passed' || a.status === 'funded'
            ).length;
        });
    }

    /**
     * Check if payouts are enabled for a given year/month
     */
    canReceivePayouts(year, month) {
        if (!this.payoutStartDate) return false;
        const [payoutYear, payoutMonth] = this.payoutStartDate.split('-').map(Number);
        if (year > payoutYear) return true;
        if (year === payoutYear && month >= payoutMonth - 1) return true;
        return false;
    }

    /**
     * Simulate a single trading day
     * @param {boolean} trackExpenses - Whether to track expenses for this day
     * @returns {number} - Expenses incurred this day (if tracking)
     */
    simulateDay(trackExpenses = false) {
        let dayExpenses = 0;

        Object.values(this.accountTypes).forEach(type => {
            const firm = this.firms[type.firmId];
            if (!firm) return;

            // Calculate room using fractional values to prevent over-buying
            const firmPassedTotal = Object.values(this.accountTypes)
                .filter(t => t.firmId === type.firmId)
                .reduce((sum, t) => sum + this.passedAccounts[t.id], 0);
            const roomInFirm = firm.maxFunded - firmPassedTotal;

            if (roomInFirm <= 0) return; // Firm at max capacity

            // Accounts with consistency rule take 2x longer
            const effectiveRate = type.hasConsistencyRule ? this.passRate / 2 : this.passRate;
            const passIncrement = Math.min(effectiveRate, roomInFirm);

            if (passIncrement <= 0) return;

            // Track eval cost
            if (trackExpenses) {
                dayExpenses += type.evalCost || 0;
            }

            this.passedAccounts[type.id] += passIncrement;

            // Track activation cost when accounts pass
            if (type.activationCost > 0 && trackExpenses) {
                dayExpenses += passIncrement * type.activationCost;
            }
        });

        return dayExpenses;
    }

    /**
     * Calculate total passed accounts (floored for actual count)
     */
    getTotalPassedAccounts() {
        return Object.keys(this.passedAccounts).reduce(
            (sum, typeId) => sum + Math.floor(this.passedAccounts[typeId]),
            0
        );
    }

    /**
     * Calculate total payout based on passed accounts and their expected payouts
     * @param {boolean} payoutsEnabled - Whether payouts are enabled
     */
    calculatePayout(payoutsEnabled) {
        if (!payoutsEnabled) return 0;
        return Object.keys(this.passedAccounts).reduce((sum, typeId) => {
            const type = this.accountTypes[typeId];
            const passedCount = Math.floor(this.passedAccounts[typeId]);
            return sum + (passedCount * (type?.expectedPayout || 2000));
        }, 0);
    }

    /**
     * Clone the current state for branching simulations
     */
    clone() {
        const cloned = new ProjectionEngine({
            firms: this.firms,
            accountTypes: this.accountTypes,
            accounts: this.accounts,
            passRate: this.passRate * 100,
            payoutStartDate: this.payoutStartDate
        });
        cloned.passedAccounts = { ...this.passedAccounts };
        return cloned;
    }

    /**
     * Generate 12-month projection data for charts
     * @returns {Array} - Monthly projection data with expenses, payouts, net
     */
    generateYearlyProjection() {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const projection = [];
        let cumulativeExpenses = 0;
        let cumulativePayouts = 0;

        // Clone engine state for simulation
        const engine = this.clone();

        for (let i = 0; i < 12; i++) {
            const projMonth = (currentMonth + i) % 12;
            const projYear = currentYear + Math.floor((currentMonth + i) / 12);
            const monthLabel = monthNames[projMonth];

            // Get first and last day of this projection month
            const firstDay = new Date(projYear, projMonth, 1);
            const lastDay = new Date(projYear, projMonth + 1, 0);

            // Count market days in this month
            let monthExpenses = 0;
            const current = new Date(firstDay);

            while (current <= lastDay) {
                if (isMarketDay(current) && current >= today) {
                    monthExpenses += engine.simulateDay(true);
                } else if (isMarketDay(current) && current < today) {
                    // Past days - just advance simulation without tracking
                    engine.simulateDay(false);
                }
                current.setDate(current.getDate() + 1);
            }

            cumulativeExpenses += monthExpenses;

            // Calculate monthly payout based on current passed accounts
            const payoutsEnabled = engine.canReceivePayouts(projYear, projMonth);
            const monthlyPayout = engine.calculatePayout(payoutsEnabled);
            cumulativePayouts += monthlyPayout;

            projection.push({
                month: monthLabel,
                year: projYear,
                expenses: Math.round(cumulativeExpenses),
                payouts: Math.round(cumulativePayouts),
                net: Math.round(cumulativePayouts - cumulativeExpenses),
                accounts: engine.getTotalPassedAccounts(),
                payoutsEnabled
            });
        }

        return projection;
    }
}

/**
 * Generate monthly projection for a specific month (used by Projections calendar)
 */
export function generateMonthProjection({
    year,
    month,
    passRate,
    firms,
    accountTypes,
    accounts,
    payoutStartDate
}) {
    const engine = new ProjectionEngine({
        firms,
        accountTypes,
        accounts,
        passRate,
        payoutStartDate
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const payoutsEnabled = engine.canReceivePayouts(year, month);

    let monthlyExpenses = 0;

    // Pre-month simulation (advance to start of selected month)
    if (firstDay > today) {
        const daysToStart = getMarketDaysCount(today, new Date(firstDay.getTime() - 86400000));
        for (let i = 0; i < daysToStart; i++) {
            engine.simulateDay(false);
        }
    }

    // Build calendar days
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
            monthlyExpenses += engine.simulateDay(true);
        }

        days.push({
            day,
            isWeekend,
            isHolidayDay,
            isToday,
            isPast,
            isMarket,
            totalAccounts: engine.getTotalPassedAccounts(),
            totalPayout: engine.calculatePayout(payoutsEnabled),
            payoutsEnabled
        });
    }

    const finalPayout = engine.calculatePayout(payoutsEnabled);
    const netProfit = finalPayout - monthlyExpenses;

    return {
        days,
        summary: {
            totalAccounts: engine.getTotalPassedAccounts(),
            monthlyExpenses,
            totalPayout: finalPayout,
            netProfit,
            payoutsEnabled
        }
    };
}
