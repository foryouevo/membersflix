'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Modal from '@/components/Modal';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Diferente do fluxo de "Esqueceu a senha?" (login, deslogado — precisa do
// link por email porque não existe sessão ainda), aqui o aluno já está
// autenticado, então dá pra trocar a senha direto com updateUser, sem
// precisar de link nenhum.
export default function AlterarSenhaButton({ className }: { className?: string } = {}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleOpen() {
    setNovaSenha('');
    setConfirmarSenha('');
    setErro(null);
    setSucesso(false);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setLoading(false);

    if (error) {
      setErro('Não foi possível alterar a senha. Tente novamente.');
      return;
    }
    setSucesso(true);
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={cn('btn-secondary flex items-center justify-center gap-2', className)}>
        <KeyRound size={16} />
        Alterar Senha
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Alterar senha" maxWidth="max-w-sm">
        {sucesso ? (
          <p className="text-sm text-primary">Senha alterada com sucesso.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="perfil-nova-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
                Nova senha
              </label>
              <input
                id="perfil-nova-senha"
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="input-field"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="perfil-confirmar-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
                Confirmar nova senha
              </label>
              <input
                id="perfil-confirmar-senha"
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="input-field"
                autoComplete="new-password"
              />
            </div>

            {erro && <p className="text-sm text-error">{erro}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
