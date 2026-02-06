import { NextRequest, NextResponse } from 'next/server';
import { recordVote, getVotesByRecommendation } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
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
        { error: 'Failed to record vote' },
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
