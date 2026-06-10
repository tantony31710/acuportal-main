import { SiteNav } from '@/components/SiteNav'
import { useAttendanceTick } from '@/lib/hooks'
import { getSessions, summarizeSession, exportSessionCsv } from '@/lib/attendance'

function dl(csv: string, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); a.download = name; a.click() }

export function Sessions() {
  useAttendanceTick()
  const sessions = getSessions()
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sessions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Full history of all attendance sessions.</p>
        {sessions.length === 0
          ? <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No sessions active yet.</div>
          : <div className="mt-8 space-y-4">
              {sessions.map(s => {
                const sm = summarizeSession(s)
                const rate = sm.total ? Math.round((sm.present/sm.total)*100) : 0
                return (
                  <div key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">ID: {s.id.slice(0,8)}…</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{s.group} · started {new Date(s.startedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="pin-digit text-2xl text-primary">{s.pin}</div>
                          <div className="text-xs text-muted-foreground mt-1">{s.closedAt ? 'closed' : Date.now()>s.endsAt ? 'expired' : 'active'}</div>
                        </div>
                        <button onClick={() => dl(exportSessionCsv(s),`session_${s.id}.csv`)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">Export CSV</button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
                      {[['Roster',sm.total,'text-foreground'],['Present',sm.present,'text-success'],['Flagged',sm.flagged,'text-warning'],['Absent',sm.absent,'text-muted-foreground']].map(([l,v,c]) => (
                        <div key={String(l)} className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                          <div className={`mt-1 font-mono text-xl font-semibold ${c}`}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                      <div style={{ width: `${Math.min(rate,100)}%` }} className="h-full bg-primary transition-all duration-300" />
                    </div>
                    <div className="mt-1 text-right text-xs text-muted-foreground">{rate}% present</div>
                  </div>
                )
              })}
            </div>}
      </main>
    </div>
  )
}
