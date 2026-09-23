'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import Modal from '@/components/Modal';
import { createClient } from '@/lib/supabase/client';

// Substitui o antigo TrocarSenhaModal ("troca feita manualmente, fale com o
// suporte pelo WhatsApp") por recuperação automática: dispara
// supabase.auth.resetPasswordForEmail, que manda o link de redefinição pro
// e-mail da conta; o link leva pra /login, que abre o pop-up de nova senha.
// O campo de e-mail já vem preenchido com o que estava no login (editável —
// se estiver vazio, a pessoa digita aqui mesmo). Não diferencia e-mail
// cadastrado de não cadastrado na resposta (o Supabase também não revela) —
// evita expor quem tem conta na plataforma.
export default function EsqueceuSenhaModal({
  open,
  onClose,
  emailInicial,
}: {
  open: boolean;
  onClose: () => void;
  emailInicial: string;
}) {
  const supabase = createClient();
  const [email, setEmail] = useState(emailInicial);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A cada abertura: recomeça do estado inicial, com o e-mail atual do login.
  useEffect(() => {
    if (open) {
      setEmail(emailInicial);
      setEnviado(false);
      setErro(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const emailLimpo = email.trim();
    if (!emailLimpo) {
      setErro('Digite o e-mail da sua conta.');
      return;
    }

    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
      // Volta pra /login (que abre o pop-up de redefinição sozinho — ver
      // RedefinirSenhaModal) no MESMO domínio em que a pessoa está: em
      // produção é https://membersflix.com/login, sem URL fixa no código
      // (nada de localhost/domínio errado se o site mudar de endereço). Essa
      // URL precisa estar na lista de Redirect URLs do Supabase Auth.
      redirectTo: `${window.location.origin}/login`,
    });
    setEnviando(false);

    if (error) {
      console.error('[esqueceu-senha] resetPasswordForEmail falhou:', error.message);
      setErro(
        error.status === 429 || /rate|seconds/i.test(error.message)
          ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
          : 'Não foi possível enviar o e-mail agora. Tente novamente.'
      );
      return;
    }
    setEnviado(true);
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          {enviado ? <Check size={26} /> : <KeyRound size={26} />}
        </div>

        {enviado ? (
          <>
            <h2 className="mb-2 text-lg font-bold text-white">Link enviado!</h2>
            <p className="mb-6 text-sm text-on-variant">
              Confira sua caixa de entrada (e o spam) em <span className="text-white">{email.trim()}</span> e clique no link para
              criar uma nova senha.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fechar
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-bold text-white">Esqueceu sua senha?</h2>
            <p className="mb-5 text-sm text-on-variant">
              Enviaremos um link de redefinição de senha para o e-mail principal da sua conta.
            </p>

            <form onSubmit={handleEnviar} className="w-full space-y-3 text-left">
              <div>
                <label htmlFor="esqueceu-email" className="mb-1.5 block text-sm font-medium text-on-surface">
                  E-mail
                </label>
                <input
                  id="esqueceu-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  autoComplete="email"
                />
              </div>

              {erro && <p className="text-sm text-error">{erro}</p>}

              <button type="submit" disabled={enviando} className="btn-primary w-full">
                {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>

            <button type="button" onClick={onClose} className="mt-3 text-sm text-on-variant hover:text-white">
              Cancelar
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
