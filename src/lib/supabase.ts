import { createClient } from '@supabase/supabase-js'

// Try reading with and without the VITE_ prefix to prevent Vercel connection drops
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  (import.meta.env as any).SUPABASE_URL || 
  'https://beefbianpgvjmzsdkwvd.supabase.co'

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (import.meta.env as any).SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZWZiaWFucGd2am16c2Rrd3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Nzk0NjcsImV4cCI6MjA5NjE1NTQ2N30.E_mxSnW-CaUfz9a7KkCjimN1LLCEuLWlHH-34956_YU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // Wipes token context automatically when browser tab finishes or closes
    autoRefreshToken: true,
    persistSession: true
  }
})
