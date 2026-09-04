import { createClient } from '@/lib/supabase/server';
import VitrineManager from '@/components/admin/VitrineManager';

export default async function VitrinePage() {
  const supabase = createClient();

  const [{ data: secoes }, { data: cursos }, { data: categorias }] = await Promise.all([
    supabase.from('vitrine_secoes').select('*, cursos:vitrine_secao_cursos(*, curso:cursos(*))').order('ordem'),
    supabase.from('cursos').select('*').order('titulo'),
    supabase.from('categorias').select('*').order('ordem'),
  ]);

   const secoesOrdenadas = (secoes ?? []).map((s: any) => ({
    ...s,
    cursos: (s.cursos ?? []).sort((a: any, b: any) => a.ordem - b.ordem),
  }));

  return <VitrineManager secoes={secoesOrdenadas as any} cursos={cursos ?? []} categorias={categorias ?? []} />;
}
