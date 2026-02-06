import { NextResponse } from 'next/server';

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const hasOpenAI = !!(openaiKey && openaiKey !== 'your_openai_key_here' && openaiKey.startsWith('sk-'));
  
  return NextResponse.json({
    openai: {
      configured: hasOpenAI,
      status: hasOpenAI ? 'active' : 'not configured',
    },
    solana: {
      rpcUrl: process.env.SOLANA_RPC_URL || 'default',
    },
    timestamp: Date.now(),
  });
}
