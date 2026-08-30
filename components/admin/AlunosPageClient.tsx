'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import AlunosTable from '@/components/admin/AlunosTable';
import NovoAlunoModal from '@/components/admin/NovoAlunoModal';
import type { AcessoCurso, Curso, Profile } from '@/types';

type AlunoRow = Profile & { acessos_curso: (AcessoCurso & { curso: Curso })[] };

export default function AlunosPageClient({ alunos, cursos }: { alunos: AlunoRow[]; cursos: Curso[] }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return alunos;
    return alunos.filter((a) => a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [alunos, busca]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alunos</h1>
          <p className="text-sm text-on-variant">Gerencie os alunos matriculados na plataforma.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Aluno
        </button>
      </div>

      <div className="relative mb-4 w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-variant" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aluno..."
          className="input-field py-2 pl-9 text-sm"
        />
      </div>

      <AlunosTable alunos={filtrados} cursos={cursos} />

      <NovoAlunoModal open={open} onClose={() => setOpen(false)} cursos={cursos} />
    </div>
  );
}
