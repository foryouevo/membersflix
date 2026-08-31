'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { criarModulo, atualizarModulo, uploadImagemModulo } from '@/app/admin/cursos/[id]/aulas/actions';
import type { Modulo } from '@/types';

export default function ModuloFormModal({
  open,
  onClose,
  cursoId,
  ordem,
  modulo,
}: {
  open: boolean;
  onClose: () => void;
  cursoId: string;
  ordem: number;
  modulo?: Modulo | null;
}) {
  const router = useRouter();
  const isEdit = !!modulo;

  const [titulo, setTitulo] = useState(modulo?.titulo ?? '');
  const [capaUrl, setCapaUrl] = useState(modulo?.capa_url ?? '');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [chaveUpload] = useState(() => modulo?.id ?? crypto.randomUUID());

  async function handleUploadCapa(arquivo: File) {
    const formData = new FormData();
    formData.set('arquivo', arquivo);
    formData.set('chave', chaveUpload);
    return uploadImagemModulo(formData);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      // Sanitiza antes de salvar: tira emoji/símbolo decorativo colado no
      // título (ex: colar "🔸Exercícios" sem querer) e o espaço duplo que
      // sobra depois de removê-lo — é o mesmo tipo de sujeira que já achamos
      // salva em alguns módulos direto no banco.
      const tituloLimpo = titulo
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      const input = { titulo: tituloLimpo, capa_url: capaUrl || null };
      if (isEdit && modulo) {
        await atualizarModulo(modulo.id, cursoId, input);
      } else {
        await criarModulo(cursoId, input, ordem);
      }
      router.refresh();
      onClose();
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar módulo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Módulo' : 'Novo Módulo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Título do Módulo</label>
          <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input-field" />
        </div>

        <ImageUploadField
          label="Capa do Módulo (16:9)"
          hint="Aparece como card na vitrine de módulos, na tela do curso."
          value={capaUrl}
          onChange={setCapaUrl}
          onUpload={handleUploadCapa}
          aspectClassName="aspect-video"
        />

        {erro && <p className="text-sm text-error">{erro}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Módulo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
