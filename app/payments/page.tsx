import { CreditCard, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getDb } from '@/lib/db/supabaseStore';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const payments = await (await getDb()).getAllPayments();

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-indigo-600" />
            Payments Log
          </h1>
          <p className="mt-2 text-gray-600">
            A raw log of all transactions and their status.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Payments Found</h3>
            <p className="mt-2 text-gray-500">
              Run a simulation or process real transactions to populate this view.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failure Reason</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{p.customer?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{p.customer?.email}</div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ₹{p.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {p.status === 'failed' ? (
                      <Badge variant="destructive" className="flex w-max items-center gap-1 text-[10px]">
                        <AlertCircle className="w-3 h-3" /> FAILED
                      </Badge>
                    ) : p.status === 'captured' || p.status === 'paid' ? (
                      <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 flex w-max items-center gap-1 text-[10px]">
                        <CheckCircle className="w-3 h-3" /> {p.status.toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex w-max items-center gap-1 text-[10px]">
                        <RefreshCw className="w-3 h-3" /> {p.status.toUpperCase()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                    {p.failure_reason || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
