'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, GripVertical, Pencil, Plus, X } from 'lucide-react';
import Modal from '@/components/Modal';
import type { Categoria, Curso, VitrineSecao, VitrineSecaoCurso } from '@/types';
import {
  criarSecao,
  atualizarSecao,
  deletarSecao,
  reordenarSecoes,
  adicionarCursoNaSecao,
  removerCursoDaSecao,
  reordenarCursosDaSecao,
} from '@/app/admin/vitrine/actions';

type SecaoRow = VitrineSecao & { cursos: (VitrineSecaoCurso & { curso: Curso })[] };

export default function VitrineManager({
  secoes,
  cursos,
  categorias,
}: {
  secoes: SecaoRow[];
  cursos: Curso[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(secoes[0]?.id ?? null);
  const [novaOpen, setNovaOpen] = useState(false);

  const selected = secoes.find((s) => s.id === selectedId) ?? null;

  function run(fn: () => Promise<any>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function moveSecao(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= secoes.length) return;
    const reordered = [...secoes];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    run(() => reordenarSecoes(reordered.map((s, i) => ({ id: s.id, ordem: i }))));
  }

  function moveCursoNaSecao(secao: SecaoRow, index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= secao.cursos.length) return;
    const reordered = [...secao.cursos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    run(() => reordenarCursosDaSecao(reordered.map((c, i) => ({ id: c.id, ordem: i }))));
  }

  const previewSecoes = useMemo(
    () =>
      secoes.map((s) => ({
        titulo: s.titulo,
        cursos: s.tipo === 'custom' ? s.cursos.map((c) => c.curso) : cursos.filter((c) => c.categoria_id === s.categoria_id),
      })),
    [secoes, cursos]
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciamento da Vitrine</h1>
          <p className="text-sm text-on-variant">Organize o layout de categorias e cursos para a visão do aluno.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr_360px]">
        {/* Categories Layout */}
        <div className="rounded-lg bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Layout de Categorias</h2>
            <button onClick={() => setNovaOpen(true)} className="text-primary hover:text-white">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {secoes.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 ${
                  selectedId === s.id ? 'border-primary bg-surface-high' : 'border-transparent bg-surface-lowest'
                }`}
              >
                <GripVertical size={14} className="text-on-variant" />
                <div className="flex-1">
                  <p className="text-sm text-white">{s.titulo}</p>
                  <p className="text-xs text-on-variant">{s.tipo === 'dinamica' ? 'Dinâmica' : s.tipo === 'continue_watching' ? 'Automática' : 'Personalizada'}</p>
                </div>
                <button disabled={isPending} onClick={(e) => { e.stopPropagation(); moveSecao(i, -1); }} className="text-on-variant hover:text-white">
                  <ChevronUp size={14} />
                </button>
                <button disabled={isPending} onClick={(e) => { e.stopPropagation(); moveSecao(i, 1); }} className="text-on-variant hover:text-white">
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const titulo = prompt('Novo título da seção:', s.titulo);
                    if (titulo) run(() => atualizarSecao(s.id, titulo, s.categoria_id));
                  }}
                  className="text-on-variant hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remover a seção "${s.titulo}"?`)) run(() => deletarSecao(s.id));
                  }}
                  className="text-on-variant hover:text-error"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {secoes.length === 0 && <p className="text-sm text-on-variant">Nenhuma seção criada ainda.</p>}
          </div>
        </div>

        {/* Courses in selected section */}
        <div className="rounded-lg bg-card p-4">
          {!selected ? (
            <p className="text-sm text-on-variant">Selecione uma seção para gerenciar os cursos.</p>
          ) : selected.tipo !== 'custom' ? (
            <>
              <h2 className="mb-1 text-sm font-semibold text-white">Cursos em &apos;{selected.titulo}&apos;</h2>
              <p className="mb-3 text-xs text-on-variant">
                Seção dinâmica — os cursos são preenchidos automaticamente pela categoria vinculada.
              </p>
              <div className="space-y-1.5">
                {(cursos.filter((c) => c.categoria_id === selected.categoria_id)).map((c) => (
                  <div key={c.id} className="rounded bg-surface-lowest px-3 py-2 text-sm text-on-surface">
                    {c.titulo}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Cursos em &apos;{selected.titulo}&apos;</h2>
              </div>
              <div className="space-y-1.5">
                {selected.cursos.map((sc, i) => (
                  <div key={sc.id} className="flex items-center gap-2 rounded bg-surface-lowest px-3 py-2">
                    <GripVertical size={14} className="text-on-variant" />
                    <span className="flex-1 text-sm text-on-surface">{sc.curso?.titulo}</span>
                    <button disabled={isPending} onClick={() => moveCursoNaSecao(selected, i, -1)} className="text-on-variant hover:text-white">
                      <ChevronUp size={14} />
                    </button>
                    <button disabled={isPending} onClick={() => moveCursoNaSecao(selected, i, 1)} className="text-on-variant hover:text-white">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => run(() => removerCursoDaSecao(sc.id))} className="text-on-variant hover:text-error">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {selected.cursos.length === 0 && <p className="text-sm text-on-variant">Nenhum curso adicionado.</p>}
              </div>

              <AddCursoNaSecao
                secaoId={selected.id}
                cursosDisponiveis={cursos.filter((c) => !selected.cursos.some((sc) => sc.curso_id === c.id))}
                proximaOrdem={selected.cursos.length}
              />
            </>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border/60 bg-surface-lowest p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-variant">Prévia do Aluno</p>
          <div className="max-h-[600px] space-y-5 overflow-y-auto rounded bg-background p-3">
            {previewSecoes.map((s) => (
              <div key={s.titulo}>
                <h3 className="mb-2 text-sm font-semibold text-white">{s.titulo}</h3>
                <div className="flex gap-2 overflow-x-auto">
                  {s.cursos.slice(0, 6).map((c) => (
                    <div key={c.id} className="w-28 shrink-0">
                      <div className="relative aspect-video overflow-hidden rounded bg-surface-high">
                        {c.thumbnail_url && <Image src={c.thumbnail_url} alt={c.titulo} fill className="object-cover" />}
                      </div>
                      <p className="mt-1 truncate text-xs text-on-variant">{c.titulo}</p>
                    </div>
                  ))}
                  {s.cursos.length === 0 && <p className="text-xs text-on-variant">Sem cursos.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NovaSecaoModal open={novaOpen} onClose={() => setNovaOpen(false)} categorias={categorias} ordem={secoes.length} />
    </div>
  );
}

function AddCursoNaSecao({
  secaoId,
  cursosDisponiveis,
  proximaOrdem,
}: {
  secaoId: string;
  cursosDisponiveis: Curso[];
  proximaOrdem: number;
}) {
  const router = useRouter();
  const [cursoId, setCursoId] = useState('');

  if (cursosDisponiveis.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-2">
      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className="input-field py-1.5 text-xs">
        <option value="">Selecionar curso...</option>
        {cursosDisponiveis.map((c) => (
          <option key={c.id} value={c.id}>
            {c.titulo}
          </option>
        ))}
      </select>
      <button
        disabled={!cursoId}
        onClick={async () => {
          await adicionarCursoNaSecao(secaoId, cursoId, proximaOrdem);
          setCursoId('');
          router.refresh();
        }}
        className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar Curso
      </button>
    </div>
  );
}

function NovaSecaoModal({
  open,
  onClose,
  categorias,
  ordem,
}: {
  open: boolean;
  onClose: () => void;
  categorias: Categoria[];
  ordem: number;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'dinamica' | 'custom'>('custom');
  const [categoriaId, setCategoriaId] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await criarSecao(titulo, tipo, tipo === 'dinamica' ? categoriaId || null : null, ordem);
    setLoading(false);
    setTitulo('');
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Seção da Vitrine">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Título</label>
          <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as 'dinamica' | 'custom')} className="input-field">
            <option value="custom">Personalizada (curadoria manual)</option>
            <option value="dinamica">Dinâmica (por categoria)</option>
          </select>
        </div>
        {tipo === 'dinamica' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Categoria</label>
            <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="input-field">
              <option value="">Selecionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar Seção'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
