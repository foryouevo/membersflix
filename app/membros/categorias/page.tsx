import { createClient } from '@/lib/supabase/server';
import CategoriasClient from '@/components/membros/CategoriasClient';

export default async function CategoriasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: categorias }, { data: cursos }, { data: acessosRaw }, { data: config }] = await Promise.all([
    supabase.from('categorias').select('*').order('ordem'),
    supabase.from('cursos').select('*').eq('status', 'active').order('ordem'),
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user!.id),
supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle() as any,
  ]);

const acessos = Object.fromEntries((acessosRaw ?? []).map((a: any) => [a.curso_id, !a.bloqueado]));

  const secoes = (categorias ?? [])
  .map((c: any) => ({ titulo: c.nome, cursos: (cursos ?? []).filter((curso: any) => curso.categoria_id === c.id) }))
    .filter((s) => s.cursos.length > 0);

  return <CategoriasClient secoes={secoes} acessos={acessos} numeroWhatsapp={config?.numero_whatsapp ?? null} />;
}
