'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Plus,
  GripVertical,
  FolderInput,
  FileText,
  X,
} from 'lucide-react';
import Modal from '@/components/Modal';
import ModuloFormModal from '@/components/admin/ModuloFormModal';
import type { Aula, Curso, Documento, Modulo } from '@/types';
import {
  deletarModulo,
  reordenarModulos,
  criarAula,
  atualizarAula,
  deletarAula,
  reordenarAulas,
  adicionarDocumento,
  removerDocumento,
  importarDoDrive,
} from '@/app/admin/cursos/[id]/aulas/actions';
import { formatDuration } from '@/lib/utils';

type ModuloComAulas = Modulo & { aulas: (Aula & { documentos: Documento[] })[] };

export default function AulasManager({ curso, modulos }: { curso: Curso; modulos: ModuloComAulas[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedAula, setSelectedAula] = useState<(Aula & { documentos: Documento[] }) | null>(null);
  const [openModuloId, setOpenModuloId] = useState<string | null>(modulos[0]?.id ?? null);
  // Módulos-pai (guarda-chuva) começam recolhidos: só mostram os submódulos
  // (cada um com seu próprio toggle de aulas, acima) quando o admin abre.
  const [openPaiId, setOpenPaiId] = useState<string | null>(null);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [moduloModalOpen, setModuloModalOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);

  function run(fn: () => Promise<any>, after?: (result: any) => void) {
    startTransition(async () => {
      const result = await fn();
      router.refresh();
      after?.(result);
    });
  }

  function handleAddAula(moduloId: string, ordem: number) {
    run(() =>
      criarAula(moduloId, curso.id, {
        titulo: 'Nova Aula',
        video_origem: 'url_externa',
        ordem,
      })
    );
  }

  // Reordena dentro de UM grupo de irmãos só (raiz, ou os filhos de um pai
  // específico) — nunca a lista inteira, senão mover um submódulo bagunçaria
  // a ordem dos módulos raiz também.
  function moveModulo(grupo: ModuloComAulas[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= grupo.length) return;
    const reordered = [...grupo];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    run(() => reordenarModulos(curso.id, reordered.map((m, i) => ({ id: m.id, ordem: i }))));
  }

  function moveAula(modulo: ModuloComAulas, index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= modulo.aulas.length) return;
    const reordered = [...modulo.aulas];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    run(() => reordenarAulas(curso.id, reordered.map((a, i) => ({ id: a.id, ordem: i }))));
  }

  // Agrupa a lista flat em raiz + filhos-por-pai. Um módulo só é tratado como
  // "pai" se tiver pelo menos um filho de verdade (modulo_pai_id apontando
  // pra ele) — módulos raiz sem filho continuam exatamente como antes.
  const modulosRaiz = modulos.filter((m) => !m.modulo_pai_id);
  const filhosPorPai = new Map<string, ModuloComAulas[]>();
  for (const m of modulos) {
    if (m.modulo_pai_id) {
      const lista = filhosPorPai.get(m.modulo_pai_id) ?? [];
      lista.push(m);
      filhosPorPai.set(m.modulo_pai_id, lista);
    }
  }

  function abrirEdicaoModulo(modulo: Modulo) {
    setEditingModulo(modulo);
    setModuloModalOpen(true);
  }

  function excluirModulo(modulo: Modulo, filhos: ModuloComAulas[]) {
    const mensagem =
      filhos.length > 0
        ? `Excluir o módulo-pai "${modulo.titulo}" e todos os seus ${filhos.length} submódulos (com as aulas deles)?`
        : `Excluir o módulo "${modulo.titulo}" e todas as suas aulas?`;
    if (confirm(mensagem)) run(() => deletarModulo(modulo.id, curso.id));
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-on-variant">Gerenciamento de Aulas</p>
          <h1 className="text-2xl font-bold text-white">{curso.titulo}</h1>
          <p className="text-sm text-on-variant">Organize o conteúdo e os módulos do curso.</p>
        </div>
        <button onClick={() => setDriveModalOpen(true)} className="btn-secondary flex items-center gap-2">
          <FolderInput size={16} /> Importar do Google Drive
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {modulosRaiz.map((modulo, mIndex) => {
            const filhos = filhosPorPai.get(modulo.id) ?? [];

            if (filhos.length > 0) {
              return (
                <div key={modulo.id} className="overflow-hidden rounded-lg bg-card">
                  {/* Cabeçalho do módulo-pai: não tem toggle de aulas próprio
                      (não tem aula própria) — o chevron aqui abre/fecha a
                      lista de submódulos. */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <GripVertical size={16} className="text-on-variant" />
                    <button
                      onClick={() => setOpenPaiId(openPaiId === modulo.id ? null : modulo.id)}
                      className="flex flex-1 items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2 font-semibold text-white">
                        {modulo.titulo}
                        <span className="rounded-full bg-surface-high px-2 py-0.5 text-[0.65rem] font-medium text-on-variant">
                          {filhos.length} submódulo{filhos.length > 1 ? 's' : ''}
                        </span>
                      </span>
                      {openPaiId === modulo.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <div className="flex items-center gap-1">
                      <button disabled={isPending} onClick={() => moveModulo(modulosRaiz, mIndex, -1)} className="text-on-variant hover:text-white">
                        <ChevronUp size={16} />
                      </button>
                      <button disabled={isPending} onClick={() => moveModulo(modulosRaiz, mIndex, 1)} className="text-on-variant hover:text-white">
                        <ChevronDown size={16} />
                      </button>
                      <button onClick={() => abrirEdicaoModulo(modulo)} className="p-1 text-on-variant hover:text-white">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => excluirModulo(modulo, filhos)} className="p-1 text-on-variant hover:text-error">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {openPaiId === modulo.id && (
                    <div className="space-y-2 border-t border-border/40 bg-surface-lowest/60 p-2 pl-6">
                      {filhos.map((filho, fIndex) => (
                        <ModuloBloco
                          key={filho.id}
                          modulo={filho}
                          isPending={isPending}
                          openModuloId={openModuloId}
                          setOpenModuloId={setOpenModuloId}
                          selectedAulaId={selectedAula?.id ?? null}
                          setSelectedAula={setSelectedAula}
                          onMoveUp={() => moveModulo(filhos, fIndex, -1)}
                          onMoveDown={() => moveModulo(filhos, fIndex, 1)}
                          onEdit={() => abrirEdicaoModulo(filho)}
                          onDelete={() => excluirModulo(filho, [])}
                          onMoveAula={(aIndex, dir) => moveAula(filho, aIndex, dir)}
                          onDeleteAula={(aula) => {
                            if (confirm(`Excluir a aula "${aula.titulo}"?`)) run(() => deletarAula(aula.id, curso.id));
                          }}
                          onAddAula={() => handleAddAula(filho.id, filho.aulas.length)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={modulo.id} className="overflow-hidden rounded-lg bg-card">
                <ModuloBloco
                  modulo={modulo}
                  isPending={isPending}
                  openModuloId={openModuloId}
                  setOpenModuloId={setOpenModuloId}
                  selectedAulaId={selectedAula?.id ?? null}
                  setSelectedAula={setSelectedAula}
                  onMoveUp={() => moveModulo(modulosRaiz, mIndex, -1)}
                  onMoveDown={() => moveModulo(modulosRaiz, mIndex, 1)}
                  onEdit={() => abrirEdicaoModulo(modulo)}
                  onDelete={() => excluirModulo(modulo, [])}
                  onMoveAula={(aIndex, dir) => moveAula(modulo, aIndex, dir)}
                  onDeleteAula={(aula) => {
                    if (confirm(`Excluir a aula "${aula.titulo}"?`)) run(() => deletarAula(aula.id, curso.id));
                  }}
                  onAddAula={() => handleAddAula(modulo.id, modulo.aulas.length)}
                />
              </div>
            );
          })}

          <button
            onClick={() => {
              setEditingModulo(null);
              setModuloModalOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm text-on-variant hover:border-primary hover:text-primary"
          >
            <Plus size={16} /> Adicionar Módulo
          </button>
        </div>

        <div>
          {selectedAula ? (
            <EditAulaPanel
              key={selectedAula.id}
              cursoId={curso.id}
              aula={selectedAula}
              onSaved={() => run(() => Promise.resolve())}
              onClose={() => setSelectedAula(null)}
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg bg-card p-6 text-center text-sm text-on-variant">
              Selecione uma aula para editar.
            </div>
          )}
        </div>
      </div>

      <DriveImportModal
        open={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        cursoId={curso.id}
        defaultFolderId={curso.drive_folder_id ?? ''}
      />

      {/* key força remontar ao trocar de módulo, pra não herdar estado do módulo editado antes */}
      <ModuloFormModal
        key={editingModulo?.id ?? 'novo'}
        open={moduloModalOpen}
        onClose={() => setModuloModalOpen(false)}
        cursoId={curso.id}
        ordem={modulos.length}
        modulo={editingModulo}
      />
    </div>
  );
}

/**
 * Um módulo-folha (com aula própria): cabeçalho + lista expansível de aulas.
 * Reaproveitado tanto pros módulos raiz quanto pros submódulos dentro de um
 * módulo-pai aberto (mesmo bloco visual, só que o pai o indenta/aninha).
 */
function ModuloBloco({
  modulo,
  isPending,
  openModuloId,
  setOpenModuloId,
  selectedAulaId,
  setSelectedAula,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onMoveAula,
  onDeleteAula,
  onAddAula,
}: {
  modulo: ModuloComAulas;
  isPending: boolean;
  openModuloId: string | null;
  setOpenModuloId: (id: string | null) => void;
  selectedAulaId: string | null;
  setSelectedAula: (aula: Aula & { documentos: Documento[] }) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveAula: (index: number, dir: -1 | 1) => void;
  onDeleteAula: (aula: Aula) => void;
  onAddAula: () => void;
}) {
  const aberto = openModuloId === modulo.id;

  return (
    <div className="overflow-hidden rounded-lg bg-card">
      <div className="flex items-center gap-2 px-4 py-3">
        <GripVertical size={16} className="text-on-variant" />
        <button
          onClick={() => setOpenModuloId(aberto ? null : modulo.id)}
          className="flex flex-1 items-center justify-between text-left"
        >
          <span className="font-semibold text-white">{modulo.titulo}</span>
          {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <div className="flex items-center gap-1">
          <button disabled={isPending} onClick={onMoveUp} className="text-on-variant hover:text-white">
            <ChevronUp size={16} />
          </button>
          <button disabled={isPending} onClick={onMoveDown} className="text-on-variant hover:text-white">
            <ChevronDown size={16} />
          </button>
          <button onClick={onEdit} className="p-1 text-on-variant hover:text-white">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1 text-on-variant hover:text-error">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {aberto && (
        <div className="border-t border-border/40">
          {modulo.aulas.map((aula, aIndex) => (
            <button
              key={aula.id}
              onClick={() => setSelectedAula(aula)}
              className={`flex w-full items-center gap-3 border-b border-border/30 px-4 py-2.5 text-left last:border-0 hover:bg-surface-container ${
                selectedAulaId === aula.id ? 'bg-surface-high' : ''
              }`}
            >
              <GripVertical size={14} className="text-on-variant" />
              <div className="flex-1">
                <p className="text-sm text-white">
                  {aIndex + 1}. {aula.titulo}
                </p>
                <p className="text-xs text-on-variant">
                  {aula.video_origem === 'drive' ? 'Drive' : aula.video_origem === 'upload' ? 'Hospedado' : 'URL Externa'}
                  {aula.duracao_segundos > 0 ? ` • ${formatDuration(aula.duracao_segundos)}` : ''}
                </p>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveAula(aIndex, -1);
                }}
                className="p-1 text-on-variant hover:text-white"
              >
                <ChevronUp size={14} />
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveAula(aIndex, 1);
                }}
                className="p-1 text-on-variant hover:text-white"
              >
                <ChevronDown size={14} />
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAula(aula);
                }}
                className="p-1 text-on-variant hover:text-error"
              >
                <Trash2 size={14} />
              </span>
            </button>
          ))}
          <button onClick={onAddAula} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-surface-container">
            <Plus size={14} /> Adicionar Nova Aula
          </button>
        </div>
      )}
    </div>
  );
}

function EditAulaPanel({
  cursoId,
  aula,
  onSaved,
  onClose,
}: {
  cursoId: string;
  aula: Aula & { documentos: Documento[] };
  onSaved: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(aula.titulo);
  const [descricao, setDescricao] = useState(aula.descricao ?? '');
  const [videoOrigem, setVideoOrigem] = useState(aula.video_origem);
  const [videoUrl, setVideoUrl] = useState(aula.video_url ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(aula.thumbnail_url ?? '');
  const [duracao, setDuracao] = useState(aula.duracao_segundos);
  const [salvando, setSalvando] = useState(false);
  const [docNome, setDocNome] = useState('');
  const [docUrl, setDocUrl] = useState('');

  async function handleSave() {
    setSalvando(true);
    await atualizarAula(aula.id, cursoId, {
      titulo,
      descricao,
      video_origem: videoOrigem,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duracao_segundos: Number(duracao) || 0,
    });
    setSalvando(false);
    router.refresh();
    onSaved();
  }

  async function handleAddDoc() {
    if (!docNome || !docUrl) return;
    await adicionarDocumento(aula.id, cursoId, docNome, docUrl);
    setDocNome('');
    setDocUrl('');
    router.refresh();
  }

  return (
    <div className="sticky top-6 rounded-lg bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-white">Editar Aula</h2>
        <button onClick={onClose} className="text-on-variant hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Título da Aula</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Origem do Vídeo</label>
          <div className="flex gap-2">
            {(['url_externa', 'drive', 'upload'] as const).map((origem) => (
              <button
                key={origem}
                type="button"
                onClick={() => setVideoOrigem(origem)}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
                  videoOrigem === origem ? 'bg-primary text-white' : 'bg-surface-lowest text-on-variant'
                }`}
              >
                {origem === 'url_externa' ? 'URL Externa' : origem === 'drive' ? 'Drive' : 'Hospedado'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">URL do Vídeo</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Capa da Aula</label>
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Duração (segundos)</label>
            <input
              type="number"
              value={duracao}
              onChange={(e) => setDuracao(Number(e.target.value))}
              className="input-field"
            />
          </div>
        </div>

        <div className="border-t border-border/40 pt-3">
          <label className="mb-2 block text-xs font-medium text-on-variant">Documentos e Anexos</label>
          <div className="mb-2 space-y-1.5">
            {aula.documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded bg-surface-lowest px-2.5 py-1.5 text-xs">
                <span className="flex items-center gap-1.5 truncate text-on-surface">
                  <FileText size={12} /> {doc.nome}
                </span>
                <button
                  onClick={async () => {
                    await removerDocumento(doc.id, cursoId);
                    router.refresh();
                  }}
                  className="text-on-variant hover:text-error"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              placeholder="Nome"
              value={docNome}
              onChange={(e) => setDocNome(e.target.value)}
              className="input-field py-1.5 text-xs"
            />
            <input
              placeholder="URL"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="input-field py-1.5 text-xs"
            />
            <button onClick={handleAddDoc} className="shrink-0 rounded bg-surface-high px-2 text-on-surface hover:text-white">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={salvando} className="btn-primary flex-1">
            {salvando ? 'Salvando...' : 'Salvar Aula'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriveImportModal({
  open,
  onClose,
  cursoId,
  defaultFolderId,
}: {
  open: boolean;
  onClose: () => void;
  cursoId: string;
  defaultFolderId: string;
}) {
  const router = useRouter();
  const [folderId, setFolderId] = useState(defaultFolderId);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  async function handleImport() {
    if (!folderId) return;
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await importarDoDrive(cursoId, folderId);
      setResultado(`${r.modulosImportados} módulos, ${r.aulasImportadas} aulas e ${r.documentosImportados} documentos importados.`);
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao importar do Drive.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar do Google Drive">
      <div className="space-y-4">
        <p className="text-sm text-on-variant">
          Cada subpasta da pasta informada vira um módulo; vídeos dentro dela viram aulas e os demais arquivos viram
          documentos anexados à última aula. Compartilhe a pasta com o e-mail da service account configurada no servidor.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">ID da pasta do Drive</label>
          <input value={folderId} onChange={(e) => setFolderId(e.target.value)} className="input-field" />
        </div>
        {erro && <p className="text-sm text-error">{erro}</p>}
        {resultado && <p className="text-sm text-primary">{resultado}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          <button onClick={handleImport} disabled={loading || !folderId} className="btn-primary">
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
