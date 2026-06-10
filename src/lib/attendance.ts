import { ROSTER, type Group } from './roster'

export type SubmissionRecord = {
  studentId: string; timestamp: number; pinUsed: string
  status: 'present' | 'flagged'; reason?: string; fingerprint: string
}

export type Session = {
  id: string; pin: string; group: Group
  startedAt: number; endsAt: number; closedAt: number | null
  windowMinutes: number; submissions: SubmissionRecord[]
}

const SESSIONS_KEY = 'ap_sessions_v1'
const ACTIVE_KEY = 'ap_active_session_v1'

function read<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb } catch { return fb }
}
function write<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v))
  window.dispatchEvent(new Event('ap:update'))
}

export const getSessions = (): Session[] => read<Session[]>(SESSIONS_KEY, [])
export const getActiveSessionId = (): string | null => read<string | null>(ACTIVE_KEY, null)

export function getActiveSession(): Session | null {
  const id = getActiveSessionId(); if (!id) return null
  const s = getSessions().find(x => x.id === id) ?? null; if (!s) return null
  if (!s.closedAt && Date.now() > s.endsAt) return closeSession(s.id)
  return s
}

function generatePin(): string {
  const arr = new Uint32Array(6); crypto.getRandomValues(arr)
  return Array.from(arr, n => n % 10).join('')
}

export function startSession(opts: { group: Group; windowMinutes: number }): Session {
  const eid = getActiveSessionId(); if (eid) closeSession(eid)
  const now = Date.now()
  const session: Session = {
    id: `S-${new Date(now).toISOString().slice(0,16).replace(/[-:T]/g,'')}`,
    pin: generatePin(), group: opts.group,
    startedAt: now, endsAt: now + opts.windowMinutes * 60_000,
    closedAt: null, windowMinutes: opts.windowMinutes, submissions: [],
  }
  const all = getSessions(); all.unshift(session)
  write(SESSIONS_KEY, all); write(ACTIVE_KEY, session.id)
  return session
}

export function closeSession(id: string): Session | null {
  const all = getSessions(); const idx = all.findIndex(s => s.id === id); if (idx === -1) return null
  if (!all[idx].closedAt) { all[idx] = { ...all[idx], closedAt: Date.now() }; write(SESSIONS_KEY, all) }
  if (getActiveSessionId() === id) write(ACTIVE_KEY, null)
  return all[idx]
}

export function submitAttendance(input: { studentId: string; pin: string; fingerprint: string }) {
  const active = getActiveSession()
  if (!active) return { ok: false, reason: 'No active session' }
  if (active.closedAt || Date.now() > active.endsAt) return { ok: false, reason: 'Session window expired' }
  if (input.pin.trim() !== active.pin) return { ok: false, reason: 'Incorrect PIN' }
  const student = ROSTER.find(s => s.id === input.studentId.trim())
  if (!student) return { ok: false, reason: 'Student ID not in roster' }
  if (active.group !== 'ALL' && student.group !== active.group)
    return { ok: false, reason: `Wrong group — session is for ${active.group}` }
  const ts = Date.now()
  const dup = active.submissions.find(r => r.studentId === student.id)
  if (dup) {
    appendFlag(active.id, { studentId: student.id, timestamp: ts, pinUsed: input.pin, status: 'flagged', reason: 'Duplicate attempt (rejected)', fingerprint: input.fingerprint })
    return { ok: false, reason: 'Already checked in — one response per person' }
  }
  const reuse = active.submissions.find(r => r.fingerprint === input.fingerprint && r.studentId !== student.id && ts - r.timestamp < 60_000)
  if (reuse) {
    appendFlag(active.id, { studentId: student.id, timestamp: ts, pinUsed: input.pin, status: 'flagged', reason: 'Shared device fingerprint (proxy rejected)', fingerprint: input.fingerprint })
    return { ok: false, reason: 'This device already submitted for another student' }
  }
  const all = getSessions(); const idx = all.findIndex(s => s.id === active.id)
  all[idx] = { ...all[idx], submissions: [...all[idx].submissions, { studentId: student.id, timestamp: ts, pinUsed: input.pin, status: 'present', fingerprint: input.fingerprint }] }
  write(SESSIONS_KEY, all)
  return { ok: true, studentName: student.name }
}

function appendFlag(sessionId: string, flag: SubmissionRecord) {
  const all = getSessions(); const idx = all.findIndex(s => s.id === sessionId)
  if (idx !== -1) { all[idx] = { ...all[idx], submissions: [...all[idx].submissions, flag] }; write(SESSIONS_KEY, all) }
}

export function summarizeSession(s: Session) {
  const roster = s.group === 'ALL' ? ROSTER : ROSTER.filter(r => r.group === s.group)
  const presentIds = new Set(s.submissions.filter(r => r.status === 'present').map(r => r.studentId))
  const flaggedIds = new Set(s.submissions.filter(r => r.status === 'flagged').map(r => r.studentId))
  return { total: roster.length, present: presentIds.size, flagged: flaggedIds.size, absent: roster.filter(r => !presentIds.has(r.id) && !flaggedIds.has(r.id)).length }
}

export function getFingerprint(): string {
  const k = 'ap_fp_v1'; let v = localStorage.getItem(k)
  if (!v) { v = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + '-' + (navigator.hardwareConcurrency || 0) + '-' + screen.width + 'x' + screen.height; localStorage.setItem(k, v) }
  return v
}

export function exportFlagsCsv(): string {
  const rows = [['Session','Student ID','Name','Group','Reason','Timestamp']]
  for (const s of getSessions())
    for (const r of s.submissions) {
      if (r.status !== 'flagged') continue
      const st = ROSTER.find(x => x.id === r.studentId)
      rows.push([s.id, r.studentId, st?.name ?? '', st?.group ?? '', r.reason ?? '', new Date(r.timestamp).toISOString()])
    }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
}

export function exportSessionCsv(s: Session): string {
  const roster = s.group === 'ALL' ? ROSTER : ROSTER.filter(r => r.group === s.group)
  const presentIds = new Set(s.submissions.filter(r => r.status === 'present').map(r => r.studentId))
  const flaggedIds = new Set(s.submissions.filter(r => r.status === 'flagged').map(r => r.studentId))
  const rows = [['Student ID','Name','Group','Advisor','Status','Time','Flag Reason']]
  for (const st of roster) {
    const sub = s.submissions.find(r => r.studentId === st.id)
    rows.push([st.id, st.name, st.group, st.advisor, presentIds.has(st.id) ? 'PRESENT' : flaggedIds.has(st.id) ? 'FLAGGED' : 'ABSENT', sub ? new Date(sub.timestamp).toLocaleTimeString() : '', sub?.reason || ''])
  }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
}
