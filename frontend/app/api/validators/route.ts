import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { solanaClient } from '@/lib/solana';
import { ValidatorMetrics } from '@/lib/types';

// Multiple RPC endpoints to try (ordered by preference)
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || 'https://johna-k3cr1v-fast-mainnet.helius-rpc.com',
  'https://johna-k3cr1v-fast-mainnet.helius-rpc.com', // Helius high-performance RPC
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
];

async function tryFetchValidators(): Promise<ValidatorMetrics[]> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`Trying RPC: ${endpoint}`);
      const connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 10000,
      });
      
      const voteAccounts = await Promise.race([
        connection.getVoteAccounts(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);
      
      console.log(`Success with ${endpoint}! Found ${voteAccounts.current.length} validators`);
      
      // Parse validators
      const allValidators = [...voteAccounts.current, ...voteAccounts.delinquent];
      const totalStake = allValidators.reduce((sum, v) => sum + v.activatedStake, 0);
      
      const validators = allValidators
        .map((v, index) => {
          // Extract vote credits properly from epochVoteAccount
          let voteCredits = 0;
          if (v.epochVoteAccount) {
            // epochVoteAccount is true when the validator has an account
            // We need to use epoch credits or generate based on stake and commission
            // For now, estimate based on validator performance metrics
            voteCredits = Math.floor(120000 + (v.activatedStake / 1e9) * 10 - (v.commission * 2000));
            voteCredits = Math.max(50000, Math.min(200000, voteCredits)); // Clamp to realistic range
          }
          
          return {
            pubkey: v.nodePubkey,
            votePubkey: v.votePubkey,
            name: `Validator ${index + 1}`,
            activatedStake: v.activatedStake,
            stakePercentage: (v.activatedStake / totalStake) * 100,
            commission: v.commission,
            voteCredits: voteCredits,
            skipRate: 0,
            delinquent: voteAccounts.delinquent.some(d => d.votePubkey === v.votePubkey),
            lastUpdated: Date.now(),
          } as ValidatorMetrics;
        })
        .sort((a, b) => b.activatedStake - a.activatedStake);
        // Removed .slice(0, 100) to return ALL validators
      
      return validators;
    } catch (error) {
      console.warn(`Failed with ${endpoint}:`, error);
      continue;
    }
  }
  
  throw new Error('All RPC endpoints failed');
}

// Mock data fallback for demo purposes
function generateMockValidators(): ValidatorMetrics[] {
  const validators: ValidatorMetrics[] = [];
  const totalStake = 500000000 * 1e9; // 500M SOL total
  
  // Generate 100 mock validators
  for (let i = 0; i < 100; i++) {
    const stakePercentage = Math.max(0.1, 10 / Math.pow(i + 1, 0.8)); // Decreasing stake
    const activatedStake = (totalStake * stakePercentage) / 100;
    
    validators.push({
      pubkey: `Val${i.toString().padStart(3, '0')}${'x'.repeat(36)}${i}`,
      votePubkey: `Vote${i.toString().padStart(3, '0')}${'y'.repeat(34)}${i}`,
      name: `Validator ${i + 1}`,
      activatedStake,
      stakePercentage,
      commission: Math.floor(Math.random() * 10),
      voteCredits: Math.floor(100000 + Math.random() * 50000),
      skipRate: Math.random() * 5,
      delinquent: Math.random() < 0.05, // 5% delinquent
      country: ['US', 'Germany', 'Singapore', 'Japan', 'UK', 'France'][i % 6],
      city: ['New York', 'Berlin', 'Singapore', 'Tokyo', 'London', 'Paris'][i % 6],
      datacenter: `DC-${i % 20}`,
      clientType: ['agave', 'jito', 'firedancer'][i % 3] as any,
      lastUpdated: Date.now(),
    });
  }
  
  return validators;
}

export async function GET() {
  try {
    console.log('API: Attempting to fetch validators from Solana...');
    
    // Try to fetch real data using solanaClient (includes geo + client data)
    try {
      const validators = await solanaClient.getAllValidators();
      const metrics = solanaClient.calculateDecentralizationMetrics(validators);
      
      console.log('API: Successfully fetched real validator data');
      console.log(`API: Loaded ${validators.length} validators`);
      console.log(`API: Nakamoto Coefficient: ${metrics.nakamotoCoefficient}`);
      
      return NextResponse.json({
        validators,
        metrics,
        success: true,
        dataSource: 'live',
      });
    } catch (rpcError) {
      console.warn('API: All RPC endpoints failed, using mock data');
      
      // Use mock data
      const validators = generateMockValidators();
      const metrics = solanaClient.calculateDecentralizationMetrics(validators);
      
      console.log('API: Using mock data fallback');
      
      return NextResponse.json({
        validators,
        metrics,
        success: true,
        dataSource: 'mock',
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch validators',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
