import { getDb } from '@/lib/db/supabaseStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, ShieldCheck, Activity, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { RazorpayPaymentButton } from '@/components/recovery/RazorpayPaymentButton';
import { calculateCustomerValueScore, calculateChurnRiskScore } from '@/lib/customer/customerProfile';
import { notFound } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';

export default async function RecoveryCaseDetails({ params }: { params: { id: string } }) {
  const { id } = await params;
  const rc = await (await getDb()).getRecoveryCase(id);
  if (!rc) return notFound();

  const customer = await (await getDb()).getCustomer(rc.customer_id);
  const order = await (await getDb()).getOrder(rc.order_id);
  const payment = rc.payment_id ? await (await getDb()).getPayment(rc.payment_id) : null;
  const actions = await (await getDb()).getRecoveryActions(rc.id);
  const auditLogs = (await (await getDb()).getAuditLogs(rc.id)).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Calculate expected values for display
  const expectedValue = (Number(rc.revenue_at_risk) * (rc.recovery_probability || 0)).toFixed(2);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Recovery Case: {rc.id.split('_').pop()}</h1>
            <Badge variant="outline" className="uppercase tracking-wider text-xs">
              {rc.recovery_type.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Created {formatDistanceToNow(new Date(rc.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Revenue at Risk</div>
          <div className="text-3xl font-bold text-gray-900">₹{rc.revenue_at_risk.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Context & Customer */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-base">Customer & Order</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Customer Name</span>
                <span className="font-medium">{customer?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Email</span>
                <span className="font-medium">{customer?.email}</span>
              </div>
              
              {customer && (
                <div className="bg-indigo-50/50 p-3 rounded-md mt-2 border border-indigo-100/50">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-indigo-600/70 block mb-0.5">Value Tier</span>
                      <span className="font-semibold text-indigo-900">{(await calculateCustomerValueScore(customer.id)).classification}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600/70 block mb-0.5">Churn Risk</span>
                      <span className={`font-semibold ${(await calculateChurnRiskScore(customer.id)).classification === 'HIGH' ? 'text-rose-600' : 'text-indigo-900'}`}>
                        {(await calculateChurnRiskScore(customer.id)).classification}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <hr />
              <div>
                <span className="text-muted-foreground block mb-1">Order ID</span>
                <span className="font-mono">{order?.razorpay_order_id}</span>
              </div>
              {payment && (
                <>
                  <div>
                    <span className="text-muted-foreground block mb-1">Payment ID</span>
                    <span className="font-mono">{payment.razorpay_payment_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Failure Reason</span>
                    <span className="font-medium text-rose-600">{payment.failure_reason || 'Unknown'}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-base">Take Action</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RazorpayPaymentButton caseId={rc.id} status={rc.status} />
              {rc.status === 'stopped' && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-md flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-900 font-medium">STOPPING RULE TRIGGERED</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle/Right Column: AI & Strategy */}
        <div className="col-span-2 space-y-6">
          
          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Bot className="h-5 w-5 text-indigo-600" />
                AI Diagnosis & Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">AI Diagnosis</h4>
                <p className="text-gray-900 font-medium">{rc.diagnosis || 'Analyzing...'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Recovery Probability</div>
                  <div className="text-2xl font-bold text-gray-900">{((rc.recovery_probability || 0) * 100).toFixed(1)}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">AI Confidence</div>
                  <div className="text-2xl font-bold text-gray-900">{((rc.confidence || 0) * 100).toFixed(1)}%</div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="text-sm text-indigo-700 mb-1">Optimal Timing</div>
                  <div className="text-lg font-bold text-indigo-900 capitalize">{rc.optimal_timing?.replace(/_/g, ' ') || 'Immediately'}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Recommended Strategy</h4>
                <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-indigo-600" />
                    <div>
                      <div className="font-bold text-indigo-900 uppercase">{rc.recommended_action?.replace(/_/g, ' ')}</div>
                      <div className="text-sm text-indigo-700 mt-1">Expected Recovery: ₹{expectedValue}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200">
                    Highest Net Value
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-base">Audit Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {auditLogs.map((log, i) => (
                  <div key={log.id} className="relative pl-6 border-l-2 border-gray-200 pb-2">
                    <div className="absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-full -left-[7px] top-1"></div>
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-sm">{log.event.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{log.reason}</div>
                    {log.decision === 'APPROVED' && (
                      <Badge variant="secondary" className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200">POLICY PASSED</Badge>
                    )}
                    {log.decision === 'REJECTED' && (
                      <Badge variant="secondary" className="mt-2 bg-rose-100 text-rose-700 border-rose-200">POLICY REJECTED</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
