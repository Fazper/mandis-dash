import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DashboardContext = createContext({});

export const useDashboard = () => useContext(DashboardContext);

// Firm configurations - easy to add new firms here
const FIRMS = {
    apex: {
        id: 'apex',
        name: 'Apex',
        accountName: 'Apex 50K',
        maxFunded: 20,
        evalCostKey: 'apexEval',
        activationCostKey: 'apexActivation',
        color: 'orange',
        hasConsistencyRule: false,
        defaultProfitTarget: 3000
    },
    lucid: {
        id: 'lucid',
        name: 'Lucid',
        accountName: 'Lucid Flex 50K',
        maxFunded: 5,
        evalCostKey: 'lucidEval',
        activationCostKey: null,
        color: 'purple',
        hasConsistencyRule: true,
        defaultProfitTarget: 3000
    }
};

const defaultCosts = {
    apexEval: 25,
    apexActivation: 65,
    lucidEval: 80,
    payoutEstimate: 2000
};

export function DashboardProvider({ children }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [costs, setCosts] = useState(defaultCosts);
    const [payoutStartDate, setPayoutStartDate] = useState('2026-01');
    const [accounts, setAccounts] = useState({});
    const [expenses, setExpenses] = useState([]);
    const [dailyLog, setDailyLog] = useState([]);

    // Load all data on mount
    useEffect(() => {
        if (user) {
            loadAllData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadSettings(),
                loadAccounts(),
                loadExpenses(),
                loadDailyLogs()
            ]);
        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    };

    const loadSettings = async () => {
        const { data } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setCosts(data.costs || defaultCosts);
            setPayoutStartDate(data.payout_start_date || '2026-01');
        }
    };

    const loadAccounts = async () => {
        const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        // Group accounts by firm_id
        const grouped = {};
        Object.keys(FIRMS).forEach(firmId => {
            grouped[firmId] = [];
        });

        if (data) {
            data.forEach(acc => {
                if (grouped[acc.firm_id]) {
                    grouped[acc.firm_id].push({
                        id: acc.id,
                        name: acc.name,
                        status: acc.status,
                        evalCost: parseFloat(acc.eval_cost) || 0,
                        profitTarget: parseFloat(acc.profit_target) || 3000,
                        balance: parseFloat(acc.balance) || 0,
                        passedDate: acc.passed_date,
                        fundedDate: acc.funded_date,
                        createdDate: acc.created_at?.split('T')[0]
                    });
                }
            });
        }

        setAccounts(grouped);
    };

    const loadExpenses = async () => {
        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (data) {
            setExpenses(data.map(exp => ({
                id: exp.id,
                type: exp.type,
                amount: parseFloat(exp.amount),
                note: exp.note,
                date: exp.date
            })));
        }
    };

    const loadDailyLogs = async () => {
        const { data } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (data) {
            setDailyLog(data.map(log => ({
                id: log.id,
                date: log.date,
                boughtApex: log.bought_apex,
                boughtLucid: log.bought_lucid,
                tradedOpen: log.traded_open,
                accountsPassed: log.accounts_passed,
                notes: log.notes
            })));
        }
    };

    // Settings functions
    const updateCost = async (key, value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) return;

        const newCosts = { ...costs, [key]: num };
        setCosts(newCosts);

        await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                costs: newCosts,
                payout_start_date: payoutStartDate,
                updated_at: new Date().toISOString()
            });
    };

    const updatePayoutStartDate = async (value) => {
        setPayoutStartDate(value);

        await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                costs: costs,
                payout_start_date: value,
                updated_at: new Date().toISOString()
            });
    };

    // Account functions
    const addAccountWithCost = async (firmId, evalCost = 0, profitTarget = null) => {
        const firm = FIRMS[firmId];
        if (!firm) return;

        const firmAccounts = accounts[firmId] || [];
        const passedCount = firmAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;

        if (passedCount >= firm.maxFunded) {
            alert(`Max ${firm.maxFunded} ${firm.name} funded accounts reached!`);
            return;
        }

        const accountNum = firmAccounts.length + 1;
        const accountName = `${firm.accountName} #${accountNum}`;

        // Insert account
        const { data: newAccount, error } = await supabase
            .from('accounts')
            .insert({
                user_id: user.id,
                firm_id: firmId,
                name: accountName,
                status: 'in-progress',
                eval_cost: evalCost,
                profit_target: profitTarget || firm.defaultProfitTarget,
                balance: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Add account error:', error);
            return;
        }

        // Add expense if eval cost provided
        if (evalCost > 0) {
            await addExpense(firmId, evalCost, accountName);
        }

        // Update local state
        setAccounts(prev => ({
            ...prev,
            [firmId]: [...(prev[firmId] || []), {
                id: newAccount.id,
                name: accountName,
                status: 'in-progress',
                evalCost,
                profitTarget: profitTarget || firm.defaultProfitTarget,
                balance: 0,
                passedDate: null,
                fundedDate: null,
                createdDate: new Date().toISOString().split('T')[0]
            }]
        }));
    };

    const updateAccountStatus = async (firmId, accountId, status, cost = 0) => {
        const firm = FIRMS[firmId];
        const today = new Date().toISOString().split('T')[0];

        const updates = { status };
        if (status === 'passed') {
            updates.passed_date = today;
        } else if (status === 'funded') {
            updates.funded_date = today;
        }

        const { error } = await supabase
            .from('accounts')
            .update(updates)
            .eq('id', accountId);

        if (error) {
            console.error('Update status error:', error);
            return;
        }

        // Add expense for activation/pass cost
        if (cost > 0 && (status === 'passed' || status === 'funded')) {
            const acc = accounts[firmId]?.find(a => a.id === accountId);
            const expenseType = status === 'funded' ? `${firmId}-activation` : firmId;
            await addExpense(expenseType, cost, `${acc?.name || firm.accountName} - ${status}`);
        }

        // Update local state
        setAccounts(prev => ({
            ...prev,
            [firmId]: (prev[firmId] || []).map(acc =>
                acc.id === accountId
                    ? {
                        ...acc,
                        status,
                        passedDate: status === 'passed' ? today : acc.passedDate,
                        fundedDate: status === 'funded' ? today : acc.fundedDate
                    }
                    : acc
            )
        }));
    };

    const updateAccountBalance = async (firmId, accountId, balance) => {
        const balanceNum = parseFloat(balance) || 0;

        const { error } = await supabase
            .from('accounts')
            .update({ balance: balanceNum })
            .eq('id', accountId);

        if (error) {
            console.error('Update balance error:', error);
            return;
        }

        setAccounts(prev => ({
            ...prev,
            [firmId]: (prev[firmId] || []).map(acc =>
                acc.id === accountId ? { ...acc, balance: balanceNum } : acc
            )
        }));
    };

    const updateAccountProfitTarget = async (firmId, accountId, profitTarget) => {
        const targetNum = parseFloat(profitTarget) || 0;

        const { error } = await supabase
            .from('accounts')
            .update({ profit_target: targetNum })
            .eq('id', accountId);

        if (error) {
            console.error('Update profit target error:', error);
            return;
        }

        setAccounts(prev => ({
            ...prev,
            [firmId]: (prev[firmId] || []).map(acc =>
                acc.id === accountId ? { ...acc, profitTarget: targetNum } : acc
            )
        }));
    };

    const deleteAccount = async (firmId, accountId) => {
        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId);

        if (error) {
            console.error('Delete account error:', error);
            return;
        }

        setAccounts(prev => ({
            ...prev,
            [firmId]: (prev[firmId] || []).filter(acc => acc.id !== accountId)
        }));
    };

    // Expense functions
    const addExpense = async (type, amount, note = '') => {
        const { data: newExpense, error } = await supabase
            .from('expenses')
            .insert({
                user_id: user.id,
                type,
                amount: parseFloat(amount),
                note,
                date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (error) {
            console.error('Add expense error:', error);
            return;
        }

        setExpenses(prev => [{
            id: newExpense.id,
            type,
            amount: parseFloat(amount),
            note,
            date: newExpense.date
        }, ...prev]);
    };

    const deleteExpense = async (expenseId) => {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);

        if (error) {
            console.error('Delete expense error:', error);
            return;
        }

        setExpenses(prev => prev.filter(e => e.id !== expenseId));
    };

    // Reset all data
    const resetData = async () => {
        if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) return;

        await Promise.all([
            supabase.from('accounts').delete().eq('user_id', user.id),
            supabase.from('expenses').delete().eq('user_id', user.id),
            supabase.from('daily_logs').delete().eq('user_id', user.id),
            supabase.from('user_settings').delete().eq('user_id', user.id)
        ]);

        window.location.reload();
    };

    // Computed values
    const calculateMoneyStats = () => {
        const stats = {
            totalSpent: 0,
            byFirm: {}
        };

        Object.keys(FIRMS).forEach(firmId => {
            stats.byFirm[firmId] = {
                evalSpent: 0,
                evalCount: 0,
                activationSpent: 0,
                activationCount: 0
            };
        });

        expenses.forEach(exp => {
            stats.totalSpent += exp.amount;

            Object.keys(FIRMS).forEach(firmId => {
                if (exp.type === firmId) {
                    stats.byFirm[firmId].evalSpent += exp.amount;
                    stats.byFirm[firmId].evalCount++;
                } else if (exp.type === `${firmId}-activation`) {
                    stats.byFirm[firmId].activationSpent += exp.amount;
                    stats.byFirm[firmId].activationCount++;
                }
            });
        });

        return stats;
    };

    const getTotalPassed = () => {
        return Object.keys(FIRMS).reduce((total, firmId) => {
            const firmAccounts = accounts[firmId] || [];
            return total + firmAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;
        }, 0);
    };

    const getFirmLimit = (firmId) => {
        return FIRMS[firmId]?.maxFunded || 0;
    };

    // Build state object for components that expect it
    const state = {
        accounts,
        expenses,
        dailyLog,
        costs,
        payoutStartDate
    };

    return (
        <DashboardContext.Provider value={{
            state,
            loading,
            FIRMS,
            updateCost,
            updatePayoutStartDate,
            addExpense,
            deleteExpense,
            addAccountWithCost,
            updateAccountStatus,
            updateAccountBalance,
            updateAccountProfitTarget,
            deleteAccount,
            resetData,
            calculateMoneyStats,
            getTotalPassed,
            getFirmLimit
        }}>
            {children}
        </DashboardContext.Provider>
    );
}
