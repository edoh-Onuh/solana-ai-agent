import { NextResponse } from 'next/server';
import { aiAgent } from '@/lib/ai-agent';
import type { ValidatorMetrics, DecentralizationMetrics } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { validators, metrics, targetStake } = await request.json();
    
    console.log('API: Generating AI recommendations...');
    console.log('Validators count:', validators?.length);
    console.log('Target stake:', targetStake);
    
    const recommendation = await aiAgent.generateRecommendations(
      validators as ValidatorMetrics[],
      metrics as DecentralizationMetrics,
      targetStake || (1000000 * 1e9) // Default to 1M SOL in lamports
    );
    
    console.log('API: Recommendation generated successfully');
    
    return NextResponse.json({
      recommendation,
      success: true,
    });
  } catch (error) {
    console.error('API Error generating recommendation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendation',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
