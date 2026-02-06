import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
}

export async function getVotesByRecommendation(
  recommendationId: string
): Promise<{ approves: number; rejects: number }> {
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
}

export async function getUserVote(
  recommendationId: string,
  walletAddress: string
): Promise<'approve' | 'reject' | null> {
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
}
