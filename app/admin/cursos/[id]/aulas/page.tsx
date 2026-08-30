import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AulasManager from '@/components/admin/AulasManager';

export default async function GerenciarAulasPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: curso }, { data: modulos }] = await Promise.all([
    supabase.from('cursos').select('*').eq('id', params.id).maybeSingle(),
    supabase
      .from('modulos')
      .select('*, aulas(*, documentos(*))')
      .eq('curso_id', params.id)
      .order('ordem'),
  ]);

  if (!curso) notFound();

  const modulosOrdenados = (modulos ?? []).map((m) => ({
    ...m,
    aulas: (m.aulas ?? []).sort((a: any, b: any) => a.ordem - b.ordem),
  }));

  return <AulasManager curso={curso} modulos={modulosOrdenados as any} />;
}
