import { NextResponse } from 'next/server';
import { executeRecoveryAction } from '@/lib/recovery/actionExecutor';
import { getDb } from '@/lib/db/supabaseStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    
    // Determine what action to execute. Default to the AI recommendation.
    let actionType: string | undefined | null = undefined;
    try {
      const body = await request.json();
      actionType = body.actionType;
    } catch {
      const recoveryCase = await (await getDb()).getRecoveryCase(caseId);
      if (recoveryCase) {
        actionType = recoveryCase.recommended_action;
      }
    }

    if (!actionType) {
      return NextResponse.json({ success: false, error: 'Action type missing' }, { status: 400 });
    }

    const result = await executeRecoveryAction(caseId, actionType as any);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Execute error:', error);
    
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Already recovered') ? 400 : 500;
                   
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
