import { z } from 'zod'
import rosterData from './roster-data.json'

const OVERRIDE_KEY = 'ap_roster_override_v1'

export const StudentSchema = z.object({
  id: z.string().trim().regex(/^\d{6,12}$/, 'Student ID must be 6–12 digits'),
  name: z.string().trim().min(2).max(120),
  group: z.enum(['G1', 'G2', 'G3', 'G4']),
  advisor: z.string().trim().min(2).max(200),
})

export type ValidStudent = z.infer<typeof StudentSchema>
export const GROUPS = ['G1', 'G2', 'G3', 'G4'] as const
export type Group = typeof GROUPS[number] | 'ALL'

export type RosterIssue = { rowIndex: number; studentId?: string; field: string; message: string }
export type RosterValidationResult =
  | { ok: true; data: ValidStudent[] }
  | { ok: false; issues: RosterIssue[]; partial: ValidStudent[] }

export function validateRoster(raw: unknown): RosterValidationResult {
  const issues: RosterIssue[] = []
  const partial: ValidStudent[] = []
  if (!Array.isArray(raw)) return { ok: false, partial, issues: [{ rowIndex: -1, field: '<root>', message: 'Must be an array' }] }
  const seen = new Set<string>()
  raw.forEach((row, i) => {
    const result = StudentSchema.safeParse(row)
    if (!result.success) {
      for (const err of result.error.issues)
        issues.push({ rowIndex: i, studentId: typeof (row as any).id === 'string' ? (row as any).id : undefined, field: err.path.join('.') || '<row>', message: err.message })
      return
    }
    if (seen.has(result.data.id)) { issues.push({ rowIndex: i, studentId: result.data.id, field: 'id', message: `Duplicate ID ${result.data.id}` }); return }
    seen.add(result.data.id)
    partial.push(result.data)
  })
  return issues.length > 0 ? { ok: false, issues, partial } : { ok: true, data: partial }
}

function loadOverride(): unknown | null {
  try { const r = localStorage.getItem(OVERRIDE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

export function saveRosterOverride(data: unknown) { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data)) }
export function clearRosterOverride() { localStorage.removeItem(OVERRIDE_KEY) }
export function hasRosterOverride(): boolean { return !!localStorage.getItem(OVERRIDE_KEY) }

const validation = validateRoster(loadOverride() ?? rosterData)
export const ROSTER: ValidStudent[] = validation.ok ? validation.data : (validation as any).partial
