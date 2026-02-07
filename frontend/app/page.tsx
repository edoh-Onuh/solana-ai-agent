'use client';

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Shield, AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { ValidatorMetrics, DecentralizationMetrics, AIRecommendation } from '@/lib/types';
import { MetricsCharts } from '@/components/MetricsCharts';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface VoteDisplay {
  id: string;
  wallet: string;
  voteType: 'approve' | 'reject';
  timestamp: string;
}

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [validators, setValidators] = useState<ValidatorMetrics[]>([]);
  const [metrics, setMetrics] = useState<DecentralizationMetrics | null>(null);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live');
  const [userVote, setUserVote] = useState<'approve' | 'reject' | null>(null);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [recentVotes, setRecentVotes] = useState<VoteDisplay[]>([]);

  useEffect(() => {
    loadValidators();
    checkStatus();
  }, []);

  useEffect(() => {
    if (!recommendation?.id) return;

    // Load initial recent votes
    loadRecentVotes(recommendation.id);

    // Set up polling for live updates
    const interval = setInterval(() => {
      loadRecentVotes(recommendation.id);
      updateVoteCounts(recommendation.id);
    }, 3000); // Update every 3 seconds

    return () => {
      clearInterval(interval);
    };
  }, [recommendation?.id]);

  async function loadRecentVotes(recommendationId: string) {
    try {
      const response = await fetch(`/api/votes/recent?recommendationId=${recommendationId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`[${new Date().toLocaleTimeString()}] Loaded ${data.votes.length} votes`);
          setRecentVotes(data.votes.map((v: any) => ({
            id: v.id,
            wallet: v.wallet_address,
            voteType: v.vote_type,
            timestamp: v.created_at,
          })));
        }
      }
    } catch (err) {
      console.error('Error loading recent votes:', err);
    }
  }

  async function updateVoteCounts(recommendationId: string) {
    try {
      const response = await fetch(`/api/votes?recommendationId=${recommendationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && recommendation) {
          const updatedRec = { ...recommendation };
          updatedRec.votes.approve = data.voteCounts.approves;
          updatedRec.votes.reject = data.voteCounts.rejects;
          updatedRec.votes.total = data.voteCounts.approves + data.voteCounts.rejects;
          setRecommendation(updatedRec);
        }
      }
    } catch (err) {
      console.error('Error updating vote counts:', err);
    }
  }

  async function checkStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setOpenaiConfigured(data.openai.configured);
      console.log('System status:', data);
    } catch (err) {
      console.error('Error checking status:', err);
    }
  }

  async function loadValidators() {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching validators from API...');
      const response = await fetch('/api/validators');
      
      if (!response.ok) {
        throw new Error('Failed to fetch validators');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setValidators(data.validators);
      setMetrics(data.metrics);
      setDataSource(data.dataSource || 'live');
      
      console.log(`Loaded ${data.validators.length} validators`);
      console.log('Nakamoto Coefficient:', data.metrics.nakamotoCoefficient);
      console.log('Data source:', data.dataSource);
    } catch (err) {
      console.error('Error loading validators:', err);
      setError('Failed to load validators. Check console for details.');
    } finally {
      setLoading(false);
    }
  }

  async function generateAIRecommendation() {
    if (!metrics) return;
    
    try {
      setAnalyzing(true);
      setError(null);
      setUserVote(null); // Reset vote
      console.log('Generating AI recommendations...');
      
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validators,
          metrics,
          targetStake: 1000000,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recommendation');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setRecommendation(data.recommendation);
      console.log('Recommendation generated:', data.recommendation);
      
      // Load existing vote counts from database
      if (data.recommendation?.id) {
        try {
          const votesResponse = await fetch(`/api/votes?recommendationId=${data.recommendation.id}`);
          if (votesResponse.ok) {
            const votesData = await votesResponse.json();
            if (votesData.success) {
              data.recommendation.votes.approve = votesData.voteCounts.approves;
              data.recommendation.votes.reject = votesData.voteCounts.rejects;
              data.recommendation.votes.total = votesData.voteCounts.approves + votesData.voteCounts.rejects;
              setRecommendation({ ...data.recommendation });
            }
          }
        } catch (err) {
          console.error('Error loading vote counts:', err);
        }
      }
    } catch (err) {
      console.error('Error generating recommendation:', err);
      setError('Failed to generate recommendation. Check console for details.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleVote(vote: 'approve' | 'reject') {
    if (!recommendation || !connected || !publicKey) {
      alert('Please connect your wallet to vote');
      return;
    }
    
    if (votingInProgress) return;
    
    try {
      setVotingInProgress(true);
      
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: recommendation.id,
          walletAddress: publicKey.toBase58(),
          voteType: vote,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record vote');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUserVote(vote);
        
        // Update vote counts from server response
        const updatedRec = { ...recommendation };
        updatedRec.votes.approve = data.voteCounts.approves;
        updatedRec.votes.reject = data.voteCounts.rejects;
        updatedRec.votes.total = data.voteCounts.approves + data.voteCounts.rejects;
        setRecommendation(updatedRec);
        
        console.log(`Vote cast: ${vote}`);
        console.log('Updated votes:', updatedRec.votes);
      }
    } catch (err) {
      console.error('Error voting:', err);
      alert('Failed to record vote. Please try again.');
    } finally {
      setVotingInProgress(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-white text-xl">Loading Validator Data...</p>
          <p className="text-purple-300 text-sm mt-2">Fetching from Solana mainnet</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">{error}</p>
          <button
            onClick={loadValidators}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
      <main className="max-w-7xl mx-auto">
        {/* Data Source Banner */}
        {dataSource === 'mock' && (
          <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
            <p className="text-yellow-200 text-sm">
              ⚠️ Demo Mode: Using mock data (Solana RPC timeout or rate limited)
            </p>
          </div>
        )}
        
        {/* OpenAI Status Banner */}
        {dataSource === 'live' && (
          <div className="mb-4 bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
            <p className="text-green-200 text-sm">
              ✓ Live Mode: Connected to Solana mainnet | OpenAI: {openaiConfigured ? '✓ Configured' : '✗ Not configured (using rule-based AI)'}
            </p>
          </div>
        )}
        
        {!openaiConfigured && dataSource === 'mock' && (
          <div className="mb-4 bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
            <p className="text-blue-200 text-sm">
              💡 Demo Mode: Mock data + Rule-based AI (fully functional for demonstration)
            </p>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Shield className="w-10 h-10 text-purple-400" />
                Validator Pulse AI Agent
              </h1>
              <p className="text-purple-300 text-lg">
                Autonomous validator monitoring and decentralization optimization for Solana
              </p>
            </div>
            <div className="flex items-center gap-3">
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !transition-colors" />
              <button
                onClick={loadValidators}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="text-purple-300 text-sm mb-1">Total Validators</div>
              <div className="text-3xl font-bold text-white">{validators.length}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="text-purple-300 text-sm mb-1">Nakamoto Coefficient</div>
              <div className="text-3xl font-bold text-white">{metrics.nakamotoCoefficient}</div>
              <div className="text-xs text-purple-400 mt-1">Min validators for 33% stake</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="text-purple-300 text-sm mb-1">Top 10 Control</div>
              <div className="text-3xl font-bold text-white">
                {metrics.topValidatorConcentration.top10Percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-400 mt-1">Stake concentration</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="text-purple-300 text-sm mb-1">Active Now</div>
              <div className="text-3xl font-bold text-white">
                {validators.filter(v => !v.delinquent).length}
              </div>
              <div className="text-xs text-purple-400 mt-1">Non-delinquent</div>
            </div>
          </div>
        )}

        {/* Visualization Charts */}
        {metrics && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-purple-400" />
              Network Health Metrics
            </h2>
            <MetricsCharts metrics={metrics} />
          </div>
        )}

        {/* AI Recommendation Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              AI Recommendation Engine
            </h2>
            <button
              onClick={generateAIRecommendation}
              disabled={analyzing}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
            >
              {analyzing ? 'Analyzing...' : 'Generate Recommendation'}
            </button>
          </div>

          {recommendation ? (
            <div className="space-y-4">
              <div className="bg-black/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">AI Reasoning:</h3>
                <p className="text-purple-200">{recommendation.reasoning}</p>
                <div className="mt-4 flex gap-4 text-sm">
                  <div>
                    <span className="text-purple-300">Confidence: </span>
                    <span className="text-white font-semibold">
                      {(recommendation.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-300">Expected Nakamoto: </span>
                    <span className="text-white font-semibold">
                      {metrics?.nakamotoCoefficient} → {recommendation.expectedImpact.nakamotoCoefficient.projected}
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg">Recommended Validators:</h3>
              <div className="grid gap-3">
                {recommendation.validators.slice(0, 5).map((v, i) => (
                  <div key={i} className="bg-black/30 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-mono text-sm">
                          {v.pubkey.slice(0, 8)}...{v.pubkey.slice(-8)}
                        </div>
                        <div className="text-purple-300 text-sm">{v.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {(v.recommendedStake / 1e9).toFixed(2)} SOL
                        </div>
                        <div className={`text-xs ${
                          v.riskLevel === 'low' ? 'text-green-400' :
                          v.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {v.riskLevel} risk
                        </div>
                      </div>
                    </div>
                    <p className="text-purple-200 text-sm">{v.reason}</p>
                  </div>
                ))}
              </div>

              {/* Voting Interface */}
              <div className="bg-black/30 rounded-lg p-6 mt-6">
                <h3 className="text-white font-semibold mb-4">Protocol Voting</h3>
                <p className="text-purple-200 text-sm mb-4">
                  {connected 
                    ? `Connected as ${publicKey?.toBase58().slice(0, 8)}...${publicKey?.toBase58().slice(-8)}` 
                    : 'Connect your wallet to vote on this AI recommendation'}
                </p>
                {!connected && (
                  <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                    <p className="text-yellow-200 text-sm flex items-center justify-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Please connect your wallet to participate in voting
                    </p>
                  </div>
                )}
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleVote('approve')}
                    disabled={!connected || userVote !== null || votingInProgress}
                    className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold ${
                      userVote === 'approve' 
                        ? 'bg-green-700 text-white' 
                        : !connected || userVote !== null || votingInProgress
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    ✓ Approve {userVote === 'approve' && '(Voted)'} {votingInProgress && userVote === null && '...'}
                  </button>
                  <button 
                    onClick={() => handleVote('reject')}
                    disabled={!connected || userVote !== null || votingInProgress}
                    className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold ${
                      userVote === 'reject' 
                        ? 'bg-red-700 text-white' 
                        : !connected || userVote !== null || votingInProgress
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    ✗ Reject {userVote === 'reject' && '(Voted)'} {votingInProgress && userVote === null && '...'}
                  </button>
                </div>
                <div className="mt-4 text-center text-purple-300 text-sm">
                  Current Votes: <span className="text-green-400 font-semibold">{recommendation.votes.approve} approve</span>, <span className="text-red-400 font-semibold">{recommendation.votes.reject} reject</span> ({recommendation.votes.total} total)
                </div>
                {userVote && (
                  <div className="mt-3 text-center">
                    <p className="text-green-400 text-sm">✓ Your vote has been recorded in the database</p>
                  </div>
                )}
              </div>

              {/* Live Vote Feed */}
              <div className="bg-black/30 rounded-lg p-6 mt-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                  Live Vote Stream
                  <span className="ml-auto text-xs text-purple-300 font-normal">Updates every 3s</span>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentVotes.length === 0 ? (
                    <p className="text-purple-300 text-sm text-center py-4">No votes yet. Be the first to vote!</p>
                  ) : (
                    recentVotes.map((vote) => (
                      <div 
                        key={vote.id} 
                        className="bg-white/5 rounded-lg p-3 flex items-center justify-between hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            vote.voteType === 'approve' ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                          <div>
                            <div className="text-white text-sm font-mono">
                              {vote.wallet.slice(0, 4)}...{vote.wallet.slice(-4)}
                            </div>
                            <div className="text-purple-300 text-xs">
                              {new Date(vote.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          vote.voteType === 'approve' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {vote.voteType === 'approve' ? '✓ Approved' : '✗ Rejected'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-purple-300 mb-4">
                Click the button above to generate AI-powered stake delegation recommendations
              </p>
              <p className="text-purple-400 text-sm">
                AI will analyze {validators.length} validators and optimize for maximum decentralization
              </p>
            </div>
          )}
        </div>

        {/* Top Validators List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Top Validators by Stake</h2>
          <div className="space-y-2">
            {validators.slice(0, 10).map((validator, index) => (
              <div key={validator.pubkey} className="bg-black/30 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-purple-400">#{index + 1}</div>
                  <div>
                    <div className="text-white font-mono text-sm">
                      {validator.pubkey.slice(0, 8)}...{validator.pubkey.slice(-8)}
                    </div>
                    <div className="text-purple-300 text-xs">{validator.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    {(validator.activatedStake / 1e9).toFixed(0).toLocaleString()} SOL
                  </div>
                  <div className="text-purple-300 text-sm">
                    {validator.stakePercentage.toFixed(2)}% of network
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
