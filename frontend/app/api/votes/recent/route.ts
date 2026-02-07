import { NextRequest, NextResponse } from 'next/server';
import { getRecentVotes } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('recommendationId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!recommendationId) {
      return NextResponse.json(
        { success: false, error: 'Missing recommendationId' },
        { status: 400 }
      );
    }

    const votes = await getRecentVotes(recommendationId, limit);

    return NextResponse.json({
      success: true,
      votes,
    });
  } catch (error) {
    console.error('Error fetching recent votes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent votes' },
      { status: 500 }
    );
  }
}
