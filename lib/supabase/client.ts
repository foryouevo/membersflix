'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types';

// Último erro que o client do Supabase teve ao trocar automaticamente o
// ?code= (PKCE) da URL por uma sessão, ao iniciar. O client faz essa troca
// SOZINHO (o @supabase/ssr força detectSessionInUrl=true e não dá pra
// desligar) e engole o erro — só o emite no canal de debug. Capturamos aqui
// pra a tela de login poder mostrar/logar o motivo real quando o link de
// redefinição de senha não funciona (ver LoginPageClient).
export type ErroRetornoUrl = { code?: string; name?: string; message: string };
let ultimoErroRetornoUrl: ErroRetornoUrl | null = null;
export function lerErroRetornoUrl() {
  return ultimoErroRetornoUrl;
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        debug: (...args: unknown[]) => {
          if (!args.includes('error detecting session from URL')) return;
          const erro = args.find((a): a is { message: string; code?: string; name?: string } => !!a && typeof a === 'object' && 'message' in a);
          if (erro) ultimoErroRetornoUrl = { code: erro.code, name: erro.name, message: erro.message };
        },
      },
    }
  );
}
