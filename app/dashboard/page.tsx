import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { RevenueLeakMap, StrategyPerformanceChart } from '@/components/dashboard/Charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDb } from '@/lib/db/supabaseStore';
import { Badge } from '@/components/ui/badge';
import { Bot, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await (await getDb()).getStats();
  const allCases = await (await getDb()).getRecoveryCases();
  const cases = allCases.slice(0, 5);

  // Calculate Leak Data for the Pie Chart
  const leakMap: Record<string, number> = {};
  allCases.forEach(c => {
    if (c.status !== 'recovered') {
      leakMap[c.recovery_type] = (leakMap[c.recovery_type] || 0) + c.revenue_at_risk;
    }
  });

  const leakData = Object.entries(leakMap).map(([key, val], index) => {
    const colors = ['#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6'];
    return {
      name: key.replace('_', ' ').toUpperCase(),
      value: val,
      color: colors[index % colors.length]
    };
  });

  if (leakData.length === 0) {
    leakData.push({ name: 'No Leaks', value: 1, color: '#e5e7eb' });
  }

  // Calculate Strategy Data for the Bar Chart
  const actions = await (await getDb()).getActions();
  const strategyMap: Record<string, { total: number; success: number }> = {};
  
  actions.forEach(a => {
    if (!strategyMap[a.action_type]) strategyMap[a.action_type] = { total: 0, success: 0 };
    strategyMap[a.action_type].total += 1;
    if (a.status === 'success') {
      strategyMap[a.action_type].success += 1;
    }
  });

  const strategyData = Object.entries(strategyMap).map(([key, val]) => ({
    name: key.replace('_', ' '),
    success: val.total > 0 ? Math.round((val.success / val.total) * 100) : 0,
    attempts: val.total
  }));

  if (strategyData.length === 0) {
    strategyData.push({ name: 'No Data', success: 0, attempts: 0 });
  }

  // Calculate A/B Testing Results
  const abTestStats = {
    immediate: { total: 0, recovered: 0 },
    wait_1_hour: { total: 0, recovered: 0 }
  };

  allCases.forEach(c => {
    if (c.test_group) {
      abTestStats[c.test_group].total += 1;
      if (c.status === 'recovered') {
        abTestStats[c.test_group].recovered += 1;
      }
    }
  });

  const immediateRate = abTestStats.immediate.total > 0 ? (abTestStats.immediate.recovered / abTestStats.immediate.total) * 100 : 0;
  const waitRate = abTestStats.wait_1_hour.total > 0 ? (abTestStats.wait_1_hour.recovered / abTestStats.wait_1_hour.total) * 100 : 0;
  const winningStrategy = immediateRate >= waitRate ? 'Immediate execution' : 'Waiting 1 hour';
  const margin = Math.abs(immediateRate - waitRate).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your revenue recovery agent.</p>
      </div>

      <MetricsCards stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RevenueLeakMap data={leakData} />
        <StrategyPerformanceChart data={strategyData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Recovery Cases</CardTitle>
              <CardDescription>Latest identified revenue leaks and actions taken.</CardDescription>
            </div>
            <Link href="/recovery">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${c.status === 'recovered' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      <ActivityIcon status={c.status} />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        ₹{c.revenue_at_risk.toLocaleString()}
                        <Badge variant={c.status === 'recovered' ? 'default' : c.status === 'stopped' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {c.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {c.recovery_type.replace('_', ' ')} • {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <Link href={`/recovery/${c.id}`}>
                    <Button variant="ghost" size="sm">View Details</Button>
                  </Link>
                </div>
              ))}
              {cases.length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  No recovery cases found. Run a simulation to generate some data.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-900 leading-relaxed">
                <span className="font-semibold block mb-1">Payment Link Interventions outperforming</span>
                Payment Link interventions are currently outperforming email reminders by 54% for UPI failure types.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-900 leading-relaxed">
                <span className="font-semibold block mb-1">High Recovery Potential</span>
                Temporary bank outages have the highest probability of recovery (85%) if retried after 4 hours.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-1">Checkout Abandonment Increase</span>
                Checkout abandonment increased this week. Consider lowering the minimum intervention amount in Policy Settings to capture these.
              </p>
            </div>
            
            {(abTestStats.immediate.total > 0 || abTestStats.wait_1_hour.total > 0) && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 leading-relaxed w-full">
                  <span className="font-semibold block mb-1">A/B Test Results: Timing</span>
                  <p className="mb-2"><strong>{winningStrategy}</strong> is currently outperforming by {margin}%.</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <div className="font-medium text-gray-500">Immediate</div>
                      <div className="text-lg font-bold">{immediateRate.toFixed(1)}%</div>
                      <div className="text-gray-400">({abTestStats.immediate.recovered}/{abTestStats.immediate.total})</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <div className="font-medium text-gray-500">Wait 1 Hour</div>
                      <div className="text-lg font-bold">{waitRate.toFixed(1)}%</div>
                      <div className="text-gray-400">({abTestStats.wait_1_hour.recovered}/{abTestStats.wait_1_hour.total})</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityIcon({ status }: { status: string }) {
  // Return simple colored circle for now
  return <div className="h-3 w-3 rounded-full bg-current"></div>;
}
