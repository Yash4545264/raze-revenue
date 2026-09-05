import { GoogleGenAI, Type } from '@google/genai';
import { Customer, Payment, Order, CustomerBehaviour, AiDiagnosisResult, RecommendedActionType } from '@/types';
import { calculateCustomerMetrics, calculateCustomerValueScore, calculateChurnRiskScore } from '@/lib/customer/customerProfile';
import { getDb } from '@/lib/db/supabaseStore';

// Fallback logic for when AI_API_KEY is not configured
const generateFallbackDiagnosis = (
  payment: Payment,
  customerBehaviour: CustomerBehaviour | undefined
): AiDiagnosisResult => {
  const isHighValue = payment.amount > 10000;
  const hasGoodHistory = customerBehaviour ? customerBehaviour.successful_payments > 2 : false;
  const reason = payment.failure_reason?.toLowerCase() || '';
  
  let diagnosis = 'General payment failure';
  let recommendedAction: RecommendedActionType = 'payment_link';
  let probability = 0.5;
  
  if (reason.includes('insufficient')) {
    diagnosis = 'Customer has insufficient funds.';
    recommendedAction = 'switch_payment_method';
    probability = 0.4;
  } else if (reason.includes('temporary') || reason.includes('timeout')) {
    diagnosis = 'Temporary gateway or bank outage.';
    recommendedAction = 'retry';
    probability = 0.8;
  } else if (reason.includes('abandoned')) {
    diagnosis = 'Customer abandoned the checkout process.';
    recommendedAction = 'payment_link';
    probability = 0.6;
  }

  if (isHighValue && !hasGoodHistory) {
    probability -= 0.2;
  } else if (hasGoodHistory) {
    probability += 0.15;
  }

  return {
    diagnosis,
    recovery_probability: Math.min(Math.max(probability, 0.1), 0.95),
    recommended_action: recommendedAction,
    confidence: 0.85,
    reason: 'Generated via fallback rule engine due to missing AI API key.',
    optimal_timing: 'immediately',
    alternative_actions: [
      { action: 'payment_link', estimated_probability: 0.65 },
      { action: 'retry', estimated_probability: 0.45 },
      { action: 'customer_reminder', estimated_probability: 0.35 },
    ]
  };
};

export const analyzeRecoveryCase = async (params: {
  customer: Customer;
  payment?: Payment;
  order: Order;
  customerBehaviour?: CustomerBehaviour;
  recoveryHistory?: any;
}): Promise<AiDiagnosisResult> => {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("AI_API_KEY not found. Using fallback deterministic diagnosis engine.");
    if (params.payment) {
      return generateFallbackDiagnosis(params.payment, params.customerBehaviour);
    }
    // Fallback for checkout abandonment
    return {
      diagnosis: 'Checkout abandoned before payment attempt.',
      recovery_probability: 0.55,
      recommended_action: 'payment_link',
      confidence: 0.8,
      reason: 'Fallback evaluation for checkout abandonment.',
      optimal_timing: '15_minutes',
      alternative_actions: [
        { action: 'payment_link', estimated_probability: 0.55 },
        { action: 'customer_reminder', estimated_probability: 0.40 }
      ]
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const metrics = await calculateCustomerMetrics(params.customer.id);
  const valueScore = await calculateCustomerValueScore(params.customer.id);
  const churnRisk = await calculateChurnRiskScore(params.customer.id);

  // RAG: Fetch empirical data (similar past successful cases)
  const failureReason = params.payment?.failure_reason || 'abandoned_at_checkout';
  const similarCases = await (await getDb()).findSimilarCases(failureReason, valueScore.classification, 3);
  
  const ragContext = similarCases.length > 0 
    ? `\nEmpirical Memory (RAG Context):\nHere are past successful recovery cases for similar situations. Use these to inform your strategy:\n` + 
      similarCases.map((c, i) => `Case ${i+1}: Issue was ${c.recovery_type}, Action taken: ${c.recommended_action}, Timing: ${c.optimal_timing}`).join('\n')
    : `\nEmpirical Memory: No highly similar past cases found. Rely on zero-shot logical deduction.`;

  const prompt = `
You are the Revenue Autopilot AI Agent. Analyze the following revenue-at-risk scenario and provide a recovery diagnosis and strategy.

Customer Info:
Name: ${params.customer.name}
Email: ${params.customer.email}

Advanced Customer Profile:
Value Score: ${valueScore.score} / 100 (${valueScore.classification} VIP Tier)
Churn Risk: ${churnRisk.score} / 100 (${churnRisk.classification} Risk)
Preferred Payment Method: ${metrics.preferredPaymentMethod}
Preferred Contact Time: ${metrics.preferredPaymentTime}

Transaction Info:
Order Amount: ${params.order.amount} ${params.order.currency}
Payment Status: ${params.payment?.status || 'N/A'}
Failure Reason: ${params.payment?.failure_reason || 'N/A'}
Payment Method Used: ${params.payment?.payment_method || 'N/A'}
${ragContext}

Customer History:
Total Spend: ${metrics.totalSpend}
Successful Recoveries: ${metrics.successfulRecoveries}
Failed Recoveries: ${metrics.failedRecoveries}

Provide a highly structured diagnosis. Predict the probability of recovering this revenue (between 0.0 and 1.0).
Account for Customer Value Score when deciding how aggressive to be (e.g. VIPs should get "white-glove" treatment like human_escalation or gentle reminders instead of aggressive retries).
Account for Churn Risk when determining if we should act immediately or offer alternative methods.
Select the best primary recommended action from: "payment_link", "retry", "customer_reminder", "switch_payment_method", "human_escalation", "do_nothing".
Decide the optimal_timing for this action (e.g., "immediately", "in_2_hours", "tomorrow_morning"). Base this on their Preferred Contact Time if available.
Provide alternative actions with their estimated probabilities.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING, description: "Detailed explanation of why the payment failed or was abandoned." },
            recovery_probability: { type: Type.NUMBER, description: "Float between 0.0 and 1.0 representing the chance of successful recovery for the recommended action." },
            recommended_action: { 
              type: Type.STRING, 
              enum: ["payment_link", "retry", "customer_reminder", "switch_payment_method", "human_escalation", "do_nothing"],
              description: "The primary recommended action."
            },
            confidence: { type: Type.NUMBER, description: "Float between 0.0 and 1.0 representing the AI's confidence in its recommendation." },
            reason: { type: Type.STRING, description: "Explanation of why this strategy was chosen, including notes on Customer Value and Churn Risk." },
            optimal_timing: { type: Type.STRING, description: "When the action should be executed (e.g. 'immediately', 'in_2_hours', 'tomorrow_morning')" },
            alternative_actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, enum: ["payment_link", "retry", "customer_reminder", "switch_payment_method", "human_escalation", "do_nothing"] },
                  estimated_probability: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["diagnosis", "recovery_probability", "recommended_action", "confidence", "reason", "optimal_timing", "alternative_actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(response.text) as AiDiagnosisResult;
  } catch (error) {
    console.error("AI Generation Error:", error);
    if (params.payment) {
      return generateFallbackDiagnosis(params.payment, params.customerBehaviour);
    }
    throw error;
  }
};
