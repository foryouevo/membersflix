'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import CursoFormModal from '@/components/admin/CursoFormModal';
import { toggleStatusCurso } from '@/app/admin/cursos/actions';
import type { Categoria, Curso } from '@/types';

type CursoRow = Curso & { categoria?: Categoria | null; modulos_count?: number };

export default function CursosGrid({ cursos, categorias }: { cursos: CursoRow[]; categorias: Categoria[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciamento de Cursos</h1>
          <p className="text-sm text-on-variant">Gerencie e organize o currículo da sua plataforma.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Novo Curso
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cursos.map((curso) => (
          <div key={curso.id} className="group overflow-hidden rounded-lg bg-card">
            <div className="relative aspect-video bg-surface-high">
              {curso.thumbnail_url ? (
                <Image src={curso.thumbnail_url} alt={curso.titulo} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-on-variant">Sem imagem</div>
              )}
              <span
                className={`absolute right-2 top-2 rounded px-2 py-0.5 text-xs font-semibold ${
                  curso.status === 'active' ? 'bg-primary text-white' : 'bg-surface-highest text-on-variant'
                }`}
              >
                {curso.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {curso.categoria?.nome ?? 'Sem categoria'}
              </p>
              <h3 className="font-semibold text-white">{curso.titulo}</h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-on-variant">{curso.modulos_count ?? 0} Módulos</span>
                <div className="flex items-center gap-3">
                  <button
                    title="Editar"
                    onClick={() => {
                      setEditing(curso);
                      setOpen(true);
                    }}
                    className="text-on-variant hover:text-white"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    title={curso.status === 'active' ? 'Desativar' : 'Ativar'}
                    onClick={async () => {
                      await toggleStatusCurso(curso.id, curso.status === 'active' ? 'inactive' : 'active');
                      router.refresh();
                    }}
                    className="text-on-variant hover:text-white"
                  >
                    {curso.status === 'active' ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
              <Link
                href={`/admin/cursos/${curso.id}/aulas`}
                className="mt-3 block text-center text-xs font-semibold text-primary hover:underline"
              >
                Gerenciar aulas →
              </Link>
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-on-variant hover:border-primary hover:text-primary sm:aspect-auto sm:min-h-[240px]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high">
            <Plus size={22} />
          </div>
          Criar Novo Curso
        </button>
      </div>

      {/* key força remontar o modal ao trocar de curso, pra não herdar estado do curso editado anteriormente */}
      <CursoFormModal key={editing?.id ?? 'novo'} open={open} onClose={() => setOpen(false)} categorias={categorias} curso={editing} />
    </div>
  );
}
