'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Upload } from 'lucide-react';
import Modal from '@/components/Modal';
import { atualizarMeuPerfil } from '@/app/membros/perfil/actions';
import { cn, initials } from '@/lib/utils';

export default function EditarPerfilModal({
  nomeAtual,
  telefoneAtual,
  avatarAtual,
  className,
}: {
  nomeAtual: string;
  telefoneAtual: string;
  avatarAtual: string | null;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState(telefoneAtual);
  const [preview, setPreview] = useState<string | null>(avatarAtual);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function handleOpen() {
    setNome(nomeAtual);
    setTelefone(telefoneAtual);
    setPreview(avatarAtual);
    setArquivo(null);
    setErro(null);
    setOpen(true);
  }

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setArquivo(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro('O nome não pode ficar vazio.');
      return;
    }

    setSalvando(true);
    try {
      const formData = new FormData();
      formData.set('nome', nome.trim());
      formData.set('telefone', telefone.trim());
      if (arquivo) formData.set('avatar', arquivo);

      await atualizarMeuPerfil(formData);

      setOpen(false);
      // Server Component re-busca os dados frescos do perfil — sem reload
      // de página inteira, só re-renderiza com o que mudou no servidor.
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={cn('btn-secondary flex items-center justify-center gap-2', className)}>
        <Pencil size={16} />
        Alterar Informações
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Alterar informações" maxWidth="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center">
            {preview ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Prévia do avatar" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                {initials(nome || 'Aluno')}
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleSelecionarArquivo} className="hidden" id="perfil-avatar-input" />
            <label htmlFor="perfil-avatar-input" className="btn-secondary mt-3 flex cursor-pointer items-center gap-2 py-1.5 text-xs">
              <Upload size={14} />
              Escolher foto
            </label>
          </div>

          <div>
            <label htmlFor="perfil-nome" className="mb-1.5 block text-sm font-medium text-on-surface">
              Nome
            </label>
            <input id="perfil-nome" required value={nome} onChange={(e) => setNome(e.target.value)} className="input-field" />
          </div>

          <div>
            <label htmlFor="perfil-telefone" className="mb-1.5 block text-sm font-medium text-on-surface">
              Telefone
            </label>
            <input
              id="perfil-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(28) 99999-9999"
              className="input-field"
            />
          </div>

          {erro && <p className="text-sm text-error">{erro}</p>}

          <button type="submit" disabled={salvando} className="btn-primary w-full">
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </Modal>
    </>
  );
}
