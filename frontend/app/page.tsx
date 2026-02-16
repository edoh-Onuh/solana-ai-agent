'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity, TrendingUp, Shield, AlertCircle, RefreshCw, Wallet, Users } from 'lucide-react';
import { ValidatorMetrics, DecentralizationMetrics, AIRecommendation } from '@/lib/types';
import { MetricsCharts } from '@/components/MetricsCharts';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SuperteamBadge, SuperteamStats } from '@/components/SuperteamComponents';
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
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);

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

  // Separate Superteam and other validators, sorted by stake descending (largest to smallest)
  const superteamValidators = useMemo(() => {
    return validators
      .filter(v => isSuperteamValidator(v.votePubkey))
      .sort((a, b) => b.activatedStake - a.activatedStake);
  }, [validators]);

  const otherValidators = useMemo(() => {
    return validators
      .filter(v => !isSuperteamValidator(v.votePubkey))
      .sort((a, b) => b.activatedStake - a.activatedStake);
  }, [validators]);

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`/api/recent-votes?recommendationId=${recommendationId}&limit=10`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setRecentVotes(data.votes?.map((v: any) => ({
          id: v.id,
          wallet: v.wallet_address,
          voteType: v.vote_type,
          timestamp: v.created_at,
        })) || []);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error loading recent votes:', err);
      }
    }
  }

  async function updateVoteCounts(recommendationId: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      
      const response = await fetch(`/api/votes?recommendationId=${recommendationId}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && recommendation) {
          setRecommendation(prev => prev ? {
            ...prev,
            votes: {
              approve: data.voteCounts.approves,
              reject: data.voteCounts.rejects,
              total: data.voteCounts.approves + data.voteCounts.rejects
            }
          } : prev);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error updating vote counts:', err);
      }
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

  async function handleVote(vote: 'approve' | 'reject', retryCount = 0) {
    if (!recommendation || !connected || !publicKey) {
      setVoteError('Please connect your wallet to vote');
      setTimeout(() => setVoteError(null), 3000);
      return;
    }
    
    if (votingInProgress) return;
    
    // Clear previous messages
    setVoteError(null);
    setVoteSuccess(null);
    
    // Optimistic update - update UI immediately
    const previousVote = userVote;
    const previousRecommendation = { ...recommendation };
    
    setUserVote(vote);
    setVotingInProgress(true);
    
    // Optimistically update vote counts
    const optimisticRec = { ...recommendation };
    if (vote === 'approve') {
      optimisticRec.votes.approve += 1;
    } else {
      optimisticRec.votes.reject += 1;
    }
    optimisticRec.votes.total += 1;
    setRecommendation(optimisticRec);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: recommendation.id,
          walletAddress: publicKey.toBase58(),
          voteType: vote,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (!response.ok) {
        // Retry logic for network errors
        if (retryCount < 2 && (response.status >= 500 || response.status === 408)) {
          console.log(`Retrying vote... Attempt ${retryCount + 1}`);
          // Restore previous state before retry
          setUserVote(previousVote);
          setRecommendation(previousRecommendation);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          return handleVote(vote, retryCount + 1);
        }
        
        // Handle specific error messages
        if (response.status === 503) {
          throw new Error(data.error || 'Voting is currently disabled');
        }
        throw new Error(data.error || 'Failed to record vote');
      }
      
      if (data.success) {
        // Update with actual server data
        setRecommendation(prev => prev ? {
          ...prev,
          votes: {
            approve: data.voteCounts.approves,
            reject: data.voteCounts.rejects,
            total: data.voteCounts.approves + data.voteCounts.rejects
          }
        } : prev);
        
        setVoteSuccess(`Vote ${vote === 'approve' ? 'approved' : 'rejected'} successfully!`);
        setTimeout(() => setVoteSuccess(null), 3000);
        
        // Trigger immediate vote feed update
        loadRecentVotes(recommendation.id);
      }
    } catch (err) {
      // Rollback optimistic update on error
      setUserVote(previousVote);
      setRecommendation(previousRecommendation);
      
      console.error('Error voting:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to record vote. Please try again.';
      setVoteError(errorMessage);
      setTimeout(() => setVoteError(null), 5000);
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
          <div className="mb-3 sm:mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2.5 sm:p-3 text-center">
            <p className="text-yellow-200 text-xs sm:text-sm">
              ⚠️ Demo Mode: Using mock data (Solana RPC timeout or rate limited)
            </p>
          </div>
        )}
        
        {/* OpenAI Status Banner */}
        {dataSource === 'live' && (
          <div className="mb-3 sm:mb-4 bg-green-500/20 border border-green-500/50 rounded-lg p-2.5 sm:p-3 text-center">
            <p className="text-green-200 text-xs sm:text-sm">
              ✓ Live Mode: Connected to Solana mainnet | OpenAI: {openaiConfigured ? '✓ Configured' : '✗ Not configured (using rule-based AI)'}
            </p>
          </div>
        )}
        
        {!openaiConfigured && dataSource === 'mock' && (
          <div className="mb-3 sm:mb-4 bg-blue-500/20 border border-blue-500/50 rounded-lg p-2.5 sm:p-3 text-center">
            <p className="text-blue-200 text-xs sm:text-sm">
              💡 Demo Mode: Mock data + Rule-based AI (fully functional for demonstration)
            </p>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="w-full">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-400 flex-shrink-0" />
                <span className="break-words">Validator Pulse AI Agent</span>
              </h1>
              <p className="text-purple-300 text-xs sm:text-sm md:text-base lg:text-lg">
                Autonomous validator monitoring and decentralization optimization for Solana
              </p>
            </div>
            <div className="flex flex-row items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !transition-colors !text-xs sm:!text-sm md:!text-base !w-full !justify-center" />
              </div>
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  loadValidators();
                }}
                disabled={loading || isRefreshing}
                className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base disabled:opacity-50 min-w-[44px] flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-[10px] sm:text-xs md:text-sm mb-1">Total Validators</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{validators.length}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-[10px] sm:text-xs md:text-sm mb-1">Nakamoto Coeff.</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{metrics.nakamotoCoefficient}</div>
              <div className="text-[9px] sm:text-xs text-purple-400 mt-1">Min validators for 33% stake</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-[10px] sm:text-xs md:text-sm mb-1">Top 10 Control</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                {metrics.topValidatorConcentration.top10Percentage.toFixed(1)}%
              </div>
              <div className="text-[9px] sm:text-xs text-purple-400 mt-1">Stake concentration</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="text-purple-300 text-[10px] sm:text-xs md:text-sm mb-1">Active Now</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                {validators.filter(v => !v.delinquent).length}
              </div>
              <div className="text-[9px] sm:text-xs text-purple-400 mt-1">Non-delinquent</div>
            </div>
          </div>
        )}

        {/* Visualization Charts */}
        {metrics && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 flex-shrink-0" />
              <span>Network Health Metrics</span>
            </h2>
            <MetricsCharts metrics={metrics} />
          </div>
        )}

        {/* Superteam Community Validators Section */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <SuperteamStats {...superteamStats} />
        </div>

        {/* AI Recommendation Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20 mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col gap-3 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 flex-shrink-0" />
              <span>AI Recommendation Engine</span>
            </h2>
            <button
              onClick={generateAIRecommendation}
              disabled={analyzing}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-semibold text-sm sm:text-base touch-manipulation active:scale-95"
            >
              {analyzing ? 'Analyzing...' : 'Generate Recommendation'}
            </button>
          </div>

          {recommendation ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-black/30 rounded-lg p-3 sm:p-4">
                <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">AI Reasoning:</h3>
                <p className="text-purple-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">{recommendation.reasoning}</p>
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-white/5 rounded px-2 py-1.5">
                    <span className="text-purple-300">Confidence: </span>
                    <span className="text-white font-semibold">
                      {(recommendation.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/5 rounded px-2 py-1.5">
                    <span className="text-purple-300">Expected Nakamoto: </span>
                    <span className="text-white font-semibold">
                      {metrics?.nakamotoCoefficient} → {recommendation.expectedImpact.nakamotoCoefficient.projected}
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg mb-2 sm:mb-3">Recommended Validators:</h3>
              <div className="grid gap-2 sm:gap-3">
                {recommendation.validators.slice(0, 5).map((v, i) => {
                  const superteamInfo = getSuperteamValidatorInfo(v.votePubkey);
                  return (
                    <div key={i} className="bg-black/30 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-mono text-xs sm:text-sm break-all flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {superteamInfo?.logo && <span className="text-lg sm:text-xl flex-shrink-0">{superteamInfo.logo}</span>}
                            <span>{v.pubkey.slice(0, 6)}...{v.pubkey.slice(-6)}</span>
                            {isSuperteamValidator(v.votePubkey) && (
                              <SuperteamBadge size="sm" />
                            )}
                          </div>
                          <div className="text-purple-300 text-xs sm:text-sm mt-0.5">
                            {superteamInfo ? superteamInfo.name : v.name}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-white font-semibold text-sm sm:text-base">
                              {Math.floor((v.currentStake || 0) / 1e9).toLocaleString()} SOL
                            </div>
                            <div className="text-purple-300 text-xs">
                              Current stake
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            v.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                            v.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {v.riskLevel} risk
                          </div>
                        </div>
                      </div>
                      <p className="text-purple-200 text-xs sm:text-sm leading-relaxed">{v.reason}</p>
                    </div>
                  );
                })}
              </div>

              {/* Voting Interface */}
              <div className="bg-black/30 rounded-lg p-3 sm:p-4 md:p-6 mt-3 sm:mt-4 md:mt-6">
                <h3 className="text-white font-semibold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">Protocol Voting</h3>
                <p className="text-purple-200 text-xs sm:text-sm mb-3 break-all">
                  {connected 
                    ? `Connected as ${publicKey?.toBase58().slice(0, 6)}...${publicKey?.toBase58().slice(-6)}` 
                    : 'Connect your wallet to vote on this AI recommendation'}
                </p>
                {!connected && (
                  <div className="mb-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2.5 text-center">
                    <p className="text-yellow-200 text-xs flex items-center justify-center gap-2">
                      <Wallet className="w-4 h-4 flex-shrink-0" />
                      <span>Please connect your wallet to participate in voting</span>
                    </p>
                  </div>
                )}
                {voteError && (
                  <div className="mb-3 bg-red-500/20 border border-red-500/50 rounded-lg p-2.5 text-center animate-in fade-in duration-200">
                    <p className="text-red-200 text-xs">{voteError}</p>
                  </div>
                )}
                {voteSuccess && (
                  <div className="mb-3 bg-green-500/20 border border-green-500/50 rounded-lg p-2.5 text-center animate-in fade-in duration-200">
                    <p className="text-green-200 text-xs">{voteSuccess}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button 
                    onClick={() => handleVote('approve')}
                    disabled={!connected || userVote !== null || votingInProgress}
                    className={`flex-1 px-4 py-3 sm:py-3.5 rounded-lg transition-all font-semibold text-sm sm:text-base touch-manipulation active:scale-95 min-h-[44px] ${
                      userVote === 'approve' 
                        ? 'bg-green-700 text-white' 
                        : !connected || userVote !== null || votingInProgress
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                    }`}
                  >
                    ✓ Approve {userVote === 'approve' && '(Voted)'} {votingInProgress && userVote === null && '...'}
                  </button>
                  <button 
                    onClick={() => handleVote('reject')}
                    disabled={!connected || userVote !== null || votingInProgress}
                    className={`flex-1 px-4 py-3 sm:py-3.5 rounded-lg transition-all font-semibold text-sm sm:text-base touch-manipulation active:scale-95 min-h-[44px] ${
                      userVote === 'reject' 
                        ? 'bg-red-700 text-white' 
                        : !connected || userVote !== null || votingInProgress
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                    }`}
                  >
                    ✗ Reject {userVote === 'reject' && '(Voted)'} {votingInProgress && userVote === null && '...'}
                  </button>
                </div>
                <div className="mt-3 text-center text-purple-300 text-xs sm:text-sm">
                  Current Votes: <span className="text-green-400 font-semibold">{recommendation.votes.approve} approve</span>, <span className="text-red-400 font-semibold">{recommendation.votes.reject} reject</span> ({recommendation.votes.total} total)
                </div>
              </div>

              {/* Live Vote Feed */}
              <div className="bg-black/30 rounded-lg p-3 sm:p-4 md:p-6 mt-3 sm:mt-4 md:mt-6">
                <h3 className="text-white font-semibold mb-3 flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 animate-pulse flex-shrink-0" />
                  <span>Live Vote Stream</span>
                  <span className="ml-auto text-xs text-purple-300 font-normal">Updates every 3s</span>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentVotes.length === 0 ? (
                    <p className="text-purple-300 text-xs sm:text-sm text-center py-4">No votes yet. Be the first to vote!</p>
                  ) : (
                    recentVotes.map((vote) => (
                      <div 
                        key={vote.id} 
                        className="bg-white/5 rounded-lg p-2.5 sm:p-3 flex items-center justify-between hover:bg-white/10 transition-colors gap-2 touch-manipulation"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            vote.voteType === 'approve' ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-white text-xs font-mono truncate">
                              {vote.wallet.slice(0, 4)}...{vote.wallet.slice(-4)}
                            </div>
                            <div className="text-purple-300 text-[10px] sm:text-xs">
                              {new Date(vote.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold flex-shrink-0 ${
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

        {/* Superteam Community Validators */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              Superteam Community Validators
            </h2>
            <SuperteamBadge size="md" />
          </div>
          <div className="space-y-2">
            {superteamValidators.map((validator, index) => {
              const superteamInfo = getSuperteamValidatorInfo(validator.votePubkey);
              return (
                <div key={validator.pubkey} className="bg-black/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400 flex-shrink-0">#{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-mono text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {superteamInfo?.logo && <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0">{superteamInfo.logo}</span>}
                        <span className="break-all">{validator.pubkey.slice(0, 6)}...{validator.pubkey.slice(-6)}</span>
                        <SuperteamBadge size="sm" />
                      </div>
                      <div className="text-purple-300 text-xs sm:text-sm mt-0.5">
                        {superteamInfo ? superteamInfo.name : validator.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-white font-semibold text-sm sm:text-base">
                      {Math.floor(validator.activatedStake / 1e9).toLocaleString()} SOL
                    </div>
                    <div className="text-purple-300 text-xs sm:text-sm">
                      {validator.stakePercentage.toFixed(3)}% of network
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Other Solana Validators */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/20">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4">
            Solana Validators by Stake
          </h2>
          <div className="space-y-2">
            {otherValidators.slice(0, 10).map((validator, index) => {
              return (
                <div key={validator.pubkey} className="bg-black/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400 flex-shrink-0">#{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-mono text-xs sm:text-sm flex items-center gap-2">
                        <span className="break-all">{validator.pubkey.slice(0, 6)}...{validator.pubkey.slice(-6)}</span>
                      </div>
                      <div className="text-purple-300 text-xs sm:text-sm mt-0.5">
                        {validator.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-white font-semibold text-sm sm:text-base">
                      {Math.floor(validator.activatedStake / 1e9).toLocaleString()} SOL
                    </div>
                    <div className="text-purple-300 text-xs sm:text-sm">
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
