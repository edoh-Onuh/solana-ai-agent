// Solana RPC client for fetching validator data
import { Connection, VoteAccountStatus, PublicKey } from '@solana/web3.js';
import { ValidatorInfo, ValidatorMetrics, DecentralizationMetrics } from './types';

// Use server-side env variable if available, fallback to public
const RPC_URL = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export class SolanaClient {
  private connection: Connection;

  constructor(rpcUrl: string = RPC_URL) {
    // Use 'confirmed' commitment for faster responses
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }

  /**
   * Fetch all vote accounts (validators) from Solana
   */
  async getVoteAccounts(): Promise<VoteAccountStatus> {
    try {
      const voteAccounts = await this.connection.getVoteAccounts();
      return voteAccounts;
    } catch (error) {
      console.error('Error fetching vote accounts:', error);
      throw error;
    }
  }

  /**
   * Parse vote account data into ValidatorInfo
   */
  parseValidatorInfo(voteAccount: any): ValidatorInfo {
    return {
      pubkey: voteAccount.nodePubkey,
      votePubkey: voteAccount.votePubkey,
      activatedStake: voteAccount.activatedStake,
      commission: voteAccount.commission,
      epochVoteCredits: voteAccount.epochVoteAccount || 0,
      epochCredits: voteAccount.epochCredits || 0,
      lastVote: voteAccount.lastVote || 0,
      rootSlot: voteAccount.rootSlot || 0,
      delinquent: false,
    };
  }

  /**
   * Get all validators with enhanced metrics
   */
  async getAllValidators(): Promise<ValidatorMetrics[]> {
    try {
      const voteAccounts = await this.getVoteAccounts();
      const allValidators = [...voteAccounts.current, ...voteAccounts.delinquent];
      
      // Calculate total stake for percentage calculations
      const totalStake = allValidators.reduce((sum, v) => sum + v.activatedStake, 0);

      // Parse validators
      const validators = allValidators.map((voteAccount, index) => {
        const info = this.parseValidatorInfo(voteAccount);
        const stakePercentage = (info.activatedStake / totalStake) * 100;
        
        return {
          pubkey: info.pubkey,
          votePubkey: info.votePubkey,
          name: `Validator ${index + 1}`, // TODO: Fetch real names
          activatedStake: info.activatedStake,
          stakePercentage,
          commission: info.commission,
          voteCredits: info.epochVoteCredits,
          skipRate: 0, // TODO: Calculate from block production
          delinquent: voteAccounts.delinquent.some(v => v.votePubkey === info.votePubkey),
          lastUpdated: Date.now(),
        } as ValidatorMetrics;
      });

      return validators;
    } catch (error) {
      console.error('Error fetching validators:', error);
      throw error;
    }
  }

  /**
   * Get top validators by stake
   */
  async getTopValidators(limit: number = 100): Promise<ValidatorMetrics[]> {
    const allValidators = await this.getAllValidators();
    return allValidators
      .filter(v => !v.delinquent)
      .sort((a, b) => b.activatedStake - a.activatedStake)
      .slice(0, limit);
  }

  /**
   * Calculate decentralization metrics
   */
  calculateDecentralizationMetrics(validators: ValidatorMetrics[]): DecentralizationMetrics {
    const sortedByStake = [...validators].sort((a, b) => b.activatedStake - a.activatedStake);
    const totalStake = validators.reduce((sum, v) => sum + v.activatedStake, 0);

    // Nakamoto Coefficient: Minimum validators needed to control >33% of stake
    let cumulativeStake = 0;
    let nakamotoCoefficient = 0;
    const thresholdStake = totalStake * 0.33;
    
    for (const validator of sortedByStake) {
      cumulativeStake += validator.activatedStake;
      nakamotoCoefficient++;
      if (cumulativeStake > thresholdStake) break;
    }

    // Herfindahl Index: Sum of squared market shares
    const herfindahlIndex = validators.reduce((sum, v) => {
      const marketShare = v.activatedStake / totalStake;
      return sum + (marketShare * marketShare);
    }, 0);

    // Top validator concentration
    const top10Stake = sortedByStake.slice(0, 10).reduce((sum, v) => sum + v.activatedStake, 0);
    const top20Stake = sortedByStake.slice(0, 20).reduce((sum, v) => sum + v.activatedStake, 0);
    const top50Stake = sortedByStake.slice(0, 50).reduce((sum, v) => sum + v.activatedStake, 0);

    // Geographic diversity (placeholder - need IP geolocation)
    const uniqueCountries = new Set(validators.map(v => v.country).filter(Boolean));
    const uniqueCities = new Set(validators.map(v => v.city).filter(Boolean));
    const uniqueDatacenters = new Set(validators.map(v => v.datacenter).filter(Boolean));

    // Client diversity
    const clientCounts = validators.reduce((acc, v) => {
      const type = v.clientType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      nakamotoCoefficient,
      herfindahlIndex,
      giniCoefficient: 0, // TODO: Calculate Gini coefficient
      geographicDiversity: {
        countries: uniqueCountries.size || 0,
        cities: uniqueCities.size || 0,
        datacenters: uniqueDatacenters.size || 0,
      },
      clientDiversity: {
        agave: clientCounts['agave'] || 0,
        jito: clientCounts['jito'] || 0,
        firedancer: clientCounts['firedancer'] || 0,
        unknown: clientCounts['unknown'] || 0,
      },
      topValidatorConcentration: {
        top10Percentage: (top10Stake / totalStake) * 100,
        top20Percentage: (top20Stake / totalStake) * 100,
        top50Percentage: (top50Stake / totalStake) * 100,
      },
    };
  }

  /**
   * Get cluster info
   */
  async getClusterInfo() {
    try {
      const [version, supply, epochInfo] = await Promise.all([
        this.connection.getVersion(),
        this.connection.getSupply(),
        this.connection.getEpochInfo(),
      ]);

      return {
        version,
        supply,
        epochInfo,
      };
    } catch (error) {
      console.error('Error fetching cluster info:', error);
      throw error;
    }
  }
}

// Singleton instance
export const solanaClient = new SolanaClient();
