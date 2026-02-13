'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity, TrendingUp, Shield, AlertCircle, RefreshCw, Wallet, Users } from 'lucide-react';
import { ValidatorMetrics, DecentralizationMetrics, AIRecommendation } from '@/lib/types';
import { MetricsCharts } from '@/components/MetricsCharts';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SuperteamBadge, SuperteamStats, SuperteamFilter } from '@/components/SuperteamComponents';
import { isSuperteamValidator, getSuperteamValidatorInfo } from '@/lib/superteam-validators';

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
  const [showSuperteamOnly, setShowSuperteamOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cache validators data to reduce API calls
  const validatorsCache = useMemo(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('validators-cache');
      const timestamp = sessionStorage.getItem('validators-cache-time');
      if (cached && timestamp && Date.now() - parseInt(timestamp) < 60000) { // 1 minute cache
        return JSON.parse(cached);
      }
    }
    return null;
  }, []);

  // Calculate Superteam stats
  const superteamStats = useMemo(() => {
    const superteamValidators = validators.filter(v => isSuperteamValidator(v.votePubkey));
    console.log('=== SUPERTEAM VALIDATOR DETECTION ===');
    console.log('Superteam validators found:', superteamValidators.length);
    console.log('Expected: 6 validators');
    console.log('Found validators:', superteamValidators.map(v => ({
      votePubkey: v.votePubkey,
      name: getSuperteamValidatorInfo(v.votePubkey)?.name || 'Unknown',
      stake: Math.floor(v.activatedStake / 1e9).toLocaleString() + ' SOL'
    })));
    console.log('Missing validators:', [
      'ABREUtpzkkMiPHrBebpsYDU3mubtSohjDKZbyRoTJLae',
      'unRgBLTLNXdBmenHXNPAg3AMn3KWcV3Mk4eoZBmTrdk',
      'FACqsS19VScz8oo2YhdMg35EsAy6xsCZ9Y58eJXGv8QJ',
      'EGUg4nrfkXmqb14jdpdczHDe3SgDNYJmxSmvr5CP7k8R',
      'BULKEEKf9Hjy4nwCthjzheEk4joH23LLXttAHjqEZmB2',
      'EARNynHRWg6GfyJCmrrizcZxARB3HVzcaasvNa8kBS72'
    ].filter(pubkey => !validators.some(v => v.votePubkey === pubkey)));
    console.log('Total validators in API:', validators.length);
    
    const totalStake = superteamValidators.reduce((sum, v) => sum + v.activatedStake, 0);
    const avgCommission = superteamValidators.length > 0
      ? superteamValidators.reduce((sum, v) => sum + v.commission, 0) / superteamValidators.length
      : 0;
    const countries = new Set(superteamValidators.map(v => v.country).filter(Boolean)).size;

    return {
      totalValidators: superteamValidators.length,
      totalStake,
      averageCommission: avgCommission,
      countries,
    };
  }, [validators]);

  // Filter validators based on Superteam toggle
  const displayedValidators = useMemo(() => {
    if (showSuperteamOnly) {
      return validators.filter(v => isSuperteamValidator(v.votePubkey));
    }
    return validators;
  }, [validators, showSuperteamOnly]);

  useEffect(() => {
    // Load from cache first for instant display
    if (validatorsCache) {
      setValidators(validatorsCache.validators);
      setMetrics(validatorsCache.metrics);
      setDataSource(validatorsCache.dataSource);
      setLoading(false);
    }
    
    // Then load fresh data in background
    loadValidators();
    checkStatus();
  }, [validatorsCache]);

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
      const response = await fetch(`/api/recent-votes?recommendationId=${recommendationId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[${new Date().toLocaleTimeString()}] Loaded ${data.votes?.length || 0} votes`);
        setRecentVotes(data.votes?.map((v: any) => ({
          id: v.id,
          wallet: v.wallet_address,
          voteType: v.vote_type,
          timestamp: v.created_at,
        })) || []);
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
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);
      
      console.log('Fetching validators from API...');
      const response = await fetch('/api/validators', {
        next: { revalidate: 60 }, // Cache for 60 seconds
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch validators');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      // Mark Superteam validators
      const validatorsWithSuperteam = data.validators.map((v: ValidatorMetrics) => ({
        ...v,
        isSuperteamValidator: isSuperteamValidator(v.votePubkey),
      }));
      
      // Log first 10 validator pubkeys to help identify which ones to add to Superteam list
      console.log('=== TOP 10 VALIDATORS BY STAKE ===');
      data.validators.slice(0, 10).forEach((v: any, i: number) => {
        console.log(`${i + 1}. ${v.pubkey} - ${v.name} - ${(v.activatedStake / 1e9).toFixed(0)} SOL`);
      });
      console.log('===================================');
      
      setValidators(validatorsWithSuperteam);
      setMetrics(data.metrics);
      setDataSource(data.dataSource || 'live');
      
      // Cache the data
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('validators-cache', JSON.stringify({
          validators: validatorsWithSuperteam,
          metrics: data.metrics,
          dataSource: data.dataSource || 'live',
        }));
        sessionStorage.setItem('validators-cache-time', Date.now().toString());
      }
      
      console.log(`Loaded ${data.validators.length} validators`);
      console.log('Nakamoto Coefficient:', data.metrics.nakamotoCoefficient);
      console.log('Data source:', data.dataSource);
    } catch (err) {
      console.error('Error loading validators:', err);
      setError('Failed to load validators. Check console for details.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-3 sm:p-6">
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
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                Validator Pulse AI Agent
              </h1>
              <p className="text-purple-300 text-sm sm:text-base md:text-lg">
                Autonomous validator monitoring and decentralization optimization for Solana
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !transition-colors !text-sm sm:!text-base" />
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  loadValidators();
                }}
                disabled={loading || isRefreshing}
                className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <SuperteamFilter 
                enabled={showSuperteamOnly}
                onToggle={() => setShowSuperteamOnly(!showSuperteamOnly)}
                count={superteamStats.totalValidators}
              />
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-xs sm:text-sm mb-1">Total Validators</div>
              <div className="text-2xl sm:text-3xl font-bold text-white">{validators.length}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-xs sm:text-sm mb-1">Nakamoto Coefficient</div>
              <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.nakamotoCoefficient}</div>
              <div className="text-xs text-purple-400 mt-1">Min validators for 33% stake</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-xs sm:text-sm mb-1">Top 10 Control</div>
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {metrics.topValidatorConcentration.top10Percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-400 mt-1\">Stake concentration</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-xs sm:text-sm mb-1">Active Now</div>
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {validators.filter(v => !v.delinquent).length}
              </div>
              <div className="text-xs text-purple-400 mt-1">Non-delinquent</div>
            </div>
          </div>
        )}

        {/* Visualization Charts */}
        {metrics && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              Network Health Metrics
            </h2>
            <MetricsCharts metrics={metrics} />
          </div>
        )}

        {/* Superteam Community Validators Section */}
        <div className="mb-6 sm:mb-8">
          <SuperteamStats {...superteamStats} />
        </div>

        {/* AI Recommendation Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              AI Recommendation Engine
            </h2>
            <button
              onClick={generateAIRecommendation}
              disabled={analyzing}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-semibold text-sm sm:text-base"
            >
              {analyzing ? 'Analyzing...' : 'Generate Recommendation'}
            </button>
          </div>

          {recommendation ? (
            <div className="space-y-4">
              <div className="bg-black/30 rounded-lg p-3 sm:p-4">
                <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">AI Reasoning:</h3>
                <p className="text-purple-200 text-sm sm:text-base whitespace-pre-line">{recommendation.reasoning}</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
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

              <h3 className="text-white font-semibold text-base sm:text-lg">Recommended Validators:</h3>
              <div className="grid gap-2 sm:gap-3">
                {recommendation.validators.slice(0, 5).map((v, i) => {
                  const superteamInfo = getSuperteamValidatorInfo(v.votePubkey);
                  return (
                    <div key={i} className="bg-black/30 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-mono text-xs sm:text-sm break-all flex items-center gap-2 flex-wrap">
                            {superteamInfo?.logo && <span className="text-xl">{superteamInfo.logo}</span>}
                            {v.pubkey.slice(0, 8)}...{v.pubkey.slice(-8)}
                            {isSuperteamValidator(v.votePubkey) && (
                              <SuperteamBadge size="sm" />
                            )}
                          </div>
                          <div className="text-purple-300 text-xs sm:text-sm">
                            {superteamInfo ? superteamInfo.name : v.name}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-white font-semibold text-sm sm:text-base">
                            {Math.floor((v.currentStake || 0) / 1e9).toLocaleString()} SOL
                          </div>
                          <div className="text-purple-300 text-xs">
                            Current stake
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
                  );
                })}
              </div>

              {/* Voting Interface */}
              <div className="bg-black/30 rounded-lg p-4 sm:p-6 mt-4 sm:mt-6">
                <h3 className="text-white font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Protocol Voting</h3>
                <p className="text-purple-200 text-xs sm:text-sm mb-3 sm:mb-4 break-all">
                  {connected 
                    ? `Connected as ${publicKey?.toBase58().slice(0, 8)}...${publicKey?.toBase58().slice(-8)}` 
                    : 'Connect your wallet to vote on this AI recommendation'}
                </p>
                {!connected && (
                  <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                    <p className="text-yellow-200 text-xs sm:text-sm flex items-center justify-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Please connect your wallet to participate in voting
                    </p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button 
                    onClick={() => handleVote('approve')}
                    disabled={!connected || userVote !== null || votingInProgress}
                    className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-semibold text-sm sm:text-base ${
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
                    className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-semibold text-sm sm:text-base ${
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
                <div className="mt-3 sm:mt-4 text-center text-purple-300 text-xs sm:text-sm">
                  Current Votes: <span className="text-green-400 font-semibold">{recommendation.votes.approve} approve</span>, <span className="text-red-400 font-semibold">{recommendation.votes.reject} reject</span> ({recommendation.votes.total} total)
                </div>
                {userVote && (
                  <div className="mt-3 text-center">
                    <p className="text-green-400 text-xs sm:text-sm">✓ Your vote has been recorded in the database</p>
                  </div>
                )}
              </div>

              {/* Live Vote Feed */}
              <div className="bg-black/30 rounded-lg p-4 sm:p-6 mt-4 sm:mt-6">
                <h3 className="text-white font-semibold mb-3 sm:mb-4 flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 animate-pulse" />
                  Live Vote Stream
                  <span className="ml-auto text-xs text-purple-300 font-normal">Updates every 3s</span>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentVotes.length === 0 ? (
                    <p className="text-purple-300 text-xs sm:text-sm text-center py-4">No votes yet. Be the first to vote!</p>
                  ) : (
                    recentVotes.map((vote) => (
                      <div 
                        key={vote.id} 
                        className="bg-white/5 rounded-lg p-2 sm:p-3 flex items-center justify-between hover:bg-white/10 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            vote.voteType === 'approve' ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-white text-xs sm:text-sm font-mono truncate">
                              {vote.wallet.slice(0, 4)}...{vote.wallet.slice(-4)}
                            </div>
                            <div className="text-purple-300 text-xs">
                              {new Date(vote.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
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
          <h2 className="text-2xl font-bold text-white mb-4">
            {showSuperteamOnly ? 'Superteam Community Validators' : 'Top Validators by Stake'}
          </h2>
          <div className="space-y-2">
            {displayedValidators.slice(0, 10).map((validator, index) => {
              const superteamInfo = getSuperteamValidatorInfo(validator.votePubkey);
              return (
                <div key={validator.pubkey} className="bg-black/30 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-purple-400">#{index + 1}</div>
                    <div>
                      <div className="text-white font-mono text-sm flex items-center gap-2">
                        {superteamInfo?.logo && <span className="text-2xl">{superteamInfo.logo}</span>}
                        {validator.pubkey.slice(0, 8)}...{validator.pubkey.slice(-8)}
                        {isSuperteamValidator(validator.votePubkey) && (
                          <SuperteamBadge size="sm" />
                        )}
                      </div>
                      <div className="text-purple-300 text-xs">
                        {superteamInfo ? superteamInfo.name : validator.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      {Math.floor(validator.activatedStake / 1e9).toLocaleString()} SOL
                    </div>
                    <div className="text-purple-300 text-sm">
                      {validator.stakePercentage.toFixed(3)}% of network
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
