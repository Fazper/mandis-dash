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
        defaultProfitTarget: 3000,
        defaultBalance: 0
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
        defaultProfitTarget: 3000,
        defaultBalance: 0
    }
};

// Empty initial state - no hardcoded accounts
const initialState = {
    firms: FIRMS,
    accounts: {}, // Will be populated dynamically based on firms
    expenses: [],
    dailyLog: [],
    costs: {
        apexEval: 25,
        apexActivation: 65,
        lucidEval: 80,
        payoutEstimate: 2000
    },
    payoutStartDate: '2026-01'
};

// Initialize empty accounts for each firm
Object.keys(FIRMS).forEach(firmId => {
    initialState.accounts[firmId] = [];
});

export function DashboardProvider({ children }) {
    const { user } = useAuth();
    const [state, setState] = useState(initialState);
    const [loading, setLoading] = useState(true);

    // Load state from Supabase
    useEffect(() => {
        loadState();
    }, [user]);

    const loadState = async () => {
        setLoading(true);
        let loaded = false;

        try {
            const { data, error } = await supabase
                .from('dashboard_state')
                .select('state')
                .eq('id', user?.id || 'default')
                .single();

            if (data?.state && Object.keys(data.state).length > 0) {
                // Merge loaded state with initial state to ensure new firms are included
                const loadedState = data.state;
                const mergedAccounts = { ...initialState.accounts };

                // Preserve loaded accounts
                if (loadedState.accounts) {
                    Object.keys(loadedState.accounts).forEach(firmId => {
                        mergedAccounts[firmId] = loadedState.accounts[firmId];
                    });
                }

                setState({
                    ...initialState,
                    ...loadedState,
                    firms: FIRMS, // Always use latest firm config
                    accounts: mergedAccounts
                });
                loaded = true;
            }
        } catch (err) {
            console.error('Load error:', err);
        }

        if (!loaded) {
            const saved = localStorage.getItem('propDashboard');
            if (saved) {
                const parsed = JSON.parse(saved);
                const mergedAccounts = { ...initialState.accounts };

                if (parsed.accounts) {
                    Object.keys(parsed.accounts).forEach(firmId => {
                        mergedAccounts[firmId] = parsed.accounts[firmId];
                    });
                }

                setState({
                    ...initialState,
                    ...parsed,
                    firms: FIRMS,
                    accounts: mergedAccounts
                });
            }
        }

        setLoading(false);
    };

    const saveState = async (newState) => {
        setState(newState);
        localStorage.setItem('propDashboard', JSON.stringify(newState));

        try {
            await supabase
                .from('dashboard_state')
                .upsert({
                    id: user?.id || 'default',
                    state: newState,
                    updated_at: new Date().toISOString()
                });
        } catch (err) {
            console.error('Save error:', err);
        }
    };

    const updateCost = (key, value) => {
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0) {
            saveState({ ...state, costs: { ...state.costs, [key]: num } });
        }
    };

    const updatePayoutStartDate = (value) => {
        saveState({ ...state, payoutStartDate: value });
    };

    const addExpense = (type, amount, note = '') => {
        const expense = {
            id: Date.now(),
            type,
            amount: parseFloat(amount),
            note,
            date: new Date().toISOString().split('T')[0]
        };
        saveState({ ...state, expenses: [...state.expenses, expense] });
    };

    const deleteExpense = (id) => {
        saveState({ ...state, expenses: state.expenses.filter(e => e.id !== id) });
    };

    const addAccountWithCost = (firmId, evalCost = 0, profitTarget = null) => {
        const firm = FIRMS[firmId];
        if (!firm) return;

        const accounts = state.accounts[firmId] || [];
        const passedCount = accounts.filter(a => a.status === 'passed' || a.status === 'funded').length;

        if (passedCount >= firm.maxFunded) {
            alert(`Max ${firm.maxFunded} ${firm.name} funded accounts reached!`);
            return;
        }

        const newId = Date.now();
        const accountNum = accounts.length + 1;
        const newAccount = {
            id: newId,
            name: `${firm.accountName} #${accountNum}`,
            status: 'in-progress',
            evalCost: evalCost,
            profitTarget: profitTarget || firm.defaultProfitTarget,
            balance: 0,
            passedDate: null,
            fundedDate: null,
            createdDate: new Date().toISOString().split('T')[0]
        };

        // Auto-add expense if eval cost provided
        let newExpenses = state.expenses;
        if (evalCost > 0) {
            newExpenses = [...state.expenses, {
                id: Date.now() + 1,
                type: firmId,
                amount: evalCost,
                note: `${firm.accountName} #${accountNum}`,
                date: new Date().toISOString().split('T')[0]
            }];
        }

        saveState({
            ...state,
            expenses: newExpenses,
            accounts: {
                ...state.accounts,
                [firmId]: [...accounts, newAccount]
            }
        });
    };

    const updateAccountBalance = (firmId, id, balance) => {
        const accounts = (state.accounts[firmId] || []).map(acc =>
            acc.id === id ? { ...acc, balance: parseFloat(balance) || 0 } : acc
        );
        saveState({ ...state, accounts: { ...state.accounts, [firmId]: accounts } });
    };

    const updateAccountProfitTarget = (firmId, id, profitTarget) => {
        const accounts = (state.accounts[firmId] || []).map(acc =>
            acc.id === id ? { ...acc, profitTarget: parseFloat(profitTarget) || 0 } : acc
        );
        saveState({ ...state, accounts: { ...state.accounts, [firmId]: accounts } });
    };

    const updateAccountStatus = (firmId, id, status, cost = 0) => {
        const firm = FIRMS[firmId];
        const today = new Date().toISOString().split('T')[0];

        const accounts = (state.accounts[firmId] || []).map(acc => {
            if (acc.id !== id) return acc;

            const updates = { ...acc, status };

            if (status === 'passed') {
                updates.passedDate = today;
            } else if (status === 'funded') {
                updates.fundedDate = today;
                if (!updates.passedDate) updates.passedDate = today;
            }

            return updates;
        });

        // Auto-add expense for activation/pass cost
        let newExpenses = state.expenses;
        if (cost > 0 && (status === 'passed' || status === 'funded')) {
            const acc = state.accounts[firmId]?.find(a => a.id === id);
            const expenseType = status === 'funded' ? `${firmId}-activation` : firmId;
            newExpenses = [...state.expenses, {
                id: Date.now(),
                type: expenseType,
                amount: cost,
                note: `${acc?.name || firm.accountName} - ${status}`,
                date: today
            }];
        }

        saveState({
            ...state,
            expenses: newExpenses,
            accounts: { ...state.accounts, [firmId]: accounts }
        });
    };

    const deleteAccount = (firmId, id) => {
        const accounts = (state.accounts[firmId] || []).filter(acc => acc.id !== id);
        saveState({ ...state, accounts: { ...state.accounts, [firmId]: accounts } });
    };

    const resetData = async () => {
        if (confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
            localStorage.removeItem('propDashboard');
            try {
                await supabase
                    .from('dashboard_state')
                    .upsert({ id: user?.id || 'default', state: {}, updated_at: new Date().toISOString() });
            } catch (err) {
                console.error('Reset error:', err);
            }
            window.location.reload();
        }
    };

    const calculateMoneyStats = () => {
        const stats = {
            totalSpent: 0,
            byFirm: {}
        };

        // Initialize stats for each firm
        Object.keys(FIRMS).forEach(firmId => {
            stats.byFirm[firmId] = {
                evalSpent: 0,
                evalCount: 0,
                activationSpent: 0,
                activationCount: 0
            };
        });

        state.expenses.forEach(exp => {
            stats.totalSpent += exp.amount;

            // Match expense type to firm
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

    // Get total passed accounts across all firms
    const getTotalPassed = () => {
        return Object.keys(FIRMS).reduce((total, firmId) => {
            const accounts = state.accounts[firmId] || [];
            return total + accounts.filter(a => a.status === 'passed').length;
        }, 0);
    };

    // Get firm limit
    const getFirmLimit = (firmId) => {
        return FIRMS[firmId]?.maxFunded || 0;
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
