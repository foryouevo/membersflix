'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Ban, CheckCircle2, Trash2, Plus, X } from 'lucide-react';
import {
  toggleBloqueioConta,
  atualizarStatusPagamento,
  toggleBloqueioCurso,
  desvincularCurso,
  vincularCurso,
  deletarAluno,
} from '@/app/admin/alunos/actions';
import type { AcessoCurso, Curso, Profile } from '@/types';
import { initials } from '@/lib/utils';

type AlunoRow = Profile & { acessos_curso: (AcessoCurso & { curso: Curso })[] };

export default function AlunosTable({ alunos, cursos }: { alunos: AlunoRow[]; cursos: Curso[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-on-variant">
            <th className="px-5 py-3 font-medium">Nome</th>
            <th className="px-5 py-3 font-medium">Email / Telefone</th>
            <th className="px-5 py-3 font-medium">Cursos</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((aluno) => (
            <AlunoRowItem
              key={aluno.id}
              aluno={aluno}
              cursos={cursos}
              expanded={expanded === aluno.id}
              onToggleExpand={() => setExpanded(expanded === aluno.id ? null : aluno.id)}
            />
          ))}
          {alunos.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-on-variant">
                Nenhum aluno cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AlunoRowItem({
  aluno,
  cursos,
  expanded,
  onToggleExpand,
}: {
  aluno: AlunoRow;
  cursos: Curso[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addingCurso, setAddingCurso] = useState('');

  const cursosVinculadosIds = new Set(aluno.acessos_curso.map((a) => a.curso_id));
  const cursosDisponiveis = cursos.filter((c) => !cursosVinculadosIds.has(c.id));

  function run(fn: () => Promise<any>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <>
      <tr className="border-b border-border/40 last:border-0 hover:bg-surface-container/50">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initials(aluno.nome)}
            </div>
            <span className="font-medium text-white">{aluno.nome}</span>
          </div>
        </td>
        <td className="px-5 py-4 text-on-variant">
          <div>{aluno.email}</div>
          {aluno.telefone && <div className="text-xs">{aluno.telefone}</div>}
        </td>
        <td className="px-5 py-4 text-on-variant">{aluno.acessos_curso.length} Cursos</td>
        <td className="px-5 py-4">
          <div className="flex flex-col gap-1">
            <StatusBadge status={aluno.status_pagamento} />
            {aluno.bloqueado ? (
              <span className="text-xs font-medium text-error">
                {aluno.status_pagamento === 'pendente' ? 'Trial expirado' : 'Conta bloqueada'}
              </span>
            ) : (
              aluno.status_pagamento === 'pendente' && <TrialCountdown liberadoEm={aluno.liberado_em} />
            )}
          </div>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <select
              value={aluno.status_pagamento}
              disabled={isPending}
              onChange={(e) => run(() => atualizarStatusPagamento(aluno.id, e.target.value as 'pendente' | 'pago'))}
              className="rounded border border-border bg-surface-lowest px-2 py-1 text-xs text-on-surface"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
            <button
              title={aluno.bloqueado ? 'Desbloquear conta' : 'Bloquear conta'}
              disabled={isPending}
              onClick={() => run(() => toggleBloqueioConta(aluno.id, !aluno.bloqueado))}
              className={aluno.bloqueado ? 'text-on-variant hover:text-white' : 'text-error hover:text-white'}
            >
              {aluno.bloqueado ? <CheckCircle2 size={18} /> : <Ban size={18} />}
            </button>
            <button
              title="Excluir aluno"
              disabled={isPending}
              onClick={() => {
                if (confirm(`Excluir ${aluno.nome}? Essa ação não pode ser desfeita.`)) run(() => deletarAluno(aluno.id));
              }}
              className="text-on-variant hover:text-error"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onToggleExpand} className="text-on-variant hover:text-white">
              <ChevronDown size={18} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border/40 bg-surface-lowest/60">
          <td colSpan={5} className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-variant">Acesso por curso</p>
            <div className="space-y-2">
              {aluno.acessos_curso.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded border border-border/60 px-3 py-2">
                  <span className="text-sm text-white">{a.curso?.titulo ?? 'Curso removido'}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${a.bloqueado ? 'text-error' : 'text-on-variant'}`}>
                      {a.bloqueado ? 'Bloqueado' : 'Liberado'}
                    </span>
                    <button
                      disabled={isPending}
                      onClick={() => run(() => toggleBloqueioCurso(a.id, !a.bloqueado))}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {a.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => run(() => desvincularCurso(a.id))}
                      className="text-on-variant hover:text-error"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {aluno.acessos_curso.length === 0 && <p className="text-sm text-on-variant">Nenhum curso vinculado.</p>}
            </div>

            {cursosDisponiveis.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <select
                  value={addingCurso}
                  onChange={(e) => setAddingCurso(e.target.value)}
                  className="rounded border border-border bg-surface-lowest px-2 py-1.5 text-xs text-on-surface"
                >
                  <option value="">Selecionar curso...</option>
                  {cursosDisponiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!addingCurso || isPending}
                  onClick={() => {
                    run(() => vincularCurso(aluno.id, addingCurso));
                    setAddingCurso('');
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-40"
                >
                  <Plus size={14} /> Vincular curso
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Estimativa no momento da renderização a partir de `liberado_em` (não é um
// contador ao vivo — atualiza quando a tabela recarrega, ex: após uma ação).
// A trava de verdade (o que de fato bloqueia o aluno) é o cron/middleware,
// isso aqui é só informativo pro admin ver quanto tempo falta.
const TRIAL_MINUTOS = 30;

function TrialCountdown({ liberadoEm }: { liberadoEm: string }) {
  const restanteMin = Math.max(
    Math.ceil((new Date(liberadoEm).getTime() + TRIAL_MINUTOS * 60 * 1000 - Date.now()) / 60000),
    0
  );
  return (
    <span className="text-xs font-medium text-secondary">
      {restanteMin > 0 ? `Trial: ${restanteMin}min restantes` : 'Trial expirando...'}
    </span>
  );
}

function StatusBadge({ status }: { status: 'pendente' | 'pago' }) {
  return (
    <span
      className={`w-fit rounded px-2 py-0.5 text-xs font-semibold ${
        status === 'pago' ? 'bg-primary/20 text-primary' : 'bg-secondary-container text-secondary'
      }`}
    >
      {status === 'pago' ? 'Pago' : 'Pendente'}
    </span>
  );
}
