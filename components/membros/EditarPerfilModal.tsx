'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Upload } from 'lucide-react';
import Modal from '@/components/Modal';
import { atualizarMeuPerfil } from '@/app/membros/perfil/actions';
import { createClient } from '@/lib/supabase/client';
import { cn, initials } from '@/lib/utils';

export default function EditarPerfilModal({
  nomeAtual,
  telefoneAtual,
  emailAtual,
  avatarAtual,
  className,
  // triggerLabel/variant: mesmo modal/formulário/submit de sempre — só o
  // BOTÃO que abre ele muda de texto/cor conforme onde é usado (ex: "Editar
  // Perfil" em destaque no card do topo da tela de Perfil vs. "Alterar
  // Informações" ao lado de "Alterar Senha", mais abaixo). Sem isso, cada
  // lugar precisaria de um componente próprio só pra trocar o rótulo do
  // botão, duplicando toda a lógica de edição por baixo. Defaults batem
  // exatamente com o único uso que já existia antes desta prop existir.
  triggerLabel = 'Alterar Informações',
  variant = 'secondary',
}: {
  nomeAtual: string;
  telefoneAtual: string;
  emailAtual: string;
  avatarAtual: string | null;
  className?: string;
  triggerLabel?: string;
  variant?: 'primary' | 'secondary';
}) {
  const router = useRouter();
  const supabase = createClient();
  // ids únicos por instância (useId): a tela de Perfil agora renderiza este
  // componente DUAS vezes na mesma página (botão "Editar Perfil" no card do
  // topo + "Alterar Informações" mais abaixo) — com id fixo, o segundo
  // <label htmlFor="perfil-avatar-input"> (ou "perfil-nome"/"perfil-
  // telefone") apontaria pro elemento da OUTRA instância (o navegador só
  // associa o PRIMEIRO id igual que encontra no DOM), quebrando o clique em
  // "Escolher foto"/o foco ao clicar no rótulo sempre que a instância que
  // abre por último não for a primeira a aparecer no HTML. Como Modal.tsx
  // desmonta por completo quando fechado (createPortal só entra no ar com
  // open=true), as duas nunca chegam a coexistir no DOM ao mesmo tempo hoje
  // (uma cobre a tela inteira, não dá pra abrir a outra por cima) — mas não
  // é algo pra depender ficando refém dessa coincidência de UI.
  const idBase = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState(telefoneAtual);
  const [email, setEmail] = useState(emailAtual);
  const [preview, setPreview] = useState<string | null>(avatarAtual);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // true depois de disparar a troca de e-mail (supabase.auth.updateUser):
  // o Supabase só aplica a mudança de verdade após o aluno confirmar o
  // link recebido por e-mail ("secure email change") — até lá o modal fica
  // preso numa tela de aviso em vez de fechar como se já tivesse concluído
  // (ver handleSubmit e o JSX do Modal, mais abaixo).
  const [emailPendente, setEmailPendente] = useState(false);

  function handleOpen() {
    setNome(nomeAtual);
    setTelefone(telefoneAtual);
    setEmail(emailAtual);
    setPreview(avatarAtual);
    setArquivo(null);
    setErro(null);
    setEmailPendente(false);
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
    const emailLimpo = email.trim();
    if (!emailLimpo) {
      setErro('O e-mail não pode ficar vazio.');
      return;
    }

    setSalvando(true);
    try {
      // Nome/telefone/foto: continuam indo pela server action de sempre,
      // gravados direto em profiles (sem confirmação nenhuma — nunca
      // precisaram). E-mail é o login do sistema (ver
      // components/LoginPageClient.tsx, supabase.auth.signInWithPassword),
      // então NÃO é escrito em profiles por aqui — vai separado, abaixo,
      // pelo próprio Supabase Auth (única fonte da verdade pro e-mail de
      // login); profiles.email se atualiza sozinho quando a troca é
      // confirmada, via trigger (ver
      // supabase/migrations/010_sync_email_profiles.sql).
      const formData = new FormData();
      formData.set('nome', nome.trim());
      formData.set('telefone', telefone.trim());
      if (arquivo) formData.set('avatar', arquivo);
      await atualizarMeuPerfil(formData);

      const emailMudou = emailLimpo !== emailAtual;
      if (emailMudou) {
        // supabase.auth.updateUser({ email }) só ENVIA o(s) e-mail(s) de
        // confirmação — não troca o login na hora. Por padrão o Supabase
        // Auth exige confirmar o link recebido no e-mail NOVO (e, se
        // "Secure email change" estiver ligado no painel, também no
        // e-mail ATUAL) antes de aplicar a mudança de verdade. emailRedirectTo
        // manda o link de volta pra esta mesma tela depois de confirmado.
        const { error: erroEmail } = await supabase.auth.updateUser(
          { email: emailLimpo },
          { emailRedirectTo: `${window.location.origin}/membros/perfil` }
        );
        if (erroEmail) throw new Error(erroEmail.message);

        setEmailPendente(true);
        router.refresh();
        return;
      }

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
      <button
        type="button"
        onClick={handleOpen}
        className={cn(variant === 'primary' ? 'btn-primary' : 'btn-secondary', 'flex items-center justify-center gap-2', className)}
      >
        <Pencil size={16} />
        {triggerLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Alterar informações" maxWidth="max-w-sm">
        {emailPendente ? (
          <div className="space-y-4">
            <p className="text-sm text-primary">
              Nome, telefone e foto foram salvos. Enviamos um link de confirmação para o novo e-mail — a troca só entra em vigor depois
              que ele for confirmado (verifique também a caixa de entrada do e-mail atual, caso o Supabase peça confirmação dupla).
            </p>
            <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full">
              Entendi
            </button>
          </div>
        ) : (
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
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleSelecionarArquivo}
              className="hidden"
              id={`${idBase}-avatar-input`}
            />
            <label htmlFor={`${idBase}-avatar-input`} className="btn-secondary mt-3 flex cursor-pointer items-center gap-2 py-1.5 text-xs">
              <Upload size={14} />
              Escolher foto
            </label>
          </div>

          <div>
            <label htmlFor={`${idBase}-nome`} className="mb-1.5 block text-sm font-medium text-on-surface">
              Nome
            </label>
            <input id={`${idBase}-nome`} required value={nome} onChange={(e) => setNome(e.target.value)} className="input-field" />
          </div>

          <div>
            <label htmlFor={`${idBase}-email`} className="mb-1.5 block text-sm font-medium text-on-surface">
              E-mail
            </label>
            <input
              id={`${idBase}-email`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              autoComplete="email"
            />
            {/* Aviso só quando o campo já foi mexido e difere do valor
                salvo — não polui o formulário quando o aluno só está
                editando nome/telefone/foto. */}
            {email.trim() !== emailAtual && (
              <p className="mt-1 text-xs text-on-variant">Alterar o e-mail exigirá confirmação por link antes de valer para o login.</p>
            )}
          </div>

          <div>
            <label htmlFor={`${idBase}-telefone`} className="mb-1.5 block text-sm font-medium text-on-surface">
              Telefone
            </label>
            <input
              id={`${idBase}-telefone`}
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
        )}
      </Modal>
    </>
  );
}
