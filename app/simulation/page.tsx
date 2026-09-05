'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Zap, Server, ShieldAlert, BadgeIndianRupee, Activity, Play } from 'lucide-react';
import { SimulationResult } from '@/lib/simulation/simulationEngine';
import { Progress } from '@/components/ui/progress';

export default function SimulationPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const { toast } = useToast();

  const handleSimulate = async (count: number) => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numCases: count })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        toast({
          title: "Simulation Complete",
          description: `Processed ${count} synthetic cases successfully.`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Simulation Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDropoff = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numCases: 3, forceType: 'checkout_abandonment' })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        toast({
          title: "Drop-off Simulation Complete",
          description: `Generated 3 cart drop-off / crash cases.`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Simulation Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Simulation Engine</h1>
        <p className="text-muted-foreground">Generate synthetic cases and run the autonomous recovery loop to project revenue recovery at scale.</p>
      </div>

      <Card className="border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Batch Generation
          </CardTitle>
          <CardDescription>
            This will synthesize fake payment failures, abandonment, and subscription issues, and run them through the AI and Policy Engines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={() => handleSimulate(5)} disabled={loading} variant="outline" className="w-40 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
              {loading ? 'Running...' : 'Generate 5 Cases'}
            </Button>
            <Button onClick={() => handleSimulate(100)} disabled={loading} variant="outline" className="w-40 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
              {loading ? 'Running...' : 'Generate 100 Cases'}
            </Button>
            <Button onClick={() => handleSimulate(500)} disabled={loading} variant="outline" className="w-40 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
              {loading ? 'Running...' : 'Generate 500 Cases'}
            </Button>
            <Button onClick={() => handleSimulate(1000)} disabled={loading} className="w-40 bg-indigo-600 hover:bg-indigo-700">
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Running...' : 'Generate 1000 Cases'}
            </Button>
          </div>
          <div className="mt-4 flex gap-4">
            <Button onClick={handleSimulateDropoff} disabled={loading} variant="outline" className="border-rose-200 hover:bg-rose-50 hover:text-rose-700">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Simulate 3 Checkout Crashes (Drop-offs)
            </Button>
          </div>
          {loading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing synthetic cases...</span>
                <span>In progress</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold tracking-tight mt-8">Simulation Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Cases</p>
                    <p className="text-3xl font-bold">{results.totalCases}</p>
                  </div>
                  <Server className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Revenue At Risk</p>
                    <p className="text-3xl font-bold">₹{results.revenueAtRisk.toLocaleString()}</p>
                  </div>
                  <ShieldAlert className="h-5 w-5 text-rose-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Recovered Revenue</p>
                    <p className="text-3xl font-bold text-emerald-600">₹{results.revenueRecovered.toLocaleString()}</p>
                  </div>
                  <BadgeIndianRupee className="h-5 w-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Recovery Rate</p>
                    <p className="text-3xl font-bold text-indigo-600">{results.recoveryRate.toFixed(1)}%</p>
                  </div>
                  <Activity className="h-5 w-5 text-indigo-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Decision Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Evaluated</span>
                    <span className="font-bold">{results.casesEvaluated}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-50 text-indigo-900 rounded-lg">
                    <span className="font-medium">Interventions Approved & Executed</span>
                    <span className="font-bold">{results.actionsAttempted}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-900 rounded-lg">
                    <span className="font-medium">Successful Recoveries</span>
                    <span className="font-bold">{results.successfulRecoveries}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-rose-50 text-rose-900 rounded-lg">
                    <span className="font-medium">Policy Stopped (Do Nothing / Limit)</span>
                    <span className="font-bold">{results.casesStopped}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 text-amber-900 rounded-lg">
                    <span className="font-medium">Human Escalations</span>
                    <span className="font-bold">{results.humanEscalations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Net Value Realized</CardTitle>
                <CardDescription>Accounts for intervention costs (SMS, email, API fees)</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col justify-center h-full pb-12">
                <div className="text-center">
                  <div className="text-5xl font-black text-emerald-600 mb-2">
                    ₹{results.netRevenueRecovered.toLocaleString()}
                  </div>
                  <p className="text-gray-500 font-medium">Net Revenue Recovered</p>
                  <p className="text-sm text-gray-400 mt-4 max-w-sm mx-auto">
                    Gross recovery was ₹{results.revenueRecovered.toLocaleString()}, and the autonomous agent spent ₹{(results.revenueRecovered - results.netRevenueRecovered).toLocaleString()} on intervention costs (SMS, Links, Auth calls).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
