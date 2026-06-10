import { useState, useMemo } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { ROSTER, GROUPS, type Group } from '@/lib/roster'

export function Roster() {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<Group>('ALL')
  const list = useMemo(() => { const t = q.trim(); return ROSTER.filter(s => (group==='ALL'||s.group===group) && (!t||s.id.includes(t)||s.name.includes(t))) }, [q,group])
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Roster</h1>
            <p className="mt-2 text-sm text-muted-foreground">{list.length} of {ROSTER.length} students</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ID or name…" className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            {(['ALL',...GROUPS] as Group[]).map(g => (
              <button key={g} onClick={()=>setGroup(g)} className={`rounded-md border px-3 py-1.5 text-sm ${group===g?'border-primary bg-primary text-background':'border-border bg-secondary text-muted-foreground hover:text-foreground'}`}>{g==='ALL'?'All':g}</button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{['ID','Name','Group','Advisor'].map(h=><th key={h} className="px-4 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.slice(0,400).map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{s.id}</td>
                  <td className="px-4 py-2 font-arabic text-foreground" dir="rtl">{s.name}</td>
                  <td className="px-4 py-2 text-foreground">{s.group}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.advisor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
