import { NextResponse } from 'next/server';
import { getRecentVotes } from '@/lib/supabase';

export async function GET() {
  try {
    const votes = await getRecentVotes(10);
    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Error fetching recent votes:', error);
    return NextResponse.json({ error: 'Failed to fetch recent votes' }, { status: 500 });
  }
}
