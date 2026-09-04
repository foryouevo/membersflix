import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import CursoDetalheClient from '@/components/membros/CursoDetalheClient';

export default async function CursoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // categoria:categorias(*) — junta a categoria real do curso (usada no badge
  // do hero); antes a query só trazia categoria_id, então curso.categoria
  // nunca vinha preenchido apesar do tipo Curso já prever esse campo.
  const { data: curso } = await supabase.from('cursos').select('*, categoria:categorias(*)').eq('id', params.id).maybeSingle();
  if (!curso) notFound();

  const { data: acesso } = await supabase
    .from('acessos_curso')
    .select('bloqueado')
    .eq('aluno_id', user!.id)
    .eq('curso_id', params.id)
   .maybeSingle() as any;

  const hasAccess = !!acesso && !acesso.bloqueado;

   const { data: config } = await supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle() as any;

  let modulos: any[] = [];
  let jaComecou = false;
  // Durante o trial de 30min (status_pagamento = 'pendente'), só o módulo de
  // menor `ordem` fica acessível — calculado aqui só pro cadeado visual dos
  // outros módulos. A trava de verdade é a RLS de `aulas`/`documentos` (ver
  // supabase/migrations/004_trial_30min_modulo1.sql): mesmo que o aluno
  // acesse a URL de uma aula de outro módulo direto, a query volta vazia.
  let trialModuloUnicoId: string | null = null;

  if (hasAccess) {
    const { data } = await supabase
      .from('modulos')
      .select('*, aulas(*, documentos(*))')
      .eq('curso_id', params.id)
      .order('ordem');
    modulos = data ?? [];

    const { data: progresso } = await supabase
      .from('progresso_aulas')
      .select('aula_id, concluida')
      .eq('aluno_id', user!.id)
      .eq('curso_id', params.id);
const concluidaPorAula = new Map((progresso ?? []).map((p: any) => [p.aula_id, p.concluida]));
    jaComecou = (progresso?.length ?? 0) > 0;

    modulos = modulos.map((m) => ({
      ...m,
      aulas: (m.aulas ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((a: any) => ({ ...a, concluida: concluidaPorAula.get(a.id) ?? false })),
    }));
  } else {
    // Estrutura só com títulos (sem video_url/documentos) para exibir o índice mesmo sem acesso.
    const admin = createAdminClient();
    const { data } = await admin
      .from('modulos')
      .select('id, curso_id, titulo, capa_url, ordem, modulo_pai_id, aulas(id, titulo, ordem, duracao_segundos)')
      .eq('curso_id', params.id)
      .order('ordem');
    modulos = (data ?? []).map((m: any) => ({
      ...m,
      aulas: (m.aulas ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((a: any) => ({ ...a, documentos: [], concluida: false })),
    }));
  }

  // Diferente da versão anterior: módulo "pai" (guarda-chuva, ex: "[02]
  // Filmmaking Avançado") continua na lista passada pro client — é o
  // CursoDetalheClient quem decide como agrupar visualmente (seção própria
  // por pai, com os filhos no carrossel dela). Aqui só o cálculo do trial
  // precisa ignorar os pais: eles nunca têm aula própria, então não fazem
  // sentido como "o Módulo 1 liberado" (mesma regra de sempre, só isolada
  // numa lista à parte em vez de filtrar a lista principal).
  if (hasAccess) {
    const { data: profile } = (await supabase.from('profiles').select('status_pagamento').eq('id', user!.id).maybeSingle()) as {
      data: { status_pagamento: string } | null;
    };
    if (profile?.status_pagamento === 'pendente') {
      const idsComFilho = new Set(modulos.map((m) => m.modulo_pai_id).filter(Boolean));
      const folhas = modulos.filter((m) => !idsComFilho.has(m.id));
      if (folhas.length > 0) {
        trialModuloUnicoId = folhas.reduce((min: any, m: any) => (m.ordem < min.ordem ? m : min), folhas[0]).id;
      }
    }
  }

  const todasAulas = modulos.flatMap((m) => m.aulas);
  const totalAulas = todasAulas.length;
  const concluidas = todasAulas.filter((a: any) => a.concluida).length;
  const proximaAula = todasAulas.find((a: any) => !a.concluida) ?? todasAulas[0] ?? null;

  return (
    <CursoDetalheClient
      curso={curso}
      hasAccess={hasAccess}
      modulos={modulos}
      trialModuloUnicoId={trialModuloUnicoId}
      totalAulas={totalAulas}
      concluidas={concluidas}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
      proximaAulaId={proximaAula?.id ?? null}
      jaComecou={jaComecou}
    />
  );
}
