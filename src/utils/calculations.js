export function computeAll(inputs, edge) {
  const W = edge.winRate;
  const L = 1 - W;
  const RR = edge.rr;

  const expectancyR = W * RR - L;
  const expectancyDollar = inputs.rPerTrade * expectancyR;
  const profitFactor = (W * RR) / (L * 1);

  const fullKelly = W - L / RR;
  const halfKelly = fullKelly / 2;

  const profitNeeded = inputs.payoutCap / (inputs.withdrawalPct / 100);
  const tradesToPayout = profitNeeded / expectancyDollar;

  const pLL = L * L;
  const dailyExpected = expectancyDollar * inputs.tradesPerDay;
  const dailyMaxLoss = inputs.rPerTrade * inputs.dailyLossStop;
  const daysOfLossToRuin = inputs.eodDrawdown / dailyMaxLoss;
  const daysToTarget = tradesToPayout / inputs.tradesPerDay;
  const passRate = Math.min(0.95, Math.max(0.30, 1 - Math.pow(pLL, daysOfLossToRuin) * daysToTarget * 0.08));

  const challengeAttemptsPerFund = 1 / passRate;
  const costPerFunded = inputs.challengeCost * challengeAttemptsPerFund;

  const fundedSurvival = Math.min(0.95, Math.max(0.50, 1 - pLL * (profitNeeded / dailyExpected) * 0.02));

  const costPerPayout = costPerFunded / fundedSurvival;

  const grossPerPayout = inputs.payoutCap;
  const platformFee = grossPerPayout * (inputs.platformSplit / 100);
  const netPerPayout = grossPerPayout - platformFee;
  const totalNetRevenue = netPerPayout * inputs.numAccounts;
  const totalCost = costPerPayout * inputs.numAccounts;
  const netProfit = totalNetRevenue - totalCost;
  const roi = (netProfit / totalCost) * 100;

  const cleanBuffer = inputs.challengeCost * inputs.numAccounts;
  const moderateBuffer = cleanBuffer * 2.5;
  const worstBuffer = cleanBuffer * 3.5;

  const maxSafeR = inputs.eodDrawdown / (inputs.dailyLossStop + 1);

  return {
    expectancyR,
    expectancyDollar,
    dailyExpected,
    profitFactor,
    fullKelly: fullKelly * 100,
    halfKelly: halfKelly * 100,
    maxSafeR,
    passRate: passRate * 100,
    challengeAttempts: challengeAttemptsPerFund,
    costPerFunded,
    fundedSurvival: fundedSurvival * 100,
    costPerPayout,
    profitNeeded,
    tradesToPayout,
    daysToTarget,
    grossPerPayout,
    platformFee,
    netPerPayout,
    totalNetRevenue,
    totalCost,
    netProfit,
    roi,
    cleanBuffer,
    moderateBuffer,
    worstBuffer,
  };
}

export function stressTest(edge, eodDrawdown, rPerTrade, dailyLossStop) {
  const W = edge.winRate;
  const L = 1 - W;
  const pLL = L * L;

  const maxStreak100 = Math.ceil(Math.log(100) / Math.log(1 / L));
  const maxStreak500 = Math.ceil(Math.log(500) / Math.log(1 / L));

  const pStreak = (k, N) => {
    const p = L;
    return 1 - Math.pow(1 - Math.pow(p, k), N - k + 1);
  };

  const maxDailyLoss = rPerTrade * dailyLossStop;
  const daysToRuin = Math.floor(eodDrawdown / maxDailyLoss);
  const consecutiveLossesForRuin = Math.ceil(eodDrawdown / rPerTrade);

  const ruinR3 = eodDrawdown / 3;
  const ruinR4 = eodDrawdown / 4;
  const ruinR5 = eodDrawdown / 5;

  const pWW = W * W;
  const pMixed = 2 * W * L;
  const pTwoLLdays = pLL * pLL;

  return {
    maxStreak100,
    maxStreak500,
    pLL: pLL * 100,
    p3in100: pStreak(3, 100) * 100,
    p3in500: pStreak(3, 500) * 100,
    p4in100: pStreak(4, 100) * 100,
    p4in500: pStreak(4, 500) * 100,
    p5in100: pStreak(5, 100) * 100,
    p5in500: pStreak(5, 500) * 100,
    consecutiveLossesForRuin,
    daysToRuin,
    maxDailyLoss,
    pTwoLLdays: pTwoLLdays * 100,
    ruinR3,
    ruinR4,
    ruinR5,
    pWW: pWW * 100,
    pMixed: pMixed * 100,
  };
}

export function calcScenario(s) {
  const expectancyR = s.winRate * s.rr - (1 - s.winRate);
  const eChal = expectancyR * s.rChallenge;
  const eFund = expectancyR * s.rFunded;
  const dailyChal = eChal * s.tradesPerDay;
  const dailyFund = eFund * s.tradesPerDay;
  const daysToTarget = Math.ceil(s.profitTarget / dailyChal);
  const daysToPayout = Math.ceil(s.payoutCap / dailyFund);
  const costPerFunded = s.challengeCost / s.passRate;
  const costPerPayout = costPerFunded / s.fundedSurvival;
  const netPayout = s.payoutCap * (1 - s.splitPct);
  const netProfit = netPayout - costPerPayout;
  const roi = (netProfit / costPerPayout) * 100;
  const pLL = (1 - s.winRate) * (1 - s.winRate);
  const lossesToRuinChal = Math.floor(s.eodDD / s.rChallenge);
  const lossesToRuinFund = Math.floor(s.eodDD / s.rFunded);
  const portfolioNet = 5 * netProfit;
  const portfolioCost = 5 * costPerPayout;
  const ruinProbChal = s.rChallenge >= 1500 ? 0.33 : s.rChallenge >= 1000 ? 0.18 : 0.05;
  const ruinProbFund = s.rFunded >= 1500 ? 0.25 : s.rFunded >= 1000 ? 0.15 : 0.05;
  const survivalFund = 1 - ruinProbFund;

  return {
    ...s,
    expectancyR, eChal, eFund, dailyChal, dailyFund,
    daysToTarget, daysToPayout, costPerFunded, costPerPayout,
    netPayout, netProfit, roi, pLL,
    lossesToRuinChal, lossesToRuinFund,
    portfolioNet, portfolioCost,
    ruinProbChal, ruinProbFund, survivalFund,
  };
}

export function generateEquityCurve(rPerTrade, winRate, rr, startBalance, numTrades) {
  const points = [{ trade: 0, balance: startBalance }];
  let balance = startBalance;
  let seed = rPerTrade;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
  for (let i = 1; i <= numTrades; i++) {
    const win = rand() < winRate;
    balance += win ? rPerTrade * rr : -rPerTrade;
    points.push({ trade: i, balance: Math.round(balance) });
  }
  return points;
}

export function runMonteCarlo(winRate, rr, rPerTrade, numTrades, numSimulations, target, ruinLevel) {
  const curves = [];
  const finalBalances = [];
  let hitTarget = 0;
  let hitRuin = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    const curve = [{ trade: 0, balance: 0 }];
    let balance = 0;
    let ruined = false;
    let targeted = false;

    for (let t = 1; t <= numTrades; t++) {
      const win = Math.random() < winRate;
      balance += win ? rPerTrade * rr : -rPerTrade;
      curve.push({ trade: t, balance: Math.round(balance) });

      if (balance <= ruinLevel && !ruined) ruined = true;
      if (balance >= target && !targeted) targeted = true;
    }

    curves.push(curve);
    finalBalances.push(Math.round(balance));
    if (targeted) hitTarget++;
    if (ruined) hitRuin++;
  }

  finalBalances.sort((a, b) => a - b);
  const pct = (p) => finalBalances[Math.floor(finalBalances.length * p)] ?? 0;

  return {
    curves,
    finalBalances,
    percentiles: {
      p10: pct(0.1),
      p25: pct(0.25),
      p50: pct(0.5),
      p75: pct(0.75),
      p90: pct(0.9),
    },
    probTarget: (hitTarget / numSimulations) * 100,
    probRuin: (hitRuin / numSimulations) * 100,
  };
}
