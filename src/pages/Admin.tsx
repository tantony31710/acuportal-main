import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteNav } from '@/components/SiteNav'
import { useIsTeacher } from '@/lib/auth'
import { validateRoster, saveRosterOverride, clearRosterOverride, hasRosterOverride, type RosterValidationResult } from '@/lib/roster'

type Mapped = { id: string; name: string; group: string; advisor: string }

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) { if (c==='"'&&line[i+1]==='"'){cur+='"';i++} else if(c==='"'){inQ=false} else cur+=c }
    else { if(c==='"')inQ=true; else if(c===','){out.push(cur);cur=''} else cur+=c }
  }
  out.push(cur); return out.map(s=>s.trim())
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim().length>0)
  if(!lines.length) return {headers:[],rows:[]}
  return { headers: splitCsvLine(lines[0]).map(h=>h.toLowerCase()), rows: lines.slice(1).map(splitCsvLine) }
}

function pick(headers: string[], candidates: string[]): number {
  for (const c of candidates) { const i = headers.indexOf(c.toLowerCase()); if(i!==-1) return i }
  return -1
}

function mapCsv(headers: string[], rows: string[][]): { records: Mapped[]; headerError?: string } {
  const idIdx = pick(headers,['student id','id','studentid'])
  const nameIdx = pick(headers,['student name ar','name','student name','arabic name'])
  const groupIdx = pick(headers,['group','grp'])
  const advisorIdx = pick(headers,['advisor','supervisor','mentor'])
  const missing = []
  if(idIdx===-1) missing.push('Student ID'); if(nameIdx===-1) missing.push('Student Name Ar')
  if(groupIdx===-1) missing.push('Group'); if(advisorIdx===-1) missing.push('Advisor')
  if(missing.length) return { records: [], headerError: `Missing column(s): ${missing.join(', ')}` }
  return { records: rows.map(r => ({ id: r[idIdx]??'', name: r[nameIdx]??'', group: (r[groupIdx]??'').toUpperCase(), advisor: r[advisorIdx]??'' })) }
}

export function Admin() {
  const teacher = useIsTeacher()
  if (teacher === null) return <div className="min-h-screen"><SiteNav /></div>
  if (!teacher) return (
    <div className="min-h-screen"><SiteNav />
      <main className="mx-auto max-w-md px-5 py-14 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Teacher access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Admin tools are restricted to the teacher account.</p>
        <Link to="/auth" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background">Go to teacher login</Link>
      </main>
    </div>
  )
  return <AdminPanel />
}

function AdminPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string|null>(null)
  const [headerError, setHeaderError] = useState<string|null>(null)
  const [records, setRecords] = useState<Mapped[]|null>(null)
  const [result, setResult] = useState<RosterValidationResult|null>(null)
  const [saved, setSaved] = useState(false)
  const [hasOverride, setHasOverride] = useState(hasRosterOverride())

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if(!f) return
    setFileName(f.name); setSaved(false); setResult(null); setRecords(null); setHeaderError(null)
    const text = await f.text()
    const {headers,rows} = parseCsv(text)
    const {records,headerError} = mapCsv(headers,rows)
    if(headerError){setHeaderError(headerError);return}
    setRecords(records); setResult(validateRoster(records))
  }

  const stats = useMemo(() => {
    if(!result) return null
    if(result.ok) return { valid: result.data.length, invalid: 0, issues: 0 }
    return { valid: result.partial.length, invalid: (records?.length??0)-result.partial.length, issues: result.issues.length }
  }, [result,records])

  function save() {
    if(!result?.ok) return
    saveRosterOverride(result.data); setSaved(true); setHasOverride(true)
    setTimeout(()=>window.location.reload(),600)
  }
  function reset() { clearRosterOverride(); setHasOverride(false); setTimeout(()=>window.location.reload(),300) }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">Upload a new roster CSV. Every row is validated before saving.</p>
          </div>
          {hasOverride && <button onClick={reset} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">Revert to bundled roster</button>}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Required CSV columns</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {['Student ID','Student Name Ar','Group','Advisor'].map(c=>(
              <span key={c} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-foreground">{c}</span>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">ID: 6–12 digits · Group: G1/G2/G3/G4 · Name &amp; Advisor: non-empty</div>
          <div className="mt-5 flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            <button onClick={()=>fileRef.current?.click()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background hover:brightness-110">Choose CSV file</button>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>
        </div>

        {headerError && <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">✗ {headerError}</div>}

        {result && stats && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[['Valid rows',stats.valid,'border-success/40 bg-success/10 text-success'],['Invalid rows',stats.invalid,'border-destructive/40 bg-destructive/10 text-destructive'],['Issues',stats.issues,'border-warning/40 bg-warning/10 text-warning']].map(([l,v,c])=>(
                <div key={String(l)} className={`rounded-lg border p-4 ${c}`}><div className="text-2xl font-bold">{v}</div><div className="text-xs uppercase tracking-widest opacity-80">{l}</div></div>
              ))}
            </div>
            {result.ok
              ? <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-success">✓ All {result.data.length} rows passed validation. Ready to save.</div>
              : <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Validation report</div>
                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>{['Row','Student ID','Field','Problem'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {result.issues.map((iss,i)=>(
                          <tr key={i} className="border-t border-border odd:bg-background/40">
                            <td className="px-4 py-2 font-mono text-foreground">{iss.rowIndex+2}</td>
                            <td className="px-4 py-2 font-mono text-foreground">{iss.studentId??'—'}</td>
                            <td className="px-4 py-2 text-foreground">{iss.field}</td>
                            <td className="px-4 py-2 text-destructive">{iss.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>}
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={!result.ok} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                {result.ok ? 'Save roster' : 'Fix errors to enable saving'}
              </button>
              {saved && <span className="text-sm text-success">Saved · reloading…</span>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
