import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DashboardContext = createContext({});

export const useDashboard = () => useContext(DashboardContext);

const defaultSettings = {
    payoutEstimate: 2000,
    payoutStartDate: '2026-01'
};

export function DashboardProvider({ children }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [firms, setFirms] = useState({});
    const [settings, setSettings] = useState(defaultSettings);
    const [accounts, setAccounts] = useState({});
    const [expenses, setExpenses] = useState([]);
    const [dailyLog, setDailyLog] = useState([]);
    const [goals, setGoals] = useState([]);
    const [goalCompletions, setGoalCompletions] = useState([]);

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
            // Load firms first, then other data that depends on firms
            const loadedFirms = await loadFirms();
            await Promise.all([
                loadSettings(),
                loadAccounts(loadedFirms),
                loadExpenses(),
                loadDailyLogs(),
                loadGoals()
            ]);
        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    };

    const loadFirms = async () => {
        const { data } = await supabase
            .from('firms')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (data && data.length > 0) {
            const firmsMap = {};
            data.forEach(firm => {
                firmsMap[firm.id] = {
                    id: firm.id,
                    name: firm.name,
                    accountName: firm.account_name,
                    maxFunded: firm.max_funded,
                    evalCost: parseFloat(firm.eval_cost) || 0,
                    activationCost: parseFloat(firm.activation_cost) || 0,
                    color: firm.color || 'blue',
                    hasConsistencyRule: firm.has_consistency_rule || false,
                    defaultProfitTarget: parseFloat(firm.default_profit_target) || 3000
                };
            });
            setFirms(firmsMap);
            return firmsMap;
        }
        // Return empty if no firms configured - user must create their own
        setFirms({});
        return {};
    };

    const loadSettings = async () => {
        const { data } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setSettings({
                payoutEstimate: data.payout_estimate || defaultSettings.payoutEstimate,
                payoutStartDate: data.payout_start_date || defaultSettings.payoutStartDate
            });
        }
    };

    const loadAccounts = async (currentFirms) => {
        const firmsToUse = currentFirms || firms;
        const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        // Group accounts by firm_id
        const grouped = {};
        Object.keys(firmsToUse).forEach(firmId => {
            grouped[firmId] = [];
        });

        if (data) {
            data.forEach(acc => {
                // Initialize array if firm exists (even if not in current firms list)
                if (!grouped[acc.firm_id]) {
                    grouped[acc.firm_id] = [];
                }
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

    const loadGoals = async () => {
        // Load goals
        const { data: goalsData } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (goalsData) {
            setGoals(goalsData.map(g => ({
                id: g.id,
                title: g.title,
                description: g.description,
                goalType: g.goal_type,
                targetCount: g.target_count,
                actionType: g.action_type,
                firmId: g.firm_id,
                startDate: g.start_date,
                endDate: g.end_date,
                isActive: g.is_active
            })));
        }

        // Load today's completions
        const today = new Date().toISOString().split('T')[0];
        const { data: completionsData } = await supabase
            .from('goal_completions')
            .select('*')
            .eq('user_id', user.id)
            .eq('completion_date', today);

        if (completionsData) {
            setGoalCompletions(completionsData.map(c => ({
                id: c.id,
                goalId: c.goal_id,
                completionDate: c.completion_date,
                completedCount: c.completed_count,
                autoCompleted: c.auto_completed
            })));
        }
    };

    // Settings functions
    const updateSetting = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                payout_estimate: newSettings.payoutEstimate,
                payout_start_date: newSettings.payoutStartDate,
                updated_at: new Date().toISOString()
            });
    };

    // Firm management functions
    const addFirm = async (firmData) => {
        const firmId = firmData.id || firmData.name.toLowerCase().replace(/\s+/g, '');

        const { data: newFirm, error } = await supabase
            .from('firms')
            .insert({
                id: firmId,
                user_id: user.id,
                name: firmData.name,
                account_name: firmData.accountName || firmData.name,
                max_funded: firmData.maxFunded || 10,
                eval_cost: firmData.evalCost || 0,
                activation_cost: firmData.activationCost || 0,
                color: firmData.color || 'blue',
                has_consistency_rule: firmData.hasConsistencyRule || false,
                default_profit_target: firmData.defaultProfitTarget || 3000
            })
            .select()
            .single();

        if (error) {
            console.error('Add firm error:', error);
            return null;
        }

        const firm = {
            id: newFirm.id,
            name: newFirm.name,
            accountName: newFirm.account_name,
            maxFunded: newFirm.max_funded,
            evalCost: parseFloat(newFirm.eval_cost) || 0,
            activationCost: parseFloat(newFirm.activation_cost) || 0,
            color: newFirm.color,
            hasConsistencyRule: newFirm.has_consistency_rule,
            defaultProfitTarget: parseFloat(newFirm.default_profit_target) || 3000
        };

        setFirms(prev => ({ ...prev, [firmId]: firm }));
        setAccounts(prev => ({ ...prev, [firmId]: [] }));
        return firm;
    };

    const updateFirm = async (firmId, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName;
        if (updates.maxFunded !== undefined) dbUpdates.max_funded = updates.maxFunded;
        if (updates.evalCost !== undefined) dbUpdates.eval_cost = updates.evalCost;
        if (updates.activationCost !== undefined) dbUpdates.activation_cost = updates.activationCost;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.hasConsistencyRule !== undefined) dbUpdates.has_consistency_rule = updates.hasConsistencyRule;
        if (updates.defaultProfitTarget !== undefined) dbUpdates.default_profit_target = updates.defaultProfitTarget;

        const { error } = await supabase
            .from('firms')
            .update(dbUpdates)
            .eq('id', firmId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Update firm error:', error);
            return;
        }

        setFirms(prev => ({
            ...prev,
            [firmId]: { ...prev[firmId], ...updates }
        }));
    };

    const deleteFirm = async (firmId, confirmed = false) => {
        // Check if there are accounts under this firm
        const firmAccounts = accounts[firmId] || [];

        if (firmAccounts.length > 0 && !confirmed) {
            // Return the accounts so the UI can show a detailed warning
            return { needsConfirmation: true, accounts: firmAccounts };
        }

        // Delete accounts first if any
        if (firmAccounts.length > 0) {
            await supabase.from('accounts').delete().eq('firm_id', firmId).eq('user_id', user.id);
        }

        const { error } = await supabase
            .from('firms')
            .delete()
            .eq('id', firmId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete firm error:', error);
            return { error };
        }

        setFirms(prev => {
            const newFirms = { ...prev };
            delete newFirms[firmId];
            return newFirms;
        });
        setAccounts(prev => {
            const newAccounts = { ...prev };
            delete newAccounts[firmId];
            return newAccounts;
        });

        return { success: true };
    };

    // Account functions
    const addAccountWithCost = async (firmId, evalCost = 0, profitTarget = null, createdDate = null) => {
        const firm = firms[firmId];
        if (!firm) return;

        const firmAccounts = accounts[firmId] || [];
        const passedCount = firmAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;

        if (passedCount >= firm.maxFunded) {
            alert(`Max ${firm.maxFunded} ${firm.name} funded accounts reached!`);
            return;
        }

        const accountNum = firmAccounts.length + 1;
        const accountName = `${firm.accountName} #${accountNum}`;
        const dateToUse = createdDate || new Date().toISOString().split('T')[0];

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
                balance: 0,
                created_at: dateToUse
            })
            .select()
            .single();

        if (error) {
            console.error('Add account error:', error);
            return;
        }

        // Add expense if eval cost provided (use same date)
        if (evalCost > 0) {
            await addExpense(firmId, evalCost, accountName, dateToUse);
        }

        // Auto-complete goals for buying eval (only for today)
        if (!createdDate || createdDate === new Date().toISOString().split('T')[0]) {
            await autoCompleteGoals('buy_eval', firmId);
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
                createdDate: dateToUse
            }]
        }));
    };

    const updateAccountStatus = async (firmId, accountId, status, cost = 0) => {
        const firm = firms[firmId];
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

        // Auto-complete goals when account is funded
        if (status === 'funded') {
            await autoCompleteGoals('fund_account', firmId);
        }
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
    const addExpense = async (type, amount, note = '', date = null) => {
        const dateToUse = date || new Date().toISOString().split('T')[0];

        const { data: newExpense, error } = await supabase
            .from('expenses')
            .insert({
                user_id: user.id,
                type,
                amount: parseFloat(amount),
                note,
                date: dateToUse
            })
            .select()
            .single();

        if (error) {
            console.error('Add expense error:', error);
            return;
        }

        // Insert in correct position based on date
        setExpenses(prev => {
            const newExp = {
                id: newExpense.id,
                type,
                amount: parseFloat(amount),
                note,
                date: dateToUse
            };
            // Insert sorted by date (newest first)
            const newList = [...prev, newExp].sort((a, b) => b.date.localeCompare(a.date));
            return newList;
        });
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

    // Goal functions
    const addGoal = async (goalData) => {
        const { data: newGoal, error } = await supabase
            .from('goals')
            .insert({
                user_id: user.id,
                title: goalData.title,
                description: goalData.description || null,
                goal_type: goalData.goalType || 'daily',
                target_count: goalData.targetCount || 1,
                action_type: goalData.actionType || 'custom',
                firm_id: goalData.firmId || null,
                start_date: goalData.startDate || new Date().toISOString().split('T')[0],
                end_date: goalData.endDate || null,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Add goal error:', error);
            return null;
        }

        const goal = {
            id: newGoal.id,
            title: newGoal.title,
            description: newGoal.description,
            goalType: newGoal.goal_type,
            targetCount: newGoal.target_count,
            actionType: newGoal.action_type,
            firmId: newGoal.firm_id,
            startDate: newGoal.start_date,
            endDate: newGoal.end_date,
            isActive: newGoal.is_active
        };

        setGoals(prev => [...prev, goal]);
        return goal;
    };

    const deleteGoal = async (goalId) => {
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', goalId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete goal error:', error);
            return;
        }

        setGoals(prev => prev.filter(g => g.id !== goalId));
    };

    const toggleGoalCompletion = async (goalId, completed) => {
        const today = new Date().toISOString().split('T')[0];
        const existing = goalCompletions.find(c => c.goalId === goalId);

        if (completed && !existing) {
            // Mark as complete
            const { data, error } = await supabase
                .from('goal_completions')
                .insert({
                    user_id: user.id,
                    goal_id: goalId,
                    completion_date: today,
                    completed_count: 1,
                    auto_completed: false
                })
                .select()
                .single();

            if (error) {
                console.error('Complete goal error:', error);
                return;
            }

            setGoalCompletions(prev => [...prev, {
                id: data.id,
                goalId: data.goal_id,
                completionDate: data.completion_date,
                completedCount: data.completed_count,
                autoCompleted: data.auto_completed
            }]);
        } else if (!completed && existing) {
            // Mark as incomplete
            const { error } = await supabase
                .from('goal_completions')
                .delete()
                .eq('id', existing.id);

            if (error) {
                console.error('Uncomplete goal error:', error);
                return;
            }

            setGoalCompletions(prev => prev.filter(c => c.id !== existing.id));
        }
    };

    // Auto-complete goals based on action type
    const autoCompleteGoals = async (actionType, firmId = null) => {
        const today = new Date().toISOString().split('T')[0];

        // Find goals that match this action
        const matchingGoals = goals.filter(g => {
            if (g.actionType !== actionType) return false;
            if (g.firmId && g.firmId !== firmId) return false;
            if (g.startDate > today) return false;
            if (g.endDate && g.endDate < today) return false;
            // Check if already completed today
            const alreadyCompleted = goalCompletions.find(c => c.goalId === g.id);
            return !alreadyCompleted;
        });

        for (const goal of matchingGoals) {
            const { data, error } = await supabase
                .from('goal_completions')
                .insert({
                    user_id: user.id,
                    goal_id: goal.id,
                    completion_date: today,
                    completed_count: 1,
                    auto_completed: true
                })
                .select()
                .single();

            if (!error && data) {
                setGoalCompletions(prev => [...prev, {
                    id: data.id,
                    goalId: data.goal_id,
                    completionDate: data.completion_date,
                    completedCount: data.completed_count,
                    autoCompleted: data.auto_completed
                }]);
            }
        }
    };

    const getTodaysGoals = () => {
        const today = new Date().toISOString().split('T')[0];

        return goals
            .filter(g => {
                if (g.startDate > today) return false;
                if (g.endDate && g.endDate < today) return false;
                return true;
            })
            .map(g => ({
                ...g,
                isCompleted: goalCompletions.some(c => c.goalId === g.id),
                autoCompleted: goalCompletions.find(c => c.goalId === g.id)?.autoCompleted || false
            }));
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

        Object.keys(firms).forEach(firmId => {
            stats.byFirm[firmId] = {
                evalSpent: 0,
                evalCount: 0,
                activationSpent: 0,
                activationCount: 0
            };
        });

        expenses.forEach(exp => {
            stats.totalSpent += exp.amount;

            Object.keys(firms).forEach(firmId => {
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
        return Object.keys(firms).reduce((total, firmId) => {
            const firmAccounts = accounts[firmId] || [];
            return total + firmAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;
        }, 0);
    };

    const getFirmLimit = (firmId) => {
        return firms[firmId]?.maxFunded || 0;
    };

    // Build state object for components that expect it
    const state = {
        accounts,
        expenses,
        dailyLog,
        settings,
        payoutStartDate: settings.payoutStartDate
    };

    return (
        <DashboardContext.Provider value={{
            state,
            loading,
            firms,
            goals,
            addFirm,
            updateFirm,
            deleteFirm,
            updateSetting,
            addExpense,
            deleteExpense,
            addAccountWithCost,
            updateAccountStatus,
            updateAccountBalance,
            updateAccountProfitTarget,
            deleteAccount,
            addGoal,
            deleteGoal,
            toggleGoalCompletion,
            getTodaysGoals,
            resetData,
            calculateMoneyStats,
            getTotalPassed,
            getFirmLimit
        }}>
            {children}
        </DashboardContext.Provider>
    );
}
