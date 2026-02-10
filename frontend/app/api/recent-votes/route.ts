import { NextResponse } from 'next/server';
import { getRecentVotes } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('recommendationId') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const votes = await getRecentVotes(recommendationId, limit);
    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Error fetching recent votes:', error);
    return NextResponse.json({ error: 'Failed to fetch recent votes' }, { status: 500 });
  }
}
