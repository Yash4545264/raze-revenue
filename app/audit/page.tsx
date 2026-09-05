import { getDb } from '@/lib/db/supabaseStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const logs = await (await getDb()).getAuditLogs(); // Gets all logs from store

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">Complete and immutable record of all system decisions, AI inferences, and policy enforcements.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>Chronological log of events across all cases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                <thead className="[&_tr]:border-b bg-gray-50/50">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Timestamp</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Event</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Actor</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Entity ID</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Reason / Detail</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle whitespace-nowrap text-muted-foreground">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {log.event}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            log.actor === 'SYSTEM' ? 'bg-indigo-500' :
                            log.actor === 'POLICY_ENGINE' ? 'bg-amber-500' :
                            log.actor === 'AI_AGENT' ? 'bg-emerald-500' : 'bg-gray-500'
                          }`} />
                          {log.actor}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground font-mono text-[10px]">
                        {log.entity_id}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-medium text-gray-900">{log.reason}</div>
                        {log.decision === 'APPROVED' && <span className="text-emerald-600 text-xs font-semibold mr-2">[APPROVED]</span>}
                        {log.decision === 'REJECTED' && <span className="text-rose-600 text-xs font-semibold mr-2">[REJECTED]</span>}
                        {log.metadata && (
                          <div className="text-xs text-gray-500 mt-1 max-w-md truncate">
                            {JSON.stringify(log.metadata)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No audit events recorded yet. Run a simulation to generate events.
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
