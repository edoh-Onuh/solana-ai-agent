import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a dummy client if env vars are missing (for deployments without Supabase)
let supabase: ReturnType<typeof createClient>;
let supabaseEnabled = false;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabaseEnabled = true;
  console.log('Supabase client initialized successfully');
} else {
  console.warn('Supabase environment variables not found. Voting features will be disabled.');
  // Create a mock client that won't be used
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase, supabaseEnabled };

export interface Vote {
  id: string;
  recommendation_id: string;
  wallet_address: string;
  vote_type: 'approve' | 'reject';
  created_at: string;
}

export async function recordVote(
  recommendationId: string,
  walletAddress: string,
  voteType: 'approve' | 'reject'
): Promise<Vote | null> {
  if (!supabaseEnabled) {
    console.error('Voting disabled: Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        {
          recommendation_id: recommendationId,
          wallet_address: walletAddress,
          vote_type: voteType,
        },
        {
          onConflict: 'recommendation_id,wallet_address',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error recording vote:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception recording vote:', error);
    return null;
  }
}

export async function getVotesByRecommendation(
  recommendationId: string
): Promise<{ approves: number; rejects: number }> {
  if (!supabaseEnabled) {
    return { approves: 0, rejects: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('recommendation_id', recommendationId);

    if (error) {
      console.error('Error fetching votes:', error);
      return { approves: 0, rejects: 0 };
    }

    const approves = data.filter((v) => v.vote_type === 'approve').length;
    const rejects = data.filter((v) => v.vote_type === 'reject').length;

    return { approves, rejects };
  } catch (error) {
    console.error('Exception fetching votes:', error);
    return { approves: 0, rejects: 0 };
  }
}

export async function getUserVote(
  recommendationId: string,
  walletAddress: string
): Promise<'approve' | 'reject' | null> {
  if (!supabaseEnabled) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('recommendation_id', recommendationId)
      .eq('wallet_address', walletAddress)
      .single();

    if (error || !data) {
      return null;
    }

    return data.vote_type as 'approve' | 'reject';
  } catch (error) {
    console.error('Exception fetching user vote:', error);
    return null;
  }
}

export async function getRecentVotes(
  recommendationId: string,
  limit: number = 10
): Promise<Vote[]> {
  if (!supabaseEnabled) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent votes:', error);
      return [];
    }

    console.log(`getRecentVotes: Found ${data?.length || 0} votes for recommendation ${recommendationId}`);
    return data || [];
  } catch (error) {
    console.error('Exception fetching recent votes:', error);
    return [];
  }
}
