import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useIsTeacher(): boolean | null {
  const [state, setState] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
  try {
    const { data: u } = await supabase.auth.getUser()
    
    // Add these lines right here inside the existing function:
    console.log("--- SYSTEM AUTH CHECK ---")
    console.log("Logged-in Email is:", u.user?.email)
    console.log("Logged-in ID is:", u.user?.id)
    
    if (!u.user) { if (!cancelled) setState(false); return }
    
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', u.user.id).maybeSingle()
    if (!cancelled) setState(data?.role === 'teacher')
  } catch (e) { 
    if (!cancelled) setState(false) 
  }

  }

    check()

    // Listen for clear explicit authentication events
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
        check()
      }
    })

    return () => {
      cancelled = true
      if (sub?.subscription) {
        sub.subscription.unsubscribe()
      }
    }
  }, [])

  return state
}

export async function revokeTeacher() { await supabase.auth.signOut() }
