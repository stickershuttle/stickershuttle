import { getSupabase } from './supabase'

export async function getUser() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  const supabase = await getSupabase()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = await getSupabase()
  return supabase.auth.onAuthStateChange(callback)
}

export async function resetPassword(email: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  return { error }
}

export async function updatePassword(password: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.auth.updateUser({
    password: password
  })
  return { error }
} 