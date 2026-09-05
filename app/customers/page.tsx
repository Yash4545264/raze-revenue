import { getDb } from '@/lib/db/supabaseStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { calculateCustomerValueScore, calculateChurnRiskScore } from '@/lib/customer/customerProfile';
import { Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function CustomersPage() {
  const customers = await (await getDb()).getCustomers();
  
  // To keep the page load fast, we will calculate scores for all customers concurrently
  // In a real production app with millions of customers, this would be paginated and the scores would be cached in the DB.
  const customerData = await Promise.all(
    customers.map(async (c) => {
      const valueScore = await calculateCustomerValueScore(c.id);
      const churnScore = await calculateChurnRiskScore(c.id);
      const behaviours = await (await getDb()).getCustomerBehaviour(c.id);
      return {
        ...c,
        valueScore,
        churnScore,
        behaviours
      };
    })
  );

  // Sort by highest churn risk first, then by value
  customerData.sort((a, b) => {
    if (a.churnScore.classification === 'HIGH' && b.churnScore.classification !== 'HIGH') return -1;
    if (b.churnScore.classification === 'HIGH' && a.churnScore.classification !== 'HIGH') return 1;
    return b.valueScore.score - a.valueScore.score;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers Intelligence</h1>
        <p className="text-muted-foreground">Monitor customer lifetime value and churn risk to prioritize retention.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Value Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              {customerData.filter(c => c.valueScore.classification === 'HIGH').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-rose-600">High Churn Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {customerData.filter(c => c.churnScore.classification === 'HIGH').length}
            </div>
            <p className="text-xs text-rose-600/80 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
          <CardDescription>All customers ranked by attention needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 border-b bg-gray-50/50 p-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-2">Customer</div>
              <div>Value Tier</div>
              <div>Churn Risk</div>
              <div className="text-right">Action</div>
            </div>
            <div className="divide-y">
              {customerData.map((customer) => (
                <div key={customer.id} className="grid grid-cols-5 items-center p-4 hover:bg-gray-50 transition-colors">
                  <div className="col-span-2">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                    <div className="text-xs text-gray-400 mt-1">Joined {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}</div>
                  </div>
                  <div>
                    <Badge variant={customer.valueScore.classification === 'HIGH' ? 'default' : 'secondary'} 
                           className={customer.valueScore.classification === 'HIGH' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : ''}>
                      {customer.valueScore.classification} ({customer.valueScore.score}/100)
                    </Badge>
                  </div>
                  <div>
                    <Badge variant={customer.churnScore.classification === 'HIGH' ? 'destructive' : customer.churnScore.classification === 'MEDIUM' ? 'outline' : 'secondary'}
                           className={customer.churnScore.classification === 'HIGH' ? 'bg-rose-100 text-rose-700 border-transparent hover:bg-rose-100' : 
                                      customer.churnScore.classification === 'MEDIUM' ? 'text-amber-700 border-amber-200 bg-amber-50' : ''}>
                      {customer.churnScore.classification} ({customer.churnScore.score}/100)
                    </Badge>
                  </div>
                  <div className="text-right">
                    <Link href={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm">View Profile</Button>
                    </Link>
                  </div>
                </div>
              ))}
              {customerData.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No customers found. Run a simulation to generate data.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
