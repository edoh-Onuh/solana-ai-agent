import { NextRequest, NextResponse } from 'next/server';
import { recordVote, getVotesByRecommendation, supabaseEnabled } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseEnabled) {
      return NextResponse.json(
        { 
          error: 'Voting is currently disabled. Supabase database not configured.',
          details: 'Please contact the administrator to enable voting features.'
        },
        { status: 503 } // Service Unavailable
      );
    }

    const body = await request.json();
    const { recommendationId, walletAddress, voteType } = body;

    // Validate input
    if (!recommendationId || !walletAddress || !voteType) {
      return NextResponse.json(
        { error: 'Missing required fields: recommendationId, walletAddress, voteType' },
        { status: 400 }
      );
    }

    if (voteType !== 'approve' && voteType !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Record the vote (upsert will update if already exists)
    const vote = await recordVote(recommendationId, walletAddress, voteType);

    if (!vote) {
      return NextResponse.json(
        { 
          error: 'Failed to record vote. Database operation failed.',
          details: 'Please try again or contact support if the issue persists.'
        },
        { status: 500 }
      );
    }

    // Get updated vote counts
    const voteCounts = await getVotesByRecommendation(recommendationId);

    return NextResponse.json({
      success: true,
      vote,
      voteCounts,
    });
  } catch (error) {
    console.error('Error in POST /api/votes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseEnabled) {
      return NextResponse.json(
        { 
          approves: 0,
          rejects: 0,
          message: 'Voting disabled - Supabase not configured'
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('recommendationId');

    if (!recommendationId) {
      return NextResponse.json(
        { error: 'Missing recommendationId parameter' },
        { status: 400 }
      );
    }

    const voteCounts = await getVotesByRecommendation(recommendationId);

    return NextResponse.json({
      success: true,
      voteCounts,
    });
  } catch (error) {
    console.error('Error in GET /api/votes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
