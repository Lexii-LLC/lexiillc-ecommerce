import { createClient } from '@/lib/supabase/server'

/**
 * Helper to get user ID from server-side request
 * Works with Supabase authentication via cookies
 */
export async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user?.id || null
  } catch (error) {
    // Request is not authenticated or authentication failed
    // This is expected for unauthenticated users
    return null
  }
}
