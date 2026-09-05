import { NextResponse } from 'next/server';
import { runSimulation } from '@/lib/simulation/simulationEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const numCases = body.numCases || 100;
    const forceType = body.forceType || null;
    
    // TEMPORARY: Unset Gemini API keys to bypass rate limits and use the fallback fast engine
    const oldKey = process.env.GEMINI_API_KEY;
    const oldAiKey = process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_API_KEY;

    const result = await runSimulation(numCases, forceType);

    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    if (oldAiKey) process.env.AI_API_KEY = oldAiKey;

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
