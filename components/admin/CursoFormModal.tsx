'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { criarCurso, criarCategoria, atualizarCurso, uploadImagemCurso } from '@/app/admin/cursos/actions';
import type { Categoria, Curso } from '@/types';

const MENSAGEM_PADRAO = 'Olá! Quero liberar meu acesso ao curso {curso}.';

export default function CursoFormModal({
  open,
  onClose,
  categorias,
  curso,
}: {
  open: boolean;
  onClose: () => void;
  categorias: Categoria[];
  curso?: Curso | null;
}) {
  const router = useRouter();
  const isEdit = !!curso;

  const [titulo, setTitulo] = useState(curso?.titulo ?? '');
  const [descricao, setDescricao] = useState(curso?.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState(curso?.categoria_id ?? '');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [capaUrl, setCapaUrl] = useState(curso?.capa_url ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(curso?.thumbnail_url ?? '');
  const [instrutorNome, setInstrutorNome] = useState(curso?.instrutor_nome ?? '');
  const [instrutorBio, setInstrutorBio] = useState(curso?.instrutor_bio ?? '');
  const [status, setStatus] = useState<'active' | 'inactive'>(curso?.status ?? 'active');
  const [mensagemWhatsapp, setMensagemWhatsapp] = useState(curso?.mensagem_whatsapp ?? MENSAGEM_PADRAO);
  const [driveFolderId, setDriveFolderId] = useState(curso?.drive_folder_id ?? '');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Identifica a pasta do curso no Storage pros uploads de capa/thumbnail.
  // Curso existente usa o próprio id; curso novo usa um id temporário só
  // pra essa finalidade (não precisa bater com o id que o banco vai gerar).
  const [chaveUpload] = useState(() => curso?.id ?? crypto.randomUUID());

  async function handleUploadCapa(arquivo: File) {
    const formData = new FormData();
    formData.set('arquivo', arquivo);
    formData.set('campo', 'capa');
    formData.set('chave', chaveUpload);
    return uploadImagemCurso(formData);
  }

  async function handleUploadThumbnail(arquivo: File) {
    const formData = new FormData();
    formData.set('arquivo', arquivo);
    formData.set('campo', 'thumbnail');
    formData.set('chave', chaveUpload);
    return uploadImagemCurso(formData);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      let catId: string | null = categoriaId || null;
      if (novaCategoria.trim()) {
        const nova = await criarCategoria(novaCategoria.trim());
        catId = nova.id;
      }

      const payload = {
        titulo,
        descricao,
        categoria_id: catId,
        capa_url: capaUrl || null,
        thumbnail_url: thumbnailUrl || null,
        instrutor_nome: instrutorNome || null,
        instrutor_bio: instrutorBio || null,
        status,
        mensagem_whatsapp: mensagemWhatsapp || MENSAGEM_PADRAO,
        drive_folder_id: driveFolderId || null,
      };

      if (isEdit && curso) {
        await atualizarCurso(curso.id, payload);
      } else {
        await criarCurso(payload);
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar curso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Curso' : 'Novo Curso'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Título</label>
          <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="input-field">
              <option value="">Selecionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Ou criar nova categoria</label>
            <input
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Ex: Fotografia"
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ImageUploadField
            label="Capa (banner 16:9)"
            value={capaUrl}
            onChange={setCapaUrl}
            onUpload={handleUploadCapa}
            aspectClassName="aspect-video"
          />
          <ImageUploadField
            label="Thumbnail (card)"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            onUpload={handleUploadThumbnail}
            aspectClassName="aspect-video"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Instrutor</label>
            <input value={instrutorNome} onChange={(e) => setInstrutorNome(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')} className="input-field">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Bio do instrutor</label>
          <textarea
            value={instrutorBio}
            onChange={(e) => setInstrutorBio(e.target.value)}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">ID da pasta do Google Drive (opcional)</label>
          <input
            value={driveFolderId}
            onChange={(e) => setDriveFolderId(e.target.value)}
            placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">
            Mensagem do WhatsApp (use {'{curso}'} para inserir o título)
          </label>
          <textarea
            value={mensagemWhatsapp}
            onChange={(e) => setMensagemWhatsapp(e.target.value)}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        {erro && <p className="text-sm text-error">{erro}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Curso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
