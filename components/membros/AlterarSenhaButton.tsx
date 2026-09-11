'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Modal from '@/components/Modal';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Diferente do fluxo de "Esqueceu a senha?" (login, deslogado — precisa do
// link por email porque não existe sessão ainda), aqui o aluno já está
// autenticado, então a troca em si não precisa de link nenhum — só de
// updateUser. Mas antes disso este componente reautentica com a SENHA
// ATUAL (signInWithPassword), pra confirmar que é realmente o dono da
// conta trocando a senha (ex: sessão esquecida aberta em outro
// dispositivo) — ver handleSubmit.
export default function AlterarSenhaButton({ className }: { className?: string } = {}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleOpen() {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setErro(null);
    setSucesso(false);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!senhaAtual) {
      setErro('Informe sua senha atual.');
      return;
    }
    if (novaSenha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      // Confirma a senha ATUAL antes de trocar (pedido desta tarefa — o
      // fluxo antigo trocava direto, sem checar nada). O Supabase Auth não
      // tem um "verifyPassword" isolado; o jeito de validar é reautenticar
      // de verdade com signInWithPassword, usando o e-mail da PRÓPRIA
      // sessão (getUser — nunca um valor vindo de fora) contra a senha
      // digitada. Só chama updateUser se isso confirmar.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Não foi possível confirmar sua identidade. Tente novamente.');

      const { error: erroReauth } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaAtual });
      if (erroReauth) {
        setErro('Senha atual incorreta.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        setErro('Não foi possível alterar a senha. Tente novamente.');
        return;
      }
      setSucesso(true);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
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
              <label htmlFor="perfil-senha-atual" className="mb-1.5 block text-sm font-medium text-on-surface">
                Senha atual
              </label>
              <input
                id="perfil-senha-atual"
                type="password"
                required
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="input-field"
                autoComplete="current-password"
              />
            </div>
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
