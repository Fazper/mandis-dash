/**
 * Financial utilities for tracking expenses, payouts, and calculating metrics
 * Used by MoneyTracker and Stats components
 */

/**
 * FinancialTracker - Manages expense and payout data for analysis and charting
 */
export class FinancialTracker {
    constructor({ expenses = [], payouts = [], accountTypes = {}, firms = {} }) {
        this.expenses = expenses;
        this.payouts = payouts;
        this.accountTypes = accountTypes;
        this.firms = firms;
    }

    /**
     * Get total expenses
     */
    getTotalExpenses() {
        return this.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }

    /**
     * Get total payouts received
     */
    getTotalPayouts() {
        return this.payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
    }

    /**
     * Get net profit/loss (payouts - expenses)
     */
    getNetProfit() {
        return this.getTotalPayouts() - this.getTotalExpenses();
    }

    /**
     * Get ROI percentage
     */
    getROI() {
        const expenses = this.getTotalExpenses();
        if (expenses === 0) return 0;
        return ((this.getTotalPayouts() / expenses) * 100).toFixed(1);
    }

    /**
     * Group expenses by month for charting
     * @returns {Array} - [{month: 'Jan 25', amount: 1000}, ...]
     */
    getExpensesByMonth() {
        const monthly = {};

        this.expenses.forEach(exp => {
            if (exp.date && exp.amount) {
                const month = exp.date.substring(0, 7); // YYYY-MM
                monthly[month] = (monthly[month] || 0) + exp.amount;
            }
        });

        return Object.entries(monthly)
            .map(([month, amount]) => ({
                month: this._formatMonth(month),
                rawMonth: month,
                amount: Math.round(amount)
            }))
            .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
    }

    /**
     * Group payouts by month for charting
     * @returns {Array} - [{month: 'Jan 25', amount: 2000}, ...]
     */
    getPayoutsByMonth() {
        const monthly = {};

        this.payouts.forEach(p => {
            if (p.date && p.amount) {
                const month = p.date.substring(0, 7); // YYYY-MM
                monthly[month] = (monthly[month] || 0) + p.amount;
            }
        });

        return Object.entries(monthly)
            .map(([month, amount]) => ({
                month: this._formatMonth(month),
                rawMonth: month,
                amount: Math.round(amount)
            }))
            .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
    }

    /**
     * Get combined monthly data (expenses, payouts, net) for area chart
     * @returns {Array} - [{month: 'Jan 25', expenses: 1000, payouts: 2000, net: 1000}, ...]
     */
    getMonthlyFinancials() {
        const allMonths = new Set();
        const expenseMap = {};
        const payoutMap = {};

        // Collect all months from both expenses and payouts
        this.expenses.forEach(exp => {
            if (exp.date && exp.amount) {
                const month = exp.date.substring(0, 7);
                allMonths.add(month);
                expenseMap[month] = (expenseMap[month] || 0) + exp.amount;
            }
        });

        this.payouts.forEach(p => {
            if (p.date && p.amount) {
                const month = p.date.substring(0, 7);
                allMonths.add(month);
                payoutMap[month] = (payoutMap[month] || 0) + p.amount;
            }
        });

        // Build combined data
        return Array.from(allMonths)
            .sort()
            .map(month => ({
                month: this._formatMonth(month),
                rawMonth: month,
                expenses: Math.round(expenseMap[month] || 0),
                payouts: Math.round(payoutMap[month] || 0),
                net: Math.round((payoutMap[month] || 0) - (expenseMap[month] || 0))
            }));
    }

    /**
     * Get cumulative monthly data for running totals chart
     * @returns {Array} - [{month: 'Jan 25', cumulativeExpenses: 1000, cumulativePayouts: 2000, cumulativeNet: 1000}, ...]
     */
    getCumulativeMonthlyFinancials() {
        const monthly = this.getMonthlyFinancials();
        let cumExpenses = 0;
        let cumPayouts = 0;

        return monthly.map(m => {
            cumExpenses += m.expenses;
            cumPayouts += m.payouts;
            return {
                ...m,
                cumulativeExpenses: cumExpenses,
                cumulativePayouts: cumPayouts,
                cumulativeNet: cumPayouts - cumExpenses
            };
        });
    }

    /**
     * Get expenses grouped by firm
     * @returns {Array} - [{name: 'Apex', amount: 5000}, ...]
     */
    getExpensesByFirm() {
        const firmExpenses = {};

        this.expenses.forEach(exp => {
            if (!exp.amount) return;

            let firmName = 'Other';

            // Check if expense type matches an account type
            let matchedType = this.accountTypes[exp.type];

            // Check for activation expense pattern
            if (!matchedType) {
                const activationMatch = exp.type?.match(/^(.+)-activation$/);
                if (activationMatch) {
                    matchedType = this.accountTypes[activationMatch[1]];
                }
            }

            if (matchedType) {
                const firm = this.firms[matchedType.firmId];
                if (firm) firmName = firm.name;
            }

            firmExpenses[firmName] = (firmExpenses[firmName] || 0) + exp.amount;
        });

        return Object.entries(firmExpenses)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
            .sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get payouts grouped by firm
     * @returns {Array} - [{name: 'Apex', amount: 10000}, ...]
     */
    getPayoutsByFirm() {
        const firmPayouts = {};

        this.payouts.forEach(p => {
            if (!p.amount) return;

            let firmName = 'Other';

            // Check if payout is linked to an account type
            if (p.accountTypeId && this.accountTypes[p.accountTypeId]) {
                const type = this.accountTypes[p.accountTypeId];
                const firm = this.firms[type.firmId];
                if (firm) firmName = firm.name;
            } else if (p.firmId && this.firms[p.firmId]) {
                firmName = this.firms[p.firmId].name;
            }

            firmPayouts[firmName] = (firmPayouts[firmName] || 0) + p.amount;
        });

        return Object.entries(firmPayouts)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
            .sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get profit/loss by firm
     * @returns {Array} - [{name: 'Apex', expenses: 5000, payouts: 10000, profit: 5000}, ...]
     */
    getProfitByFirm() {
        const expensesByFirm = this.getExpensesByFirm();
        const payoutsByFirm = this.getPayoutsByFirm();

        const firmNames = new Set([
            ...expensesByFirm.map(e => e.name),
            ...payoutsByFirm.map(p => p.name)
        ]);

        return Array.from(firmNames).map(name => {
            const expenses = expensesByFirm.find(e => e.name === name)?.amount || 0;
            const payouts = payoutsByFirm.find(p => p.name === name)?.amount || 0;
            return {
                name,
                expenses,
                payouts,
                profit: payouts - expenses
            };
        }).sort((a, b) => b.profit - a.profit);
    }

    /**
     * Format month string for display
     * @private
     */
    _formatMonth(month) {
        // Parse YYYY-MM and create date in local timezone to avoid UTC offset issues
        const [year, monthNum] = month.split('-').map(Number);
        const date = new Date(year, monthNum - 1, 1); // monthNum - 1 because JS months are 0-indexed
        return date.toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit'
        });
    }
}

/**
 * Format expense type for display
 */
export function formatExpenseType(type, accountTypes, firms) {
    if (accountTypes[type]) {
        const firm = firms[accountTypes[type].firmId];
        const firmPrefix = firm ? `${firm.name} - ` : '';
        return `${firmPrefix}${accountTypes[type].name} Eval`;
    }
    const activationMatch = type.match(/^(.+)-activation$/);
    if (activationMatch && accountTypes[activationMatch[1]]) {
        const firm = firms[accountTypes[activationMatch[1]].firmId];
        const firmPrefix = firm ? `${firm.name} - ` : '';
        return `${firmPrefix}${accountTypes[activationMatch[1]].name} Activation`;
    }
    return type === 'other' ? 'Other' : type;
}

/**
 * Format payout source for display
 */
export function formatPayoutSource(payout, accountTypes, firms) {
    if (payout.accountTypeId && accountTypes[payout.accountTypeId]) {
        const type = accountTypes[payout.accountTypeId];
        const firm = firms[type.firmId];
        return firm ? `${firm.name} - ${type.name}` : type.name;
    }
    if (payout.firmId && firms[payout.firmId]) {
        return firms[payout.firmId].name;
    }
    return 'Other';
}
