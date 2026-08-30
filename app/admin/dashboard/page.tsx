import { createClient } from '@/lib/supabase/server';
import AdminTopbar from '@/components/admin/AdminTopbar';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from('profiles').select('nome, avatar_url').eq('id', user!.id).single();

  const [{ count: totalAlunos }, { count: alunosPagos }, { count: totalCursos }, { data: categorias }, { data: acessos }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tipo', 'aluno'),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'aluno')
        .eq('status_pagamento', 'pago'),
      supabase.from('cursos').select('*', { count: 'exact', head: true }),
      supabase.from('categorias').select('id, nome').order('ordem'),
      supabase.from('acessos_curso').select('aluno_id, curso:cursos(categoria_id)').eq('bloqueado', false),
    ]);

  const porCategoria = new Map<string, Set<string>>();
  for (const a of acessos ?? []) {
    const catId = (a as any).curso?.categoria_id;
    if (!catId) continue;
    if (!porCategoria.has(catId)) porCategoria.set(catId, new Set());
    porCategoria.get(catId)!.add((a as any).aluno_id);
  }

  const niche = (categorias ?? []).map((c) => ({ nome: c.nome, total: porCategoria.get(c.id)?.size ?? 0 }));
  const max = Math.max(1, ...niche.map((n) => n.total));

  return (
    <>
      <AdminTopbar profile={me!} />
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        <p className="mb-6 text-sm text-on-variant">Métricas e informações da plataforma.</p>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="TOTAL ALUNOS" value={totalAlunos ?? 0} />
          <StatCard label="ALUNOS PAGOS" value={alunosPagos ?? 0} />
          <StatCard label="TOTAL CURSOS" value={totalCursos ?? 0} />
        </div>

        <div className="rounded-lg bg-card p-6">
          <h2 className="text-base font-semibold text-white">Alunos por Nicho</h2>
          <p className="mb-6 text-xs text-on-variant">Distribuição entre as principais categorias</p>

          <div className="flex h-48 items-end gap-6">
            {niche.length === 0 && <p className="text-sm text-on-variant">Nenhuma categoria cadastrada.</p>}
            {niche.map((n) => (
              <div key={n.nome} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[48px] rounded-t bg-gradient-to-t from-primary to-primary/60"
                  style={{ height: `${(n.total / max) * 100}%`, minHeight: n.total > 0 ? 6 : 2 }}
                  title={`${n.total} alunos`}
                />
                <span className="text-xs text-on-variant">{n.nome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-card p-5">
      <p className="text-xs font-medium tracking-wide text-on-variant">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}
