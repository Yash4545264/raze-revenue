'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, TrendingUp, AlertCircle, Activity } from 'lucide-react';

export function MetricsCards({ stats }: { stats: { totalRisk: number, totalRecovered: number, recoveryRate: number, activeCases: number } }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue at Risk</CardTitle>
          <AlertCircle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{stats.totalRisk.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all pending and active cases
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Recovered</CardTitle>
          <IndianRupee className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">₹{stats.totalRecovered.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Successfully recovered by AI Agent
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recoveryRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            Of closed recovery cases
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Recoveries</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeCases}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Cases currently in progress
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
