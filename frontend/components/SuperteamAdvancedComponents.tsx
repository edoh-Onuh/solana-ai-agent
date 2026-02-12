/**
 * Superteam Scoring and Community Voting Components
 */

import { Trophy, TrendingUp, Award, Shield, Users, ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { SuperteamScore } from '@/lib/superteam-scoring';
import { ValidatorProposal, getVotingProgress } from '@/lib/community-voting';

interface SuperteamLeaderboardProps {
  scores: SuperteamScore[];
}

export function SuperteamLeaderboard({ scores }: SuperteamLeaderboardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-400" />
        Superteam Validator Leaderboard
      </h3>
      
      <div className="space-y-3">
        {scores.map((score) => (
          <div key={score.pubkey} className="bg-black/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  score.rank === 1 ? 'text-yellow-400' :
                  score.rank === 2 ? 'text-gray-300' :
                  score.rank === 3 ? 'text-orange-400' :
                  'text-purple-400'
                }`}>
                  #{score.rank}
                </div>
                <div>
                  <div className="text-white font-mono text-sm">
                    {score.pubkey.slice(0, 8)}...{score.pubkey.slice(-8)}
                  </div>
                  <div className="text-purple-300 text-xs">{score.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-xl">{score.totalScore}</div>
                <div className="text-purple-300 text-xs">Total Score</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="bg-white/5 rounded p-2">
                <div className="text-xs text-purple-300">Performance</div>
                <div className="text-white font-semibold">{score.performanceScore}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-xs text-purple-300">Staking</div>
                <div className="text-white font-semibold">{score.stakingScore}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-xs text-purple-300">Reliability</div>
                <div className="text-white font-semibold">{score.reliabilityScore}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-xs text-purple-300">Decentralization</div>
                <div className="text-white font-semibold">{score.decentralizationScore}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
        <div className="text-xs text-purple-200">
          <div className="font-semibold mb-1">Scoring Breakdown:</div>
          <div>• Performance: Commission rate (lower = better)</div>
          <div>• Staking: Total stake amount</div>
          <div>• Reliability: Uptime and delinquency status</div>
          <div>• Decentralization: Network stake percentage (lower = better)</div>
        </div>
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: ValidatorProposal;
  onVote: (proposalId: string, voteType: 'for' | 'against') => void;
  userWallet: string | null;
  hasVoted: boolean;
}

export function ProposalCard({ proposal, onVote, userWallet, hasVoted }: ProposalCardProps) {
  const progress = getVotingProgress(proposal);
  
  const getStatusColor = () => {
    switch (proposal.status) {
      case 'approved': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'expired': return 'text-gray-400';
      default: return 'text-yellow-400';
    }
  };
  
  const getStatusIcon = () => {
    switch (proposal.status) {
      case 'approved': return <CheckCircle className="w-5 h-5" />;
      case 'rejected': return <XCircle className="w-5 h-5" />;
      case 'expired': return <Clock className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              proposal.proposalType === 'add' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {proposal.proposalType === 'add' ? '+ Add Validator' : '- Remove Validator'}
            </span>
          </div>
          <div className="text-white font-mono text-sm">
            {proposal.pubkey.slice(0, 8)}...{proposal.pubkey.slice(-8)}
          </div>
          <div className="text-purple-300 text-xs">{proposal.name}</div>
        </div>
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-semibold capitalize">{proposal.status}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-purple-300 text-sm mb-1">Reason:</div>
        <div className="text-white text-sm">{proposal.reason}</div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-purple-300">Progress to Approval</span>
          <span className="text-white font-semibold">{progress.votesFor}/100 votes</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
            style={{ width: `${progress.progressToThreshold}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-black/30 rounded p-3">
          <div className="text-green-400 text-xl font-bold">{progress.votesFor}</div>
          <div className="text-purple-300 text-xs">For</div>
        </div>
        <div className="bg-black/30 rounded p-3">
          <div className="text-red-400 text-xl font-bold">{progress.votesAgainst}</div>
          <div className="text-purple-300 text-xs">Against</div>
        </div>
        <div className="bg-black/30 rounded p-3">
          <div className="text-yellow-400 text-xl font-bold">{progress.timeRemaining}</div>
          <div className="text-purple-300 text-xs">Remaining</div>
        </div>
      </div>
      
      {proposal.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={() => onVote(proposal.id, 'for')}
            disabled={!userWallet || hasVoted}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 ${
              hasVoted || !userWallet
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            Vote For {hasVoted && '(Voted)'}
          </button>
          <button
            onClick={() => onVote(proposal.id, 'against')}
            disabled={!userWallet || hasVoted}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 ${
              hasVoted || !userWallet
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            Vote Against {hasVoted && '(Voted)'}
          </button>
        </div>
      )}
      
      {!userWallet && proposal.status === 'pending' && (
        <div className="mt-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
          <p className="text-yellow-200 text-sm">Connect your wallet to vote</p>
        </div>
      )}
      
      <div className="mt-3 text-xs text-purple-300">
        Proposed by: {proposal.proposedBy.slice(0, 8)}...{proposal.proposedBy.slice(-8)}
      </div>
    </div>
  );
}

interface CreateProposalFormProps {
  onSubmit: (pubkey: string, name: string, type: 'add' | 'remove', reason: string) => void;
  connected: boolean;
}

export function CreateProposalForm({ onSubmit, connected }: CreateProposalFormProps) {
  const [pubkey, setPubkey] = React.useState('');
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<'add' | 'remove'>('add');
  const [reason, setReason] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !pubkey || !reason) return;
    onSubmit(pubkey, name, type, reason);
    setPubkey('');
    setName('');
    setReason('');
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-purple-400" />
        Create Validator Proposal
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-purple-300 text-sm mb-2">Proposal Type</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('add')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                type === 'add'
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-purple-300 hover:bg-white/10'
              }`}
            >
              Add Validator
            </button>
            <button
              type="button"
              onClick={() => setType('remove')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                type === 'remove'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-purple-300 hover:bg-white/10'
              }`}
            >
              Remove Validator
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-purple-300 text-sm mb-2">Validator Public Key</label>
          <input
            type="text"
            value={pubkey}
            onChange={(e) => setPubkey(e.target.value)}
            placeholder="Enter validator public key..."
            className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
            required
          />
        </div>
        
        <div>
          <label className="block text-purple-300 text-sm mb-2">Validator Name (Optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter validator name..."
            className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
          />
        </div>
        
        <div>
          <label className="block text-purple-300 text-sm mb-2">Reason for Proposal</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this validator should be added/removed from Superteam..."
            className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 h-24 resize-none"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={!connected || !pubkey || !reason}
          className={`w-full px-6 py-3 rounded-lg transition-colors font-semibold ${
            connected && pubkey && reason
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {connected ? 'Submit Proposal' : 'Connect Wallet to Propose'}
        </button>
        
        <div className="text-xs text-purple-300 text-center">
          Proposals require 100 community votes for approval and last 7 days
        </div>
      </form>
    </div>
  );
}

// Add React import at the top
import React from 'react';
