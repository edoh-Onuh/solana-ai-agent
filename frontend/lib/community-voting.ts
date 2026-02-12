/**
 * Community Voting System for Superteam Validators
 * 
 * Allows community members to propose and vote on adding/removing
 * validators from the Superteam community list
 */

export interface ValidatorProposal {
  id: string;
  pubkey: string;
  name: string;
  proposalType: 'add' | 'remove';
  proposedBy: string;
  proposedAt: number;
  reason: string;
  votesFor: number;
  votesAgainst: number;
  voters: Set<string>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt: number;
}

export interface CommunityVote {
  proposalId: string;
  voter: string;
  voteType: 'for' | 'against';
  timestamp: number;
}

const REQUIRED_VOTES = 100;
const PROPOSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Create a new proposal to add/remove a Superteam validator
 */
export function createProposal(
  pubkey: string,
  name: string,
  type: 'add' | 'remove',
  proposerWallet: string,
  reason: string
): ValidatorProposal {
  const now = Date.now();
  return {
    id: `proposal_${now}_${pubkey.slice(0, 8)}`,
    pubkey,
    name,
    proposalType: type,
    proposedBy: proposerWallet,
    proposedAt: now,
    reason,
    votesFor: 0,
    votesAgainst: 0,
    voters: new Set(),
    status: 'pending',
    expiresAt: now + PROPOSAL_DURATION,
  };
}

/**
 * Submit a vote on a proposal
 */
export function submitVote(
  proposal: ValidatorProposal,
  voterWallet: string,
  voteType: 'for' | 'against'
): { success: boolean; message: string; proposal: ValidatorProposal } {
  // Check if voter has already voted
  if (proposal.voters.has(voterWallet)) {
    return {
      success: false,
      message: 'You have already voted on this proposal',
      proposal,
    };
  }

  // Check if proposal is still active
  if (Date.now() > proposal.expiresAt) {
    proposal.status = 'expired';
    return {
      success: false,
      message: 'This proposal has expired',
      proposal,
    };
  }

  // Add vote
  if (voteType === 'for') {
    proposal.votesFor++;
  } else {
    proposal.votesAgainst++;
  }
  proposal.voters.add(voterWallet);

  // Check if threshold reached
  if (proposal.votesFor >= REQUIRED_VOTES) {
    proposal.status = 'approved';
  } else if (proposal.votesAgainst >= REQUIRED_VOTES) {
    proposal.status = 'rejected';
  }

  return {
    success: true,
    message: `Vote recorded successfully. ${proposal.votesFor}/${REQUIRED_VOTES} votes needed for approval`,
    proposal,
  };
}

/**
 * Get voting progress
 */
export function getVotingProgress(proposal: ValidatorProposal) {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const approvalPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const progressToThreshold = (proposal.votesFor / REQUIRED_VOTES) * 100;
  const timeRemaining = Math.max(0, proposal.expiresAt - Date.now());
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  return {
    votesFor: proposal.votesFor,
    votesAgainst: proposal.votesAgainst,
    totalVotes,
    approvalPercentage: Math.round(approvalPercentage),
    progressToThreshold: Math.round(progressToThreshold),
    votesNeeded: Math.max(0, REQUIRED_VOTES - proposal.votesFor),
    timeRemaining: `${daysRemaining}d ${hoursRemaining}h`,
    status: proposal.status,
  };
}

/**
 * Check if a proposal should be expired
 */
export function checkProposalExpiry(proposal: ValidatorProposal): ValidatorProposal {
  if (proposal.status === 'pending' && Date.now() > proposal.expiresAt) {
    proposal.status = 'expired';
  }
  return proposal;
}

/**
 * Get required votes for approval
 */
export function getRequiredVotes(): number {
  return REQUIRED_VOTES;
}

/**
 * Get proposal duration in days
 */
export function getProposalDurationDays(): number {
  return 7;
}
