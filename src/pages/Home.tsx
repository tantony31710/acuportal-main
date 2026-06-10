import { Link, useNavigate } from 'react-router-dom'
import { useIsTeacher } from '@/lib/auth'
import { useEffect } from 'react'

export function Home() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()
  useEffect(() => { if (teacher === true) navigate('/teacher') }, [teacher])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h1 className="font-display text-5xl font-bold text-white sm:text-6xl">Anti-Proxy Attendance</h1>
          <p className="mt-4 text-lg text-slate-300">PIN-gated sessions with device fingerprinting and real-time audit logs</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <Link to="/check-in" className="group rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 to-emerald-900 p-8 transition hover:border-emerald-400/50 hover:shadow-xl hover:shadow-emerald-500/20">
            <div className="text-4xl">🎓</div>
            <h2 className="mt-4 text-2xl font-bold text-white">Student Check-In</h2>
            <p className="mt-2 text-emerald-100">Enter your Student ID and the 4-digit PIN your instructor provides.</p>
            <div className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition group-hover:bg-emerald-500">Check In →</div>
          </Link>
          <Link to="/auth" className="group rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-blue-900 p-8 transition hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-500/20">
            <div className="text-4xl">👨‍🏫</div>
            <h2 className="mt-4 text-2xl font-bold text-white">Teacher Dashboard</h2>
            <p className="mt-2 text-blue-100">Start a session, manage PINs, and monitor real-time attendance.</p>
            <div className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition group-hover:bg-blue-500">Sign In →</div>
          </Link>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[['🔐','One-Time PINs','Generate 6-digit session codes that expire automatically.'],['📱','Device Fingerprints','Detect shared devices and proxy attendance attempts.'],['📊','Live Audit','Monitor present, flagged, and absent submissions in real time.']].map(([icon,title,desc]) => (
            <div key={title} className="rounded-xl bg-slate-700/30 p-6 backdrop-blur">
              <div className="text-2xl">{icon}</div>
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
