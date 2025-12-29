import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DashboardContext = createContext({});

export const useDashboard = () => useContext(DashboardContext);

const defaultSettings = {
    payoutEstimate: 2000,
    payoutStartDate: '2026-01'
};

export function DashboardProvider({ children }) {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);

    // Hierarchy: firms → accountTypes → accounts
    const [firms, setFirms] = useState({}); // { firmId: { id, name, color, ... } }
    const [accountTypes, setAccountTypes] = useState({}); // { typeId: { id, firmId, name, maxFunded, ... } }
    const [accounts, setAccounts] = useState({}); // { typeId: [accounts] }

    const [settings, setSettings] = useState(defaultSettings);
    const [expenses, setExpenses] = useState([]);
    const [payouts, setPayouts] = useState([]);
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
                loadPayouts(),
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
                    notes: firm.notes,
                    maxFunded: firm.max_funded || 20
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
                notes: firmData.notes || null,
                max_funded: firmData.maxFunded || 20
            })
            .select()
            .single();

        if (error) {
            console.error('Add firm error:', error);
            if (error.code === '42P01') {
                toast.error('Database not set up. Please run the migration first.');
            } else if (error.code === '23505') {
                toast.error(`Firm "${firmData.name}" already exists.`);
            } else {
                toast.error(`Failed to add firm: ${error.message}`);
            }
            return null;
        }

        const firm = {
            id: newFirm.id,
            name: newFirm.name,
            color: newFirm.color,
            website: newFirm.website,
            notes: newFirm.notes,
            maxFunded: newFirm.max_funded
        };

        setFirms(prev => ({ ...prev, [firm.id]: firm }));
        toast.success(`Added firm: ${firm.name}`);
        return firm;
    };

    const updateFirm = async (firmId, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.website !== undefined) dbUpdates.website = updates.website;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.maxFunded !== undefined) dbUpdates.max_funded = updates.maxFunded;

        const { error } = await supabase
            .from('prop_firms')
            .update(dbUpdates)
            .eq('id', firmId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Update firm error:', error);
            toast.error(`Failed to update firm: ${error.message}`);
            return;
        }

        setFirms(prev => ({
            ...prev,
            [firmId]: { ...prev[firmId], ...updates }
        }));
        toast.success('Firm updated');
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
            toast.error(`Failed to delete firm: ${error.message}`);
            return { error };
        }

        const firmName = firms[firmId]?.name;

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

        toast.success(`Deleted firm: ${firmName}`);
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
                    evalCost: parseFloat(type.eval_cost) || 0,
                    activationCost: parseFloat(type.activation_cost) || 0,
                    color: type.color || 'blue',
                    hasConsistencyRule: type.has_consistency_rule || false,
                    defaultProfitTarget: parseFloat(type.default_profit_target) || 3000,
                    expectedPayout: parseFloat(type.expected_payout) || 2000
                };
            });
        }
        setAccountTypes(typesMap);
        return typesMap;
    };

    const addAccountType = async (typeData) => {
        const typeId = `${typeData.firmId}-${typeData.name.toLowerCase().replace(/\s+/g, '-')}`;

        const { data: newType, error } = await supabase
            .from('account_types')
            .insert({
                id: typeId,
                user_id: user.id,
                firm_id: typeData.firmId,
                name: typeData.name,
                eval_cost: typeData.evalCost || 0,
                activation_cost: typeData.activationCost || 0,
                color: typeData.color || firms[typeData.firmId]?.color || 'blue',
                has_consistency_rule: typeData.hasConsistencyRule || false,
                default_profit_target: typeData.defaultProfitTarget || 3000,
                expected_payout: typeData.expectedPayout || 2000
            })
            .select()
            .single();

        if (error) {
            console.error('Add account type error:', error);
            if (error.code === '23505') {
                toast.error(`Account type "${typeData.name}" already exists for this firm.`);
            } else {
                toast.error(`Failed to add account type: ${error.message}`);
            }
            return null;
        }

        const accountType = {
            id: newType.id,
            firmId: newType.firm_id,
            name: newType.name,
            evalCost: parseFloat(newType.eval_cost) || 0,
            activationCost: parseFloat(newType.activation_cost) || 0,
            color: newType.color,
            hasConsistencyRule: newType.has_consistency_rule,
            defaultProfitTarget: parseFloat(newType.default_profit_target) || 3000,
            expectedPayout: parseFloat(newType.expected_payout) || 2000
        };

        setAccountTypes(prev => ({ ...prev, [accountType.id]: accountType }));
        setAccounts(prev => ({ ...prev, [accountType.id]: [] }));
        toast.success(`Added account type: ${accountType.name}`);
        return accountType;
    };

    const updateAccountType = async (typeId, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.firmId !== undefined) dbUpdates.firm_id = updates.firmId;
        if (updates.evalCost !== undefined) dbUpdates.eval_cost = updates.evalCost;
        if (updates.activationCost !== undefined) dbUpdates.activation_cost = updates.activationCost;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.hasConsistencyRule !== undefined) dbUpdates.has_consistency_rule = updates.hasConsistencyRule;
        if (updates.defaultProfitTarget !== undefined) dbUpdates.default_profit_target = updates.defaultProfitTarget;
        if (updates.expectedPayout !== undefined) dbUpdates.expected_payout = updates.expectedPayout;

        const { error } = await supabase
            .from('account_types')
            .update(dbUpdates)
            .eq('id', typeId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Update account type error:', error);
            toast.error(`Failed to update account type: ${error.message}`);
            return;
        }

        setAccountTypes(prev => ({
            ...prev,
            [typeId]: { ...prev[typeId], ...updates }
        }));
        toast.success('Account type updated');
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
            toast.error(`Failed to delete account type: ${error.message}`);
            return { error };
        }

        const typeName = accountTypes[typeId]?.name;

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

        toast.success(`Deleted account type: ${typeName}`);
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

        const firm = firms[accountType.firmId];
        if (!firm) return;

        // Check firm-wide funded limit
        const firmTypes = Object.values(accountTypes).filter(t => t.firmId === firm.id);
        const totalFunded = firmTypes.reduce((sum, t) => {
            const typeAccs = accounts[t.id] || [];
            return sum + typeAccs.filter(a => a.status === 'passed' || a.status === 'funded').length;
        }, 0);

        if (totalFunded >= firm.maxFunded) {
            toast.warning(`Max ${firm.maxFunded} funded accounts reached for ${firm.name}!`);
            return;
        }

        const typeAccounts = accounts[accountTypeId] || [];
        const accountNum = typeAccounts.length + 1;
        const accountName = `${firm.name} ${accountType.name} #${accountNum}`;
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
            toast.error(`Failed to add account: ${error.message}`);
            return;
        }

        // Add expense if eval cost provided
        let expenseAdded = false;
        if (evalCost > 0) {
            expenseAdded = await addExpense(accountTypeId, evalCost, accountName, dateToUse, true);
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

        if (evalCost > 0 && expenseAdded) {
            toast.success(`Added ${accountName} + $${evalCost} expense`);
        } else if (evalCost > 0 && !expenseAdded) {
            toast.warning(`Added ${accountName} but expense failed to record`);
        } else {
            toast.success(`Added account: ${accountName}`);
        }
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
            toast.error(`Failed to update status: ${error.message}`);
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
            toast.error(`Failed to update balance: ${error.message}`);
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
            toast.error(`Failed to update profit target: ${error.message}`);
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
        const accountName = accounts[accountTypeId]?.find(a => a.id === accountId)?.name;

        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId);

        if (error) {
            console.error('Delete account error:', error);
            toast.error(`Failed to delete account: ${error.message}`);
            return;
        }

        setAccounts(prev => ({
            ...prev,
            [accountTypeId]: (prev[accountTypeId] || []).filter(acc => acc.id !== accountId)
        }));
        toast.success(`Deleted account: ${accountName}`);
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

    const addExpense = async (type, amount, note = '', date = null, silent = false) => {
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
            if (!silent) {
                toast.error(`Failed to add expense: ${error.message}`);
            }
            return false;
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

        if (!silent) {
            toast.success(`Added expense: $${parseFloat(amount).toFixed(2)}`);
        }
        return true;
    };

    const deleteExpense = async (expenseId) => {
        const expense = expenses.find(e => e.id === expenseId);

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);

        if (error) {
            console.error('Delete expense error:', error);
            toast.error(`Failed to delete expense: ${error.message}`);
            return;
        }

        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        toast.success(`Deleted expense: $${expense?.amount?.toFixed(2) || '0.00'}`);
    };

    // ============ PAYOUTS ============
    const loadPayouts = async () => {
        const { data } = await supabase
            .from('payouts')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (data) {
            setPayouts(data.map(p => ({
                id: p.id,
                accountTypeId: p.account_type_id,
                firmId: p.firm_id,
                amount: parseFloat(p.amount),
                note: p.note,
                date: p.date
            })));
        }
    };

    const addPayout = async (accountTypeId, amount, note = '', date = null) => {
        const dateToUse = date || new Date().toISOString().split('T')[0];
        const accountType = accountTypes[accountTypeId];
        const firmId = accountType?.firmId || null;

        const { data: newPayout, error } = await supabase
            .from('payouts')
            .insert({
                user_id: user.id,
                account_type_id: accountTypeId || null,
                firm_id: firmId,
                amount: parseFloat(amount),
                note,
                date: dateToUse
            })
            .select()
            .single();

        if (error) {
            console.error('Add payout error:', error);
            toast.error(`Failed to add payout: ${error.message}`);
            return false;
        }

        setPayouts(prev => {
            const newP = {
                id: newPayout.id,
                accountTypeId: accountTypeId || null,
                firmId,
                amount: parseFloat(amount),
                note,
                date: dateToUse
            };
            return [...prev, newP].sort((a, b) => b.date.localeCompare(a.date));
        });

        toast.success(`Added payout: $${parseFloat(amount).toLocaleString()}`);
        return true;
    };

    const deletePayout = async (payoutId) => {
        const payout = payouts.find(p => p.id === payoutId);

        const { error } = await supabase
            .from('payouts')
            .delete()
            .eq('id', payoutId);

        if (error) {
            console.error('Delete payout error:', error);
            toast.error(`Failed to delete payout: ${error.message}`);
            return;
        }

        setPayouts(prev => prev.filter(p => p.id !== payoutId));
        toast.success(`Deleted payout: $${payout?.amount?.toLocaleString() || '0'}`);
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
            toast.error(`Failed to add goal: ${error.message}`);
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
        toast.success(`Added goal: ${goal.title}`);
        return goal;
    };

    const deleteGoal = async (goalId) => {
        const goalTitle = goals.find(g => g.id === goalId)?.title;

        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', goalId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete goal error:', error);
            toast.error(`Failed to delete goal: ${error.message}`);
            return;
        }

        setGoals(prev => prev.filter(g => g.id !== goalId));
        toast.success(`Deleted goal: ${goalTitle}`);
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

    // Calculate potential payout using per-account-type expected payouts
    const calculatePotentialPayout = () => {
        return Object.keys(accountTypes).reduce((total, typeId) => {
            const type = accountTypes[typeId];
            const typeAccounts = accounts[typeId] || [];
            const passedCount = typeAccounts.filter(a => a.status === 'passed' || a.status === 'funded').length;
            return total + (passedCount * (type.expectedPayout || 2000));
        }, 0);
    };

    // Get firm's max funded limit
    const getFirmLimit = (firmId) => {
        return firms[firmId]?.maxFunded || 0;
    };

    // Get firm's current funded count (across all account types)
    const getFirmFundedCount = (firmId) => {
        const firmTypes = Object.values(accountTypes).filter(t => t.firmId === firmId);
        return firmTypes.reduce((sum, t) => {
            const typeAccs = accounts[t.id] || [];
            return sum + typeAccs.filter(a => a.status === 'passed' || a.status === 'funded').length;
        }, 0);
    };

    // Helper to get account types for a specific firm
    const getAccountTypesForFirm = (firmId) => {
        return Object.values(accountTypes).filter(t => t.firmId === firmId);
    };

    // Build state object for backward compatibility
    const state = {
        accounts,
        expenses,
        payouts,
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
            expenses,
            addExpense,
            deleteExpense,
            // Payouts
            payouts,
            addPayout,
            deletePayout,
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
            calculatePotentialPayout,
            getFirmLimit,
            getFirmFundedCount
        }}>
            {children}
        </DashboardContext.Provider>
    );
}
