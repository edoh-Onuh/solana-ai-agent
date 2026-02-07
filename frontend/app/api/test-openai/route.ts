import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        hasKey: false,
      });
    }

    const openai = new OpenAI({ apiKey });

    // Test with a simple prompt
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say "API test successful" in exactly 3 words.' }],
      max_tokens: 10,
    });

    return NextResponse.json({
      success: true,
      hasKey: true,
      model: 'gpt-4o',
      response: response.choices[0]?.message?.content || '',
      usage: response.usage,
    });
  } catch (error: any) {
    console.error('OpenAI test error:', error);
    
    return NextResponse.json({
      success: false,
      hasKey: !!process.env.OPENAI_API_KEY,
      error: error.message || 'Unknown error',
      errorType: error.code || error.type || 'unknown',
      suggestion: error.code === 'model_not_found' 
        ? 'Your API key does not have access to gpt-4o. Try gpt-4o-mini or gpt-3.5-turbo instead.'
        : 'Check your OpenAI API key and account status.',
    });
  }
}
