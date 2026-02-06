// TypeScript types for Validator Pulse AI Agent

export interface ValidatorInfo {
  pubkey: string;
  votePubkey: string;
  activatedStake: number;
  commission: number;
  epochVoteCredits: number;
  epochCredits: number;
  lastVote: number;
  rootSlot: number;
  delinquent: boolean;
}

export interface ValidatorMetrics {
  pubkey: string;
  votePubkey: string;
  name?: string;
  
  // Performance metrics
  activatedStake: number;
  stakePercentage: number;
  commission: number;
  voteCredits: number;
  skipRate: number;
  delinquent: boolean;
  
  // Decentralization metrics
  datacenter?: string;
  country?: string;
  city?: string;
  autonomousSystemNumber?: number;
  autonomousSystemOrganization?: string;
  
  // Client diversity
  clientVersion?: string;
  clientType?: 'agave' | 'jito' | 'firedancer' | 'unknown';
  
  // Scoring
  decentralizationScore?: number;
  performanceScore?: number;
  overallScore?: number;
  
  // Timestamps
  lastUpdated: number;
}

export interface AIRecommendation {
  id: string;
  timestamp: number;
  validators: ValidatorRecommendation[];
  reasoning: string;
  confidence: number;
  expectedImpact: {
    nakamotoCoefficient: {
      current: number;
      projected: number;
    };
    stakeDistribution: {
      before: string;
      after: string;
    };
  };
  status: 'pending' | 'approved' | 'rejected';
  votes: {
    approve: number;
    reject: number;
    total: number;
  };
}

export interface ValidatorRecommendation {
  pubkey: string;
  name?: string;
  recommendedStake: number;
  currentStake: number;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
  decentralizationScore: number;
  performanceScore: number;
}

export interface DecentralizationMetrics {
  nakamotoCoefficient: number;
  herfindahlIndex: number;
  giniCoefficient: number;
  geographicDiversity: {
    countries: number;
    cities: number;
    datacenters: number;
  };
  clientDiversity: {
    agave: number;
    jito: number;
    firedancer: number;
    unknown: number;
  };
  topValidatorConcentration: {
    top10Percentage: number;
    top20Percentage: number;
    top50Percentage: number;
  };
}

export interface ScoringWeights {
  performance: number;
  decentralization: number;
  sustainability: number;
  governance: number;
}

export interface Vote {
  recommendationId: string;
  voter: string;
  vote: 'approve' | 'reject';
  timestamp: number;
  comment?: string;
}
