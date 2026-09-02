'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Página de destino do link enviado por supabase.auth.resetPasswordForEmail
// (ver handleEsqueceuSenha em LoginPageClient.tsx) — completa o fluxo padrão
// de recuperação de senha. O @supabase/ssr client detecta sozinho o token
// de recuperação na URL ao carregar e dispara o evento PASSWORD_RECOVERY;
// só depois disso o formulário de nova senha aparece.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sessaoPronta, setSessaoPronta] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessaoPronta(true);
    });
    // Se a aba já processou o token antes desse efeito rodar, a sessão já
    // existe — não depende só do evento.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoPronta(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

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
      setErro('Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.');
      return;
    }

    setSucesso(true);
    setTimeout(() => {
      router.replace('/login');
      router.refresh();
    }, 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Redefinir senha</h1>

        {sucesso ? (
          <p className="text-sm text-primary">Senha redefinida com sucesso. Redirecionando para o login...</p>
        ) : !sessaoPronta ? (
          <p className="text-sm text-on-variant">
            Abra esta página a partir do link enviado por email. Se o link expirou, solicite um novo em "Esqueceu a
            senha?" na tela de login.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nova-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
                Nova senha
              </label>
              <input
                id="nova-senha"
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="input-field"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirmar-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
                Confirmar nova senha
              </label>
              <input
                id="confirmar-senha"
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
      </div>
    </div>
  );
}
