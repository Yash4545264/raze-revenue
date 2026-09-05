'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

export function RevenueLeakMap({ data }: { data: any[] }) {
  return (
    <Card className="col-span-1 h-[400px]">
      <CardHeader>
        <CardTitle>Revenue at Risk by Category</CardTitle>
        <CardDescription>Breakdown of current revenue leaks</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue (₹)']}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StrategyPerformanceChart({ data }: { data: any[] }) {
  return (
    <Card className="col-span-2 h-[400px]">
      <CardHeader>
        <CardTitle>Recovery Success by Strategy</CardTitle>
        <CardDescription>Historical success rates of different AI interventions</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value: any) => `${value}%`} />
            <Tooltip 
              formatter={(value: any) => [`${value}%`, 'Success Rate']} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="success" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
