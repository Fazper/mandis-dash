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

    // Hierarchy: firms → accountTypes → accounts
    const [firms, setFirms] = useState({}); // { firmId: { id, name, color, ... } }
    const [accountTypes, setAccountTypes] = useState({}); // { typeId: { id, firmId, name, maxFunded, ... } }
    const [accounts, setAccounts] = useState({}); // { typeId: [accounts] }

    const [settings, setSettings] = useState(defaultSettings);
    const [expenses, setExpenses] = useState([]);
    const [dailyLog, setDailyLog] = useState([]);
    const [goals, setGoals] = useState([]);
    const [goalCompletions, setGoalCompletions] = useState([]);

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
            const [loadedFirms, loadedTypes] = await Promise.all([
                loadFirms(),
                loadAccountTypes()
            ]);
            await Promise.all([
                loadSettings(),
                loadAccounts(loadedTypes),
                loadExpenses(),
                loadDailyLogs(),
                loadGoals()
            ]);
        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    };

    // ============ FIRMS ============
    const loadFirms = async () => {
        const { data } = await supabase
            .from('prop_firms')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        const firmsMap = {};
        if (data) {
            data.forEach(firm => {
                firmsMap[firm.id] = {
                    id: firm.id,
                    name: firm.name,
                    color: firm.color || 'blue',
                    website: firm.website,
                    notes: firm.notes
                };
            });
        }
        setFirms(firmsMap);
        return firmsMap;
    };

    const addFirm = async (firmData) => {
        const { data: newFirm, error } = await supabase
            .from('prop_firms')
            .insert({
                user_id: user.id,
                name: firmData.name,
                color: firmData.color || 'blue',
                website: firmData.website || null,
                notes: firmData.notes || null
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
            color: newFirm.color,
            website: newFirm.website,
            notes: newFirm.notes
        };

        setFirms(prev => ({ ...prev, [firm.id]: firm }));
        return firm;
    };

    const updateFirm = async (firmId, updates) => {
        const { error } = await supabase
            .from('prop_firms')
            .update(updates)
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
        // Get account types under this firm
        const firmTypes = Object.values(accountTypes).filter(t => t.firmId === firmId);
        // Get all accounts under those types
        const allAccounts = firmTypes.flatMap(t => accounts[t.id] || []);

        if ((firmTypes.length > 0 || allAccounts.length > 0) && !confirmed) {
            return { needsConfirmation: true, accountTypes: firmTypes, accounts: allAccounts };
        }

        // Delete all accounts under this firm's account types
        for (const type of firmTypes) {
            await supabase.from('accounts').delete().eq('account_type_id', type.id);
        }

        // Delete all account types under this firm
        await supabase.from('account_types').delete().eq('firm_id', firmId);

        // Delete the firm
        const { error } = await supabase
            .from('prop_firms')
            .delete()
            .eq('id', firmId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete firm error:', error);
            return { error };
        }

        // Update local state
        setFirms(prev => {
            const newFirms = { ...prev };
            delete newFirms[firmId];
            return newFirms;
        });

        setAccountTypes(prev => {
            const newTypes = { ...prev };
            firmTypes.forEach(t => delete newTypes[t.id]);
            return newTypes;
        });

        setAccounts(prev => {
            const newAccounts = { ...prev };
            firmTypes.forEach(t => delete newAccounts[t.id]);
            return newAccounts;
        });

        return { success: true };
    };

    // ============ ACCOUNT TYPES ============
    const loadAccountTypes = async () => {
        const { data } = await supabase
            .from('account_types')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        const typesMap = {};
        if (data) {
            data.forEach(type => {
                typesMap[type.id] = {
                    id: type.id,
                    firmId: type.firm_id,
                    name: type.name,
                    accountName: type.account_name,
                    maxFunded: type.max_funded,
                    evalCost: parseFloat(type.eval_cost) || 0,
                    activationCost: parseFloat(type.activation_cost) || 0,
                    color: type.color || 'blue',
                    hasConsistencyRule: type.has_consistency_rule || false,
                    defaultProfitTarget: parseFloat(type.default_profit_target) || 3000
                };
            });
        }
        setAccountTypes(typesMap);
        return typesMap;
    };

    const addAccountType = async (typeData) => {
        const typeId = typeData.name.toLowerCase().replace(/\s+/g, '-');

        const { data: newType, error } = await supabase
            .from('account_types')
            .insert({
                id: typeId,
                user_id: user.id,
                firm_id: typeData.firmId,
                name: typeData.name,
                account_name: typeData.accountName || typeData.name,
                max_funded: typeData.maxFunded || 10,
                eval_cost: typeData.evalCost || 0,
                activation_cost: typeData.activationCost || 0,
                color: typeData.color || firms[typeData.firmId]?.color || 'blue',
                has_consistency_rule: typeData.hasConsistencyRule || false,
                default_profit_target: typeData.defaultProfitTarget || 3000
            })
            .select()
            .single();

        if (error) {
            console.error('Add account type error:', error);
            return null;
        }

        const accountType = {
            id: newType.id,
            firmId: newType.firm_id,
            name: newType.name,
            accountName: newType.account_name,
            maxFunded: newType.max_funded,
            evalCost: parseFloat(newType.eval_cost) || 0,
            activationCost: parseFloat(newType.activation_cost) || 0,
            color: newType.color,
            hasConsistencyRule: newType.has_consistency_rule,
            defaultProfitTarget: parseFloat(newType.default_profit_target) || 3000
        };

        setAccountTypes(prev => ({ ...prev, [accountType.id]: accountType }));
        setAccounts(prev => ({ ...prev, [accountType.id]: [] }));
        return accountType;
    };

    const updateAccountType = async (typeId, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName;
        if (updates.firmId !== undefined) dbUpdates.firm_id = updates.firmId;
        if (updates.maxFunded !== undefined) dbUpdates.max_funded = updates.maxFunded;
        if (updates.evalCost !== undefined) dbUpdates.eval_cost = updates.evalCost;
        if (updates.activationCost !== undefined) dbUpdates.activation_cost = updates.activationCost;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.hasConsistencyRule !== undefined) dbUpdates.has_consistency_rule = updates.hasConsistencyRule;
        if (updates.defaultProfitTarget !== undefined) dbUpdates.default_profit_target = updates.defaultProfitTarget;

        const { error } = await supabase
            .from('account_types')
            .update(dbUpdates)
            .eq('id', typeId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Update account type error:', error);
            return;
        }

        setAccountTypes(prev => ({
            ...prev,
            [typeId]: { ...prev[typeId], ...updates }
        }));
    };

    const deleteAccountType = async (typeId, confirmed = false) => {
        const typeAccounts = accounts[typeId] || [];

        if (typeAccounts.length > 0 && !confirmed) {
            return { needsConfirmation: true, accounts: typeAccounts };
        }

        // Delete accounts first
        if (typeAccounts.length > 0) {
            await supabase.from('accounts').delete().eq('account_type_id', typeId);
        }

        const { error } = await supabase
            .from('account_types')
            .delete()
            .eq('id', typeId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete account type error:', error);
            return { error };
        }

        setAccountTypes(prev => {
            const newTypes = { ...prev };
            delete newTypes[typeId];
            return newTypes;
        });

        setAccounts(prev => {
            const newAccounts = { ...prev };
            delete newAccounts[typeId];
            return newAccounts;
        });

        return { success: true };
    };

    // ============ ACCOUNTS ============
    const loadAccounts = async (currentTypes) => {
        const typesToUse = currentTypes || accountTypes;
        const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        const grouped = {};
        Object.keys(typesToUse).forEach(typeId => {
            grouped[typeId] = [];
        });

        if (data) {
            data.forEach(acc => {
                if (!grouped[acc.account_type_id]) {
                    grouped[acc.account_type_id] = [];
                }
                grouped[acc.account_type_id].push({
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

    const addAccount = async (accountTypeId, evalCost = 0, profitTarget = null, createdDate = null) => {
        const accountType = accountTypes[accountTypeId];
        if (!accountType) return;

        const typeAccounts = accounts[accountTypeId] || [];
        const passedCount = typeAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;

        if (passedCount >= accountType.maxFunded) {
            alert(`Max ${accountType.maxFunded} funded accounts reached for ${accountType.name}!`);
            return;
        }

        const accountNum = typeAccounts.length + 1;
        const accountName = `${accountType.accountName} #${accountNum}`;
        const dateToUse = createdDate || new Date().toISOString().split('T')[0];

        const { data: newAccount, error } = await supabase
            .from('accounts')
            .insert({
                user_id: user.id,
                account_type_id: accountTypeId,
                name: accountName,
                status: 'in-progress',
                eval_cost: evalCost,
                profit_target: profitTarget || accountType.defaultProfitTarget,
                balance: 0,
                created_at: dateToUse
            })
            .select()
            .single();

        if (error) {
            console.error('Add account error:', error);
            return;
        }

        // Add expense if eval cost provided
        if (evalCost > 0) {
            await addExpense(accountTypeId, evalCost, accountName, dateToUse);
        }

        // Auto-complete goals
        if (!createdDate || createdDate === new Date().toISOString().split('T')[0]) {
            await autoCompleteGoals('buy_eval', accountTypeId);
        }

        setAccounts(prev => ({
            ...prev,
            [accountTypeId]: [...(prev[accountTypeId] || []), {
                id: newAccount.id,
                name: accountName,
                status: 'in-progress',
                evalCost,
                profitTarget: profitTarget || accountType.defaultProfitTarget,
                balance: 0,
                passedDate: null,
                fundedDate: null,
                createdDate: dateToUse
            }]
        }));
    };

    const updateAccountStatus = async (accountTypeId, accountId, status, cost = 0) => {
        const accountType = accountTypes[accountTypeId];
        const today = new Date().toISOString().split('T')[0];

        const updates = { status };
        if (status === 'passed') updates.passed_date = today;
        else if (status === 'funded') updates.funded_date = today;

        const { error } = await supabase
            .from('accounts')
            .update(updates)
            .eq('id', accountId);

        if (error) {
            console.error('Update status error:', error);
            return;
        }

        if (cost > 0 && (status === 'passed' || status === 'funded')) {
            const acc = accounts[accountTypeId]?.find(a => a.id === accountId);
            const expenseType = status === 'funded' ? `${accountTypeId}-activation` : accountTypeId;
            await addExpense(expenseType, cost, `${acc?.name || accountType.accountName} - ${status}`);
        }

        setAccounts(prev => ({
            ...prev,
            [accountTypeId]: (prev[accountTypeId] || []).map(acc =>
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

        if (status === 'funded') {
            await autoCompleteGoals('fund_account', accountTypeId);
        }
    };

    const updateAccountBalance = async (accountTypeId, accountId, balance) => {
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
            [accountTypeId]: (prev[accountTypeId] || []).map(acc =>
                acc.id === accountId ? { ...acc, balance: balanceNum } : acc
            )
        }));
    };

    const updateAccountProfitTarget = async (accountTypeId, accountId, profitTarget) => {
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
            [accountTypeId]: (prev[accountTypeId] || []).map(acc =>
                acc.id === accountId ? { ...acc, profitTarget: targetNum } : acc
            )
        }));
    };

    const deleteAccount = async (accountTypeId, accountId) => {
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
            [accountTypeId]: (prev[accountTypeId] || []).filter(acc => acc.id !== accountId)
        }));
    };

    // ============ SETTINGS ============
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

    // ============ EXPENSES ============
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

        setExpenses(prev => {
            const newExp = {
                id: newExpense.id,
                type,
                amount: parseFloat(amount),
                note,
                date: dateToUse
            };
            return [...prev, newExp].sort((a, b) => b.date.localeCompare(a.date));
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

    // ============ DAILY LOGS ============
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
                tradedOpen: log.traded_open,
                accountsPassed: log.accounts_passed,
                notes: log.notes
            })));
        }
    };

    // ============ GOALS ============
    const loadGoals = async () => {
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
                accountTypeId: g.firm_id, // This references account_type now
                startDate: g.start_date,
                endDate: g.end_date,
                isActive: g.is_active
            })));
        }

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
                firm_id: goalData.accountTypeId || null,
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
            accountTypeId: newGoal.firm_id,
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

    const autoCompleteGoals = async (actionType, accountTypeId = null) => {
        const today = new Date().toISOString().split('T')[0];

        const matchingGoals = goals.filter(g => {
            if (g.actionType !== actionType) return false;
            if (g.accountTypeId && g.accountTypeId !== accountTypeId) return false;
            if (g.startDate > today) return false;
            if (g.endDate && g.endDate < today) return false;
            return !goalCompletions.find(c => c.goalId === g.id);
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

    // ============ UTILITIES ============
    const resetData = async () => {
        if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) return;

        await Promise.all([
            supabase.from('accounts').delete().eq('user_id', user.id),
            supabase.from('account_types').delete().eq('user_id', user.id),
            supabase.from('prop_firms').delete().eq('user_id', user.id),
            supabase.from('expenses').delete().eq('user_id', user.id),
            supabase.from('daily_logs').delete().eq('user_id', user.id),
            supabase.from('goals').delete().eq('user_id', user.id),
            supabase.from('user_settings').delete().eq('user_id', user.id)
        ]);

        window.location.reload();
    };

    const calculateMoneyStats = () => {
        const stats = {
            totalSpent: 0,
            byAccountType: {}
        };

        Object.keys(accountTypes).forEach(typeId => {
            stats.byAccountType[typeId] = {
                evalSpent: 0,
                evalCount: 0,
                activationSpent: 0,
                activationCount: 0
            };
        });

        expenses.forEach(exp => {
            stats.totalSpent += exp.amount;

            Object.keys(accountTypes).forEach(typeId => {
                if (exp.type === typeId) {
                    stats.byAccountType[typeId].evalSpent += exp.amount;
                    stats.byAccountType[typeId].evalCount++;
                } else if (exp.type === `${typeId}-activation`) {
                    stats.byAccountType[typeId].activationSpent += exp.amount;
                    stats.byAccountType[typeId].activationCount++;
                }
            });
        });

        return stats;
    };

    const getTotalPassed = () => {
        return Object.keys(accountTypes).reduce((total, typeId) => {
            const typeAccounts = accounts[typeId] || [];
            return total + typeAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;
        }, 0);
    };

    const getAccountTypeLimit = (typeId) => {
        return accountTypes[typeId]?.maxFunded || 0;
    };

    // Helper to get account types for a specific firm
    const getAccountTypesForFirm = (firmId) => {
        return Object.values(accountTypes).filter(t => t.firmId === firmId);
    };

    // Build state object for backward compatibility
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
            // Firms
            firms,
            addFirm,
            updateFirm,
            deleteFirm,
            // Account Types
            accountTypes,
            addAccountType,
            updateAccountType,
            deleteAccountType,
            getAccountTypesForFirm,
            // Accounts
            accounts,
            addAccount,
            updateAccountStatus,
            updateAccountBalance,
            updateAccountProfitTarget,
            deleteAccount,
            // Settings
            updateSetting,
            // Expenses
            addExpense,
            deleteExpense,
            // Goals
            goals,
            addGoal,
            deleteGoal,
            toggleGoalCompletion,
            getTodaysGoals,
            // Utilities
            resetData,
            calculateMoneyStats,
            getTotalPassed,
            getAccountTypeLimit
        }}>
            {children}
        </DashboardContext.Provider>
    );
}
