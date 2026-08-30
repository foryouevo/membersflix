import { createClient } from '@/lib/supabase/server';
import AlunosPageClient from '@/components/admin/AlunosPageClient';

export default async function AlunosPage() {
  const supabase = createClient();

  const [{ data: alunos }, { data: cursos }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, acessos_curso(*, curso:cursos(*))')
      .eq('tipo', 'aluno')
      .order('created_at', { ascending: false }),
    supabase.from('cursos').select('*').order('titulo'),
  ]);

  return <AlunosPageClient alunos={(alunos as any) ?? []} cursos={cursos ?? []} />;
}
