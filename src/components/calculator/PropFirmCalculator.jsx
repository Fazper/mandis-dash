import { useState, useMemo } from 'react';
import CalculatorTab from './CalculatorTab';
import StressTestTab from './StressTestTab';
import OverviewTab from './OverviewTab';
import { RoiCostTab, SpeedSafetyTab, RuinCurvesTab, EquitySimTab, PortfolioTab } from './DashboardCharts';
import WhatIfTab from './WhatIfTab';
import MonteCarloTab from './MonteCarloTab';
import FirmComparisonTab from './FirmComparisonTab';
import { calcScenario } from '../../utils/calculations';
import scenarios from '../../data/scenarios.json';

const TAB_GROUPS = [
  {
    label: 'Calculator',
    tabs: [
      { id: 'calculator', label: 'Calculator' },
      { id: 'stress', label: 'Stress Test' },
    ],
  },
  {
    label: 'Dashboard',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'roi-cost', label: 'ROI & Cost' },
      { id: 'speed-safety', label: 'Speed vs Safety' },
      { id: 'ruin', label: 'Ruin Curves' },
      { id: 'equity-sim', label: 'Equity Sim' },
      { id: 'portfolio', label: 'Portfolio' },
    ],
  },
  {
    label: 'Advanced',
    tabs: [
      { id: 'whatif', label: 'What-If' },
      { id: 'montecarlo', label: 'Monte Carlo' },
      { id: 'comparison', label: 'Firm Compare' },
    ],
  },
];

export default function PropFirmCalculator() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [edge, setEdge] = useState({ winRate: 0.57, rr: 1.5 });
  const [inputs, setInputs] = useState({
    challengeCost: 215,
    profitTarget: 9000,
    eodDrawdown: 4500,
    payoutCap: 5000,
    withdrawalPct: 50,
    platformSplit: 10,
    numAccounts: 5,
    rPerTrade: 1500,
    tradesPerDay: 2,
    dailyLossStop: 2,
  });

  const scenarioData = useMemo(() => scenarios.map(calcScenario), []);

  const handleEdgeChange = (key, value) => setEdge(prev => ({ ...prev, [key]: value }));
  const handleInputChange = (key, value) => setInputs(prev => ({ ...prev, [key]: value }));

  const expectancy = edge.winRate * edge.rr - (1 - edge.winRate);

  return (
    <div className="calc-page">
      <div className="calc-header">
        <div className="calc-header-badge">PROP FIRM ROI SYSTEM</div>
        <h1 className="calc-header-title">Universal Calculator & Analytics</h1>
        <p className="calc-header-subtitle">
          Edge: {(edge.winRate * 100).toFixed(0)}% WR · {edge.rr} R:R · +{expectancy.toFixed(3)}R expectancy
        </p>
      </div>

      <div className="calc-tabs">
        {TAB_GROUPS.map((group) => (
          <div key={group.label} className="calc-tab-group">
            <span className="calc-tab-group-label">{group.label}</span>
            <div className="calc-tab-buttons">
              {group.tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`calc-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="calc-content">
        {activeTab === 'calculator' && (
          <CalculatorTab edge={edge} inputs={inputs} onEdgeChange={handleEdgeChange} onInputChange={handleInputChange} />
        )}
        {activeTab === 'stress' && <StressTestTab edge={edge} inputs={inputs} />}
        {activeTab === 'overview' && <OverviewTab data={scenarioData} />}
        {activeTab === 'roi-cost' && <RoiCostTab data={scenarioData} />}
        {activeTab === 'speed-safety' && <SpeedSafetyTab data={scenarioData} />}
        {activeTab === 'ruin' && <RuinCurvesTab />}
        {activeTab === 'equity-sim' && <EquitySimTab />}
        {activeTab === 'portfolio' && <PortfolioTab />}
        {activeTab === 'whatif' && <WhatIfTab />}
        {activeTab === 'montecarlo' && <MonteCarloTab />}
        {activeTab === 'comparison' && <FirmComparisonTab edge={edge} rPerTrade={inputs.rPerTrade} />}
      </div>

      <div className="calc-footer">
        Pass rate & funded survival are estimates. Verify with simulation for precision.
      </div>
    </div>
  );
}
