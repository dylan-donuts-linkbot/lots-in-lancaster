import { createClient } from '@supabase/supabase-js'

let supabaseServerInstance: any = null

export function getSupabaseServer() {
  if (!supabaseServerInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

    supabaseServerInstance = createClient(supabaseUrl, supabaseServiceRoleKey)
  }

  return supabaseServerInstance
}

export const supabaseServer: any = getSupabaseServer()
