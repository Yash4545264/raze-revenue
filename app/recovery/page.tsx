import { getDb } from '@/lib/db/supabaseStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ShieldCheck, CreditCard, ShoppingCart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RecoveryPage() {
  const cases = await (await getDb()).getRecoveryCases();
  
  // Fetch all customers associated with cases in parallel
  const customerPromises = cases.map(c => (await getDb()).getCustomer(c.customer_id));
  const customers = await Promise.all(customerPromises);
  const customerMap = new Map(customers.filter(Boolean).map(c => [c!.id, c]));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'failed_payment': return <CreditCard className="h-4 w-4" />;
      case 'checkout_abandonment': return <ShoppingCart className="h-4 w-4" />;
      case 'failed_subscription': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'pending': { label: 'PENDING AI', variant: 'outline' },
      'policy_approved': { label: 'POLICY APPROVED', variant: 'secondary' },
      'in_progress': { label: 'IN PROGRESS', variant: 'secondary' },
      'recovered': { label: 'RECOVERED', variant: 'default' },
      'stopped': { label: 'STOPPED', variant: 'destructive' },
      'escalated': { label: 'ESCALATED', variant: 'destructive' },
    };
    const conf = statusConfig[status] || { label: status, variant: 'outline' };
    
    return (
      <Badge variant={conf.variant} className={status === 'recovered' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
        {conf.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recovery Cases</h1>
        <p className="text-muted-foreground">Manage and track revenue recovery workflows.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                <thead className="[&_tr]:border-b bg-gray-50/50">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[250px]">Case Type</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Customer</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Revenue at Risk</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">AI Action</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Created</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {cases.map((c) => {
                    const customer = customerMap.get(c.customer_id);
                    return (
                      <tr key={c.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-gray-100 text-gray-600">
                              {getTypeIcon(c.recovery_type)}
                            </div>
                            <span className="font-medium capitalize">{c.recovery_type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium">{customer?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{customer?.email}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle font-medium">
                          ₹{c.revenue_at_risk.toLocaleString()}
                        </td>
                        <td className="p-4 align-middle">
                          {c.recommended_action ? (
                            <div className="flex items-center gap-1.5 text-indigo-700 font-medium text-xs bg-indigo-50 px-2 py-1 rounded w-fit">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {c.recommended_action.replace(/_/g, ' ').toUpperCase()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Evaluating...</span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="p-4 align-middle text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Link href={`/recovery/${c.id}`}>
                            <Button variant="outline" size="sm">Inspect</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {cases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No cases found. Run a simulation to populate data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
