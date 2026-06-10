import { SiteNav } from '@/components/SiteNav'
import { useAttendanceTick } from '@/lib/hooks'
import { getSessions, exportFlagsCsv } from '@/lib/attendance'
import { ROSTER } from '@/lib/roster'

export function Flags() {
  useAttendanceTick()
  const sessions = getSessions()
  const rows = sessions.flatMap(s => s.submissions.filter(r=>r.status==='flagged').map(r => ({ ...r, sessionId: s.id, group: s.group, student: ROSTER.find(x=>x.id===r.studentId) })))
  function dl() { const csv = exportFlagsCsv(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); a.download = `flags_${Date.now()}.csv`; a.click() }
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Flagged events</h1>
            <p className="mt-2 text-sm text-muted-foreground">Every duplicate submission, shared device, or off-group attempt is recorded here.</p>
          </div>
          <button onClick={dl} disabled={rows.length===0} className="rounded-md border border-border bg-secondary px-4 py-2 text-sm hover:border-primary disabled:opacity-40">Export CSV</button>
        </div>
        {rows.length === 0
          ? <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">🟢 No flagged events so far.</div>
          : <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>{['When','Session','Student','Group','Reason'].map(h=><th key={h} className="px-4 py-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r,i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.sessionId}</td>
                      <td className="px-4 py-2"><div className="font-mono text-xs text-muted-foreground">{r.studentId}</div><div className="font-arabic text-foreground" dir="rtl">{r.student?.name ?? '—'}</div></td>
                      <td className="px-4 py-2 text-foreground">{r.student?.group ?? r.group}</td>
                      <td className="px-4 py-2 text-warning">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </main>
    </div>
  )
}
