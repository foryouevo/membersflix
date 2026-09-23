'use client';

import { useEffect, useState } from 'react';
import { KeyRound, TimerOff } from 'lucide-react';
import Modal from '@/components/Modal';
import BotaoOlhoSenha from '@/components/BotaoOlhoSenha';
import SenhaAlteradaSucesso from '@/components/SenhaAlteradaSucesso';
import { createClient } from '@/lib/supabase/client';

// Pop-up aberto automaticamente na tela de login quando a pessoa chega pelo
// link "Reset password" do e-mail de redefinição (ver o efeito de detecção
// em LoginPageClient). Nessa hora o Supabase já criou uma sessão de
// recuperação no navegador — aqui só falta o updateUser com a senha nova.
//
// estado 'pronto'   -> formulário (Nova senha + Confirmar, um olho só);
// estado 'expirado' -> link inválido/expirado, com atalho pra pedir outro.
// Fechar sem salvar (X, clique fora, ESC, Cancelar) encerra a sessão de
// recuperação: a pessoa não deve ficar logada sem ter definido a senha nova.
export default function RedefinirSenhaModal({
  open,
  estado,
  motivo,
  onClose,
  onSolicitarNovoLink,
}: {
  open: boolean;
  estado: 'pronto' | 'expirado';
  motivo?: { motivo: string; detalhe: string } | null;
  onClose: () => void;
  onSolicitarNovoLink: () => void;
}) {
  const supabase = createClient();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  // Um olho só (na "Nova senha") controla os dois campos, igual ao modal
  // "Alterar senha" do perfil.
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (open) {
      setNovaSenha('');
      setConfirmarSenha('');
      setMostrarSenha(false);
      setErro(null);
      setSucesso(false);
    } else {
      // Fechado (por qualquer caminho): zera o "sucesso" pra cancelar o
      // timer de fechamento automático abaixo — sem isso ele disparava
      // signOut() 5s depois de fechar com "Ok", derrubando a sessão de quem
      // já tinha entrado com a senha nova nesse intervalo.
      setSucesso(false);
    }
  }, [open]);

  // Encerra a sessão de recuperação e fecha — usado tanto no cancelamento
  // quanto depois do sucesso (a pessoa fica na tela de login, deslogada,
  // pronta pra entrar com a senha nova).
  async function encerrar() {
    await supabase.auth.signOut();
    onClose();
  }

  // Fecha sozinho alguns segundos depois do sucesso (além do botão "Ok").
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => {
      void encerrar();
    }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucesso]);

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
      const mesmaSenha = /different from the old password|same.*password/i.test(error.message);
      setErro(
        mesmaSenha
          ? 'A nova senha precisa ser diferente da atual.'
          : 'Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.'
      );
      return;
    }
    setSucesso(true);
  }

  return (
    <Modal
      open={open}
      onClose={estado === 'expirado' && !sucesso ? onClose : () => void encerrar()}
      title={sucesso || estado === 'expirado' ? undefined : 'Redefinir senha'}
      maxWidth="max-w-sm"
    >
      {sucesso ? (
        <SenhaAlteradaSucesso onOk={() => void encerrar()} />
      ) : estado === 'expirado' ? (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <TimerOff size={26} />
          </div>
          <h2 className="mb-2 text-lg font-bold text-white">Link inválido ou expirado</h2>
          <p className="mb-6 text-sm text-on-variant">
            {motivo?.motivo ?? 'Esse link de redefinição não vale mais. Peça um novo para continuar.'}
          </p>
          {motivo?.detalhe && (
            <p className="mb-6 -mt-3 break-words text-[11px] leading-snug text-on-variant/70">Detalhe técnico: {motivo.detalhe}</p>
          )}
          <button type="button" onClick={onSolicitarNovoLink} className="btn-primary w-full">
            Solicitar novo link
          </button>
          <button type="button" onClick={onClose} className="mt-3 text-sm text-on-variant hover:text-white">
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-1 flex items-center gap-3 text-sm text-on-variant">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <KeyRound size={18} />
            </span>
            Crie uma nova senha para a sua conta.
          </div>
          <div>
            <label htmlFor="redef-nova-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="redef-nova-senha"
                type={mostrarSenha ? 'text' : 'password'}
                required
                autoFocus
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="input-field pr-10"
                autoComplete="new-password"
              />
              <BotaoOlhoSenha visivel={mostrarSenha} onToggle={() => setMostrarSenha((v) => !v)} />
            </div>
          </div>
          <div>
            <label htmlFor="redef-confirmar-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
              Confirmar nova senha
            </label>
            {/* Sem olho próprio: segue o da "Nova senha". */}
            <input
              id="redef-confirmar-senha"
              type={mostrarSenha ? 'text' : 'password'}
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
          <button
            type="button"
            onClick={() => void encerrar()}
            className="block w-full text-center text-sm text-on-variant hover:text-white"
          >
            Cancelar
          </button>
        </form>
      )}
    </Modal>
  );
}
