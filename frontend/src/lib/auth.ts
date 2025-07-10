import { getSupabase } from './supabase'
import { getCanonicalUrl } from '../utils/url'

export async function getUser() {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = getSupabase()
  return supabase.auth.onAuthStateChange(callback)
}

export async function resetPassword(email: string) {
  const supabase = getSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://stickershuttle.com/reset-password'
  })
  return { error }
}

export async function updatePassword(password: string) {
  const supabase = getSupabase()
  const { error } = await supabase.auth.updateUser({
    password: password
  })
  return { error }
} 