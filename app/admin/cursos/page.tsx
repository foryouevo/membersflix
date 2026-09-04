import { createClient } from '@/lib/supabase/server';
import CursosGrid from '@/components/admin/CursosGrid';

export default async function CursosPage() {
  const supabase = createClient();

  const [{ data: cursos }, { data: categorias }, { data: modulos }] = await Promise.all([
    supabase.from('cursos').select('*, categoria:categorias(*)').order('created_at', { ascending: false }),
    supabase.from('categorias').select('*').order('ordem'),
    supabase.from('modulos').select('id, curso_id'),
  ]);

  const modulosPorCurso = new Map<string, number>();
   for (const m of (modulos ?? []) as any[]) {
    modulosPorCurso.set(m.curso_id, (modulosPorCurso.get(m.curso_id) ?? 0) + 1);
  }

const cursosComContagem = (cursos ?? []).map((c: any) => ({ ...c, modulos_count: modulosPorCurso.get(c.id) ?? 0 }));

  return <CursosGrid cursos={cursosComContagem as any} categorias={categorias ?? []} />;
}
