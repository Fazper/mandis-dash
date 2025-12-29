import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { GoalItem, GoalForm, AccountCard } from './widgets';

export default function Dashboard() {
    const {
        state,
        firms,
        accountTypes,
        addAccount,
        updateAccountStatus,
        updateAccountBalance,
        updateAccountProfitTarget,
        deleteAccount,
        getFirmLimit,
        getFirmFundedCount,
        addGoal,
        deleteGoal,
        toggleGoalCompletion,
        getTodaysGoals
    } = useDashboard();

    const [showGoalForm, setShowGoalForm] = useState(false);
    const hasAccountTypes = Object.keys(accountTypes).length > 0;
    const todaysGoals = getTodaysGoals();

    const handleAddGoal = async (goalData) => {
        await addGoal(goalData);
        setShowGoalForm(false);
    };

    if (!hasAccountTypes) {
        return (
            <div className="dashboard-tab">
                <div className="empty-state">
                    <div className="empty-icon">🏦</div>
                    <h2>No Account Types Configured</h2>
                    <p>Set up your prop firms and account types to start tracking.</p>
                    <NavLink to="/money" className="setup-btn">
                        Go to Money Tab
                    </NavLink>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-tab">
            <section className="daily-goals">
                <div className="section-header">
                    <h2>Today's Goals</h2>
                    <button className="add-goal-btn" onClick={() => setShowGoalForm(!showGoalForm)}>
                        {showGoalForm ? '−' : '+'} Add Goal
                    </button>
                </div>

                {showGoalForm && (
                    <GoalForm
                        accountTypes={accountTypes}
                        firms={firms}
                        onSubmit={handleAddGoal}
                        onCancel={() => setShowGoalForm(false)}
                    />
                )}

                <div className="task-list">
                    {todaysGoals.length === 0 ? (
                        <div className="no-goals">
                            <p>No goals for today. Create your first goal above!</p>
                        </div>
                    ) : (
                        todaysGoals.map(goal => (
                            <GoalItem
                                key={goal.id}
                                goal={goal}
                                accountTypes={accountTypes}
                                firms={firms}
                                onToggle={(completed) => toggleGoalCompletion(goal.id, completed)}
                                onDelete={() => deleteGoal(goal.id)}
                            />
                        ))
                    )}
                </div>
            </section>

            <section className="accounts">
                <h2>My Accounts</h2>
                <div className="accounts-grid">
                    {Object.values(accountTypes).map(type => {
                        const firm = firms[type.firmId];
                        const typeAccounts = state.accounts[type.id] || [];

                        return (
                            <AccountCard
                                key={type.id}
                                accountType={type}
                                firm={firm}
                                accounts={typeAccounts}
                                firmFunded={getFirmFundedCount(type.firmId)}
                                firmLimit={getFirmLimit(type.firmId)}
                                defaultEvalCost={type.evalCost || 0}
                                defaultActivationCost={type.activationCost || 0}
                                onAdd={(cost, target, date) => addAccount(type.id, cost, target, date)}
                                onStatusChange={(id, status, cost) => updateAccountStatus(type.id, id, status, cost)}
                                onBalanceChange={(id, balance) => updateAccountBalance(type.id, id, balance)}
                                onProfitTargetChange={(id, target) => updateAccountProfitTarget(type.id, id, target)}
                                onDelete={(id) => deleteAccount(type.id, id)}
                            />
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
