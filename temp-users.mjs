import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const senha = 'VerifTemp!2026x';
const { data: alunoUser, error } = await admin.auth.admin.createUser({
  email: 'temp-verify-aluno@membersflix.local',
  password: senha,
  email_confirm: true,
  user_metadata: { nome: 'Verif Aluno', tipo: 'aluno', status_pagamento: 'pago' },
});
if (error) throw error;
console.log('ok');
