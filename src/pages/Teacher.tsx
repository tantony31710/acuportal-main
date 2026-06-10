import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { useIsTeacher } from '../lib/auth'
import { useAttendanceTick } from '../lib/hooks'
import { GROUPS, type Group } from '../lib/roster'
import { supabase } from '../lib/supabase'

// Helper function to trigger browser CSV file generation
function dl(csv: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = name
  a.click()
}

// Helper to compile submissions arrays into clean CSV formats
function generateCsvFromSubmissions(session: any, submissions: any[]): string {
  let csv = 'Student ID,Email,Timestamp,Status,IP Address,User Agent\n'
  submissions.forEach(sub => {
    csv += `"${sub.student_id}","${sub.email || ''}","${new Date(sub.created_at).toISOString()}","${sub.status}","${sub.ip_address || ''}","${sub.user_agent || ''}"\n`
  })
  return csv
}

export function Teacher() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()
  useAttendanceTick()

  const [group, setGroup] = useState<Group>('G1')
  const [windowMin, setWindowMin] = useState(15)
  const [mounted, setMounted] = useState(false)

  // Real-time Supabase states
  const [active, setActive] = useState<any>(null)
  const [sessionsHistory, setSessionsHistory] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Timer countdown trackers
  const [timeRemaining, setTimeRemaining] = useState({ min: 0, sec: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (teacher === false) navigate('/auth')
  }, [teacher, navigate])

  // Fetch all active sessions and past histories directly from the database
  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch current active session running on the platform
      const { data: activeData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      setActive(activeData)

      // 2. Fetch submissions for the active session if one exists
      if (activeData) {
        const { data: subData } = await supabase
          .from('attendance_submissions')
          .select('*')
          .eq('session_id', activeData.id)
        setSubmissions(subData || [])
      } else {
        setSubmissions([])
      }

      // 3. Fetch full historical record logs
      const { data: historyData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      setSessionsHistory(historyData || [])
    } catch (err) {
      console.error('Failed to sync dashboard streams:', err)
    }
  }

  useEffect(() => {
    if (mounted && teacher) {
      fetchDashboardData()
      // Dynamic backup stream pooling to keep cards fresh every 5 seconds
      const poll = setInterval(fetchDashboardData, 5000)
      return () => clearInterval(poll)
    }
  }, [mounted, teacher])

  // Live timer tick controller
  useEffect(() => {
    if (!active || !active.ends_at) return

    const updateCountdown = () => {
      const msLeft = new Date(active.ends_at).getTime() - Date.now()
      if (msLeft <= 0) {
        setTimeRemaining({ min: 0, sec: 0 })
        fetchDashboardData()
      } else {
        setTimeRemaining({
          min: Math.floor(msLeft / 60000),
          sec: Math.floor((msLeft % 60000) / 1000)
        })
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [active])

  if (!mounted || teacher === null) return null

  // Calculate dynamic dashboard summary metrics locally from db submission states
  const summary = {
    present: submissions.filter(s => s.status === 'present').length,
    flagged: submissions.filter(s => s.status === 'flagged').length
  }

  // Action: Launch a brand-new cloud tracked PIN session
  const handleStartSession = async () => {
    try {
      setActionLoading(true)
      
      // Auto-expire any previous active sessions globally first
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('is_active', true)

      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString() // Standardized 6-digit pin structure
      const endsAtTime = new Date(Date.now() + windowMin * 60000).toISOString()

      // Post raw payload safely to the server (REMOVED broken instructor_id)
      const { error } = await supabase
        .from('attendance_sessions')
        .insert([
          {
            pin_code: generatedPin,
            group_name: group,
            is_active: true,
            ends_at: endsAtTime
          }
        ])

      if (error) throw error
      await fetchDashboardData()
    } catch (err: any) {
      alert('Error launching session: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Explicitly terminate access parameters early
  const handleCloseSession = async (id: string) => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      await fetchDashboardData()
    } catch (err: any) {
      alert('Error closing session: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Compile historical records for export operations
  const handleExportCsv = async (session: any) => {
    try {
      const { data: subs } = await supabase
        .from('attendance_submissions')
        .select('*')
        .eq('session_id', session.id)

      const csvContent = generateCsvFromSubmissions(session, subs || [])
      dl(csvContent, `session_group_${session.group_name || 'all'}_${session.id}.csv`)
    } catch (err: any) {
      alert('Export pipeline failed: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <section className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />Teacher Control Panel
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Manage Sessions</h1>
          <p className="mt-2 text-sm text-slate-400">Start PIN-gated sessions; every student device sees them live.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border border-blue-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Active Session Status</h2>
            {active ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-5">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs text-slate-400 uppercase tracking-wider">Session PIN (announce aloud)</div>
                      <div className="mb-2 text-5xl font-mono text-blue-400 font-extrabold tracking-wider animate-pulse">{active.pin_code}</div>
                      <div className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded w-fit border border-slate-800">
                        Time left: <span className="font-mono text-white font-medium">{timeRemaining.min}:{String(timeRemaining.sec).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <div className="space-y-2.5 border-t border-slate-800 pt-4 sm:border-t-0 sm:pt-0 text-sm">
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-400">Target Group:</span>
                        <span className="font-semibold text-blue-400">{active.group_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-400">Present Checked-in:</span>
                        <span className="font-bold text-emerald-400 text-base">{summary.present}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-400">Flagged Exceptions:</span>
                        <span className="font-bold text-amber-400 text-base">{summary.flagged}</span>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-slate-400">Closing Interval:</span>
                        <span className="text-slate-300 font-medium">{new Date(active.ends_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    disabled={actionLoading}
                    onClick={() => handleCloseSession(active.id)}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white transition hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                  >
                    Close Current Session
                  </button>
                  <button 
                    onClick={() => handleExportCsv(active)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 cursor-pointer"
                  >
                    Export Active CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Target group roster</label>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', ...GROUPS] as Group[]).map(g => (
                        <button key={g} type="button" onClick={() => setGroup(g)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${group === g ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'}`}>
                          {g === 'ALL' ? 'All' : g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Active window duration (minutes)</label>
                    <input type="number" min={1} max={180} value={windowMin} onChange={e => setWindowMin(Number(e.target.value) || 15)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
                <button 
                  disabled={actionLoading}
                  onClick={handleStartSession}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3.5 font-bold text-white tracking-wide transition hover:bg-blue-500 shadow-xl shadow-blue-600/10 disabled:opacity-50 cursor-pointer text-center"
                >
                  {actionLoading ? "Deploying Code Sync..." : "▶ Start New Live Attendance Session"}
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-5 shadow-lg">
              <div className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Total Tracked Roster</div>
              <div className="mt-2 text-4xl font-extrabold text-emerald-300 tracking-tight">275 <span className="text-xs font-normal text-emerald-500">Students</span></div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
              <div className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Cloud History logs</div>
              <div className="mt-2 text-4xl font-extrabold text-white tracking-tight">{sessionsHistory.length}</div>
            </div>
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-white">Historical Logs Channel</h2>
          {sessionsHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-sm text-slate-500 bg-slate-900/20">
              No previous attendance sessions found. Launch a live window above to begin tracking.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 shadow-2xl">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    {['Date / Time Started', 'Target Group', 'Broadcast Status', 'Data Download'].map(h => (
                      <th key={h} className="px-5 py-3.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {sessionsHistory.map(s => {
                    const status = !s.is_active ? 'Closed' : new Date(s.ends_at).getTime() < Date.now() ? 'Expired' : 'Active'
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/40 transition-colors duration-150">
                        <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{new Date(s.created_at).toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-200">{s.group_name}</td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                            status === 'Active' 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 animate-pulse' 
                              : 'bg-slate-950 text-slate-500 border border-slate-800'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => handleExportCsv(s)} className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 cursor-pointer">
                            📥 Download CSV
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}