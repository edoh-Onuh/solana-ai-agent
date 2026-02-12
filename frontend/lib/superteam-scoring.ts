/**
 * Superteam Validator Scoring System
 * 
 * Provides separate scoring metrics for Superteam validators
 * to compare performance within the community
 */

import { ValidatorMetrics } from './types';

export interface SuperteamScore {
  pubkey: string;
  name: string;
  totalScore: number;
  performanceScore: number;
  stakingScore: number;
  reliabilityScore: number;
  decentralizationScore: number;
  rank: number;
}

/**
 * Calculate comprehensive score for a Superteam validator
 */
export function calculateSuperteamScore(validator: ValidatorMetrics): SuperteamScore {
  // Performance Score (0-25 points)
  // Based on commission (lower is better) and vote credits
  const commissionScore = Math.max(0, (10 - validator.commission) * 2.5); // 0% = 25 points, 10% = 0 points
  const performanceScore = commissionScore;

  // Staking Score (0-25 points)
  // Based on total activated stake (higher is better, but not too high for decentralization)
  const stakeSOL = validator.activatedStake / 1e9;
  const stakingScore = Math.min(25, (stakeSOL / 100000) * 25); // 100K SOL = 25 points

  // Reliability Score (0-25 points)
  // Based on delinquency status and skip rate
  const reliabilityScore = validator.delinquent ? 0 : 25;

  // Decentralization Score (0-25 points)
  // Based on stake percentage (lower is better for network health)
  const stakePercentage = validator.stakePercentage;
  const decentralizationScore = stakePercentage < 0.1 ? 25 : 
                                 stakePercentage < 0.5 ? 20 :
                                 stakePercentage < 1.0 ? 15 :
                                 stakePercentage < 2.0 ? 10 : 5;

  const totalScore = performanceScore + stakingScore + reliabilityScore + decentralizationScore;

  return {
    pubkey: validator.pubkey,
    name: validator.name,
    totalScore: Math.round(totalScore),
    performanceScore: Math.round(performanceScore),
    stakingScore: Math.round(stakingScore),
    reliabilityScore: Math.round(reliabilityScore),
    decentralizationScore: Math.round(decentralizationScore),
    rank: 0, // Will be set after sorting
  };
}

/**
 * Calculate and rank all Superteam validators
 */
export function rankSuperteamValidators(validators: ValidatorMetrics[]): SuperteamScore[] {
  const scores = validators.map(v => calculateSuperteamScore(v));
  
  // Sort by total score (highest first)
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  // Assign ranks
  scores.forEach((score, index) => {
    score.rank = index + 1;
  });
  
  return scores;
}

/**
 * Get score breakdown explanation
 */
export function getScoreBreakdown() {
  return {
    performance: 'Based on commission rate (0-10%). Lower commission = higher score',
    staking: 'Based on total stake. Sweet spot around 100K-500K SOL',
    reliability: 'Based on uptime and delinquency status. Non-delinquent = 25 points',
    decentralization: 'Based on network stake percentage. Lower percentage = better for network health',
  };
}
