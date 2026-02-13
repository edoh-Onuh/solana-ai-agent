/**
 * Stake Account Utilities
 * 
 * Enhanced stake account querying inspired by collect_validator_stake.py
 * Provides more accurate validator stake calculations by querying actual stake accounts
 */

import { Connection, PublicKey } from '@solana/web3.js';

const STAKE_PROGRAM_ID = new PublicKey('Stake11111111111111111111111111111111111111');
const STAKE_ACCOUNT_DATA_SIZE = 200;
const VOTER_PUBKEY_OFFSET = 124;

export interface StakeAccountInfo {
  stakeAccount: string;
  accountLamports: number;
  accountSol: number;
  delegatedVoteAccount: string;
  delegatedStakeLamports: number;
  delegatedStakeSol: number;
  stakerAuthority: string | null;
  withdrawAuthority: string | null;
  activationEpoch: number | null;
  deactivationEpoch: number | null;
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Query all stake accounts delegated to a specific vote account
 * This provides granular stake data similar to collect_validator_stake.py
 */
export async function getStakeAccountsForVote(
  connection: Connection,
  votePubkey: string
): Promise<StakeAccountInfo[]> {
  try {
    const votePubkeyObj = new PublicKey(votePubkey);
    
    // Query stake accounts using getProgramAccounts with filters
    const accounts = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
      commitment: 'confirmed',
      encoding: 'jsonParsed',
      filters: [
        {
          dataSize: STAKE_ACCOUNT_DATA_SIZE,
        },
        {
          memcmp: {
            offset: VOTER_PUBKEY_OFFSET,
            bytes: votePubkey,
          },
        },
      ],
    });

    const stakeAccounts: StakeAccountInfo[] = [];

    for (const account of accounts) {
      const pubkey = account.pubkey.toBase58();
      const lamports = account.account.lamports;
      
      // Parse the account data
      const parsed = (account.account.data as any).parsed;
      const info = parsed?.info || {};
      
      const meta = info.meta || {};
      const authorized = meta.authorized || {};
      const stake = info.stake || {};
      const delegation = stake.delegation || {};

      stakeAccounts.push({
        stakeAccount: pubkey,
        accountLamports: lamports,
        accountSol: lamportsToSol(lamports),
        delegatedVoteAccount: delegation.voter || '',
        delegatedStakeLamports: parseInt(delegation.stake || '0'),
        delegatedStakeSol: lamportsToSol(parseInt(delegation.stake || '0')),
        stakerAuthority: authorized.staker || null,
        withdrawAuthority: authorized.withdrawer || null,
        activationEpoch: delegation.activationEpoch || null,
        deactivationEpoch: delegation.deactivationEpoch || null,
      });
    }

    return stakeAccounts;
  } catch (error) {
    console.error(`Error querying stake accounts for vote ${votePubkey}:`, error);
    return [];
  }
}

/**
 * Get aggregated stake information for a validator
 * Returns total delegated stake from all stake accounts
 */
export async function getValidatorAggregatedStake(
  connection: Connection,
  votePubkey: string
): Promise<{
  totalAccounts: number;
  totalDelegatedLamports: number;
  totalDelegatedSol: number;
  accounts: StakeAccountInfo[];
}> {
  const accounts = await getStakeAccountsForVote(connection, votePubkey);
  
  const totalDelegatedLamports = accounts.reduce(
    (sum, acc) => sum + acc.delegatedStakeLamports,
    0
  );

  return {
    totalAccounts: accounts.length,
    totalDelegatedLamports,
    totalDelegatedSol: lamportsToSol(totalDelegatedLamports),
    accounts,
  };
}

/**
 * Batch query stake accounts for multiple validators
 * More efficient than querying one by one
 */
export async function batchGetValidatorStakes(
  connection: Connection,
  votePubkeys: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, { totalAccounts: number; totalDelegatedSol: number }>> {
  const results = new Map<string, { totalAccounts: number; totalDelegatedSol: number }>();
  
  for (let i = 0; i < votePubkeys.length; i++) {
    const votePubkey = votePubkeys[i];
    
    try {
      const stakeData = await getValidatorAggregatedStake(connection, votePubkey);
      results.set(votePubkey, {
        totalAccounts: stakeData.totalAccounts,
        totalDelegatedSol: stakeData.totalDelegatedSol,
      });
      
      if (onProgress) {
        onProgress(i + 1, votePubkeys.length);
      }
      
      // Rate limiting to be nice to the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing validator ${votePubkey}:`, error);
      results.set(votePubkey, { totalAccounts: 0, totalDelegatedSol: 0 });
    }
  }
  
  return results;
}

/**
 * Validate stake data accuracy by comparing RPC getVoteAccounts with stake accounts query
 * Returns discrepancy percentage
 */
export async function validateStakeAccuracy(
  connection: Connection,
  votePubkey: string,
  reportedStakeLamports: number
): Promise<{
  reported: number;
  queried: number;
  discrepancy: number;
  discrepancyPercent: number;
  accurate: boolean;
}> {
  const stakeData = await getValidatorAggregatedStake(connection, votePubkey);
  const discrepancy = Math.abs(reportedStakeLamports - stakeData.totalDelegatedLamports);
  const discrepancyPercent = (discrepancy / reportedStakeLamports) * 100;
  
  return {
    reported: lamportsToSol(reportedStakeLamports),
    queried: stakeData.totalDelegatedSol,
    discrepancy: lamportsToSol(discrepancy),
    discrepancyPercent,
    accurate: discrepancyPercent < 1, // Within 1% is considered accurate
  };
}
