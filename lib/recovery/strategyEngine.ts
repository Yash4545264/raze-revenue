import { RecommendedActionType } from '@/types';

import { MerchantPolicies } from '@/types';

type StrategyInput = {
  revenueAtRisk: number;
  policies: MerchantPolicies;
  alternativeActions: {
    action: RecommendedActionType;
    estimated_probability: number;
  }[];
};

type StrategyEvaluation = {
  action: RecommendedActionType;
  estimatedProbability: number;
  expectedRecoveryValue: number;
  interventionCost: number;
  expectedNetRecovery: number;
};

import { getDb } from '@/lib/db/supabaseStore';

export const evaluateStrategies = async (input: StrategyInput): Promise<StrategyEvaluation[]> => {
  const empiricalRates = await (await getDb()).getActionSuccessRates();

  const getCost = (action: RecommendedActionType): number => {
    switch (action) {
      case 'payment_link': return input.policies.cost_payment_link ?? 0.00;
      case 'customer_reminder': return input.policies.cost_customer_reminder ?? 0.11;
      case 'switch_payment_method': return input.policies.cost_switch_payment_method ?? 0.18;
      case 'human_escalation': return input.policies.cost_human_escalation ?? 10.40;
      default: return 0.00;
    }
  };

  const GATEWAY_FEE_RATE = input.policies.gateway_fee_rate ?? 0.0236;

  const evaluations: StrategyEvaluation[] = input.alternativeActions.map(alt => {
    const cost = getCost(alt.action);
    
    // AI Estimated Probability
    let blendedProbability = alt.estimated_probability;

    // Blend with empirical data if we have it
    const empirical = empiricalRates[alt.action];
    if (empirical && empirical.total >= 5) { // Only trust empirical data after 5 attempts
      const empiricalProbability = empirical.success / empirical.total;
      
      // Blend 60% empirical, 40% AI prediction
      blendedProbability = (empiricalProbability * 0.6) + (alt.estimated_probability * 0.4);
    }

    // Gateway fee is dynamic based on policies (typically 2.36%)
    // Expected value = (Amount * Probability) * (1 - Processing Fee)
    const expectedRecoveryValue = (input.revenueAtRisk * blendedProbability) * (1 - GATEWAY_FEE_RATE);
    const expectedNetRecovery = expectedRecoveryValue - cost;

    return {
      action: alt.action,
      estimatedProbability: blendedProbability,
      expectedRecoveryValue,
      interventionCost: cost,
      expectedNetRecovery
    };
  });

  // Sort by expected net recovery descending
  return evaluations.sort((a, b) => b.expectedNetRecovery - a.expectedNetRecovery);
};

export const selectBestStrategy = (evaluations: StrategyEvaluation[]): StrategyEvaluation => {
  if (evaluations.length === 0) {
    return {
      action: 'do_nothing',
      estimatedProbability: 0,
      expectedRecoveryValue: 0,
      interventionCost: 0,
      expectedNetRecovery: 0
    };
  }
  
  const best = evaluations[0];
  
  // If the best net recovery is negative, we shouldn't do it!
  if (best.expectedNetRecovery <= 0) {
    return {
      action: 'do_nothing',
      estimatedProbability: 0,
      expectedRecoveryValue: 0,
      interventionCost: 0,
      expectedNetRecovery: 0
    };
  }
  
  return best;
};
