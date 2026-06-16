import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supports both legacy JWT keys (eyJ...) and new sb_publishable_ format
export const SUPABASE_CONFIGURED =
  !!(supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('placeholder'))

if (!SUPABASE_CONFIGURED) {
  console.warn(
    '⚠️  Supabase not configured — running in demo mode.\n' +
    '    Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
} else {
  console.log('✅ Supabase connected:', supabaseUrl)
}

export const supabase = createClient(
  supabaseUrl     || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)

// ── Auth helpers ─────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data.user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => subscription.unsubscribe()
}

// ── Database helpers ─────────────────────────────────────────

export async function loadChildren(userId) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function saveChild(userId, child) {
  const { data, error } = await supabase
    .from('children')
    .upsert({ ...child, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteChild(childId) {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', childId)
  if (error) throw error
}

export async function loadVideos(userId) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
