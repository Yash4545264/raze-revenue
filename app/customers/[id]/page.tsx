import { getDb } from '@/lib/db/supabaseStore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculateCustomerMetrics, calculateCustomerValueScore, calculateChurnRiskScore, hasContactFatigue } from '@/lib/customer/customerProfile';
import { formatDistanceToNow, format } from 'date-fns';
import { CreditCard, Activity, Clock, ShieldAlert, PhoneOff, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const customer = await (await getDb()).getCustomer(id);
  
  if (!customer) return notFound();

  const metrics = await calculateCustomerMetrics(id);
  const valueScore = await calculateCustomerValueScore(id);
  const churnScore = await calculateChurnRiskScore(id);
  const contactFatigue = await hasContactFatigue(id);
  const cases = (await (await getDb()).getRecoveryCases()).filter(c => c.customer_id === id);
  const payments = await (await getDb()).getPaymentsByCustomer(id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <Badge variant="outline" className="text-xs">{customer.id}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {customer.email} • {customer.phone || 'No phone'} • Joined {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-indigo-100 bg-indigo-50/10 shadow-sm">
          <CardHeader className="border-b border-indigo-100 bg-indigo-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-indigo-900 text-base">
              <Activity className="h-4 w-4 text-indigo-600" />
              Intelligence Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Value Tier</p>
                <div className="flex items-center gap-2">
                  <Badge className={valueScore.classification === 'HIGH' ? 'bg-indigo-600' : ''}>
                    {valueScore.classification}
                  </Badge>
                  <span className="text-sm font-medium">{valueScore.score}/100</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Churn Risk</p>
                <div className="flex items-center gap-2">
                  <Badge variant={churnScore.classification === 'HIGH' ? 'destructive' : churnScore.classification === 'MEDIUM' ? 'outline' : 'secondary'}
                         className={churnScore.classification === 'HIGH' ? 'bg-rose-600 hover:bg-rose-600' : ''}>
                    {churnScore.classification}
                  </Badge>
                  <span className="text-sm font-medium">{churnScore.score}/100</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Contact Fatigue</p>
                <div className="flex items-center gap-2">
                  {contactFatigue ? (
                    <Badge variant="destructive" className="flex gap-1 items-center bg-rose-100 text-rose-700 hover:bg-rose-100">
                      <PhoneOff className="h-3 w-3" /> FATIGUED
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex gap-1 items-center bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle2 className="h-3 w-3" /> HEALTHY
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Preferred Time</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{metrics.preferredPaymentTime}</span>
                </div>
              </div>
            </div>

            {churnScore.reasons.length > 0 && (
              <div className="mt-6 p-3 bg-rose-50 border border-rose-100 rounded-md">
                <p className="text-sm font-semibold text-rose-900 mb-2 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Risk Factors
                </p>
                <ul className="text-xs text-rose-700 space-y-1 list-disc pl-4">
                  {churnScore.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-gray-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-gray-600" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Total Spend</div>
                <div className="text-2xl font-bold text-gray-900">₹{metrics.totalSpend.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Average Order</div>
                <div className="text-2xl font-bold text-gray-900">₹{metrics.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Successful Payments</div>
                <div className="text-xl font-semibold text-emerald-700">{metrics.successfulPayments}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-1">Failed Payments</div>
                <div className="text-xl font-semibold text-rose-700">{metrics.failedPayments}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recovery Case History</CardTitle>
          <CardDescription>All revenue recovery interventions for this customer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 border-b bg-gray-50/50 p-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-2">Case Info</div>
              <div>Amount</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>
            <div className="divide-y">
              {cases.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No recovery cases found for this customer.</div>
              ) : cases.map((rc) => (
                <div key={rc.id} className="grid grid-cols-5 items-center p-4 hover:bg-gray-50 transition-colors">
                  <div className="col-span-2">
                    <div className="font-medium text-gray-900 uppercase text-xs tracking-wider mb-1">
                      {rc.recovery_type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-500">{format(new Date(rc.created_at), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  <div className="font-medium">
                    ₹{rc.revenue_at_risk.toLocaleString()}
                  </div>
                  <div>
                    <Badge variant={rc.status === 'recovered' ? 'default' : rc.status === 'stopped' ? 'destructive' : 'secondary'}
                           className={rc.status === 'recovered' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                      {rc.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <Link href={`/recovery/${rc.id}`}>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
