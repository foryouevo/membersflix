import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

// Cliente com service_role — SOMENTE server-side (server actions / route handlers).
// Ignora RLS. Nunca importar em componente cliente.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
