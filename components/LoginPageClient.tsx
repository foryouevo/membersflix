'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { verificarStatusPorEmail } from '@/app/login/actions';
import TrocarSenhaModal from '@/components/TrocarSenhaModal';
import { preloadLoginIntro, playLoginIntro } from '@/lib/loginIntro';

// TESTE VISUAL: true = fundo em degradê (padrão da Home); false = volta pra
// imagem estática original (/imagens/telalogin.png). Ver bloco no JSX abaixo.
const USE_GRADIENT_BACKGROUND = true;

export default function LoginPageClient({
  desenvolvidoPor,
  emailContato,
  telefoneContato,
  termosUsoUrl,
  numeroWhatsapp,
}: {
  desenvolvidoPor: string | null;
  emailContato: string | null;
  telefoneContato: string | null;
  termosUsoUrl: string | null;
  numeroWhatsapp: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fluxo de "Esqueceu a senha?": verificarErro é só a mensagem de "preencha
  // o email" (item 4 do pedido) — não usa `erro` acima pra não misturar com
  // a mensagem de login inválido. verificando cobre a checagem de status
  // (chamada ao servidor) até decidir entre abrir o modal ou disparar a
  // recuperação padrão. recuperacaoMsg é a confirmação de que o email de
  // redefinição foi enviado (fluxo padrão, quando o aluno não está ativo).
  const [modalTrocarSenhaAberto, setModalTrocarSenhaAberto] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [verificarErro, setVerificarErro] = useState<string | null>(null);
  const [recuperacaoMsg, setRecuperacaoMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    // Começa a baixar o vídeo de intro já aqui (em paralelo com a chamada de
    // auth abaixo), pra minimizar o delay entre "login confirmado" e o
    // vídeo de fato começar a tocar — só fica invisível até o login passar.
    preloadLoginIntro();

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    // O redirect só acontece depois da tela de intro terminar (vídeo
    // "ended", ou o timeout de segurança dela) — ver LoginIntroOverlay, que
    // agora vive fora daqui (no layout raiz) pra sobreviver à troca de rota.
    playLoginIntro(() => {
      router.replace('/');
      router.refresh();
    });
  }

  async function handleEsqueceuSenha() {
    setVerificarErro(null);
    setRecuperacaoMsg(null);

    const emailLimpo = email.trim();
    if (!emailLimpo) {
      setVerificarErro('Preencha o email antes de continuar.');
      return;
    }

    setVerificando(true);
    try {
      // "Ativo" (status_pagamento = 'pago' e não bloqueado — mesma regra do
      // middleware) abre o modal do suporte; qualquer outro caso (pendente,
      // bloqueado ou email não encontrado) segue o fluxo padrão de
      // recuperação por email do Supabase Auth.
      const status = await verificarStatusPorEmail(emailLimpo);

      if (status === 'ativo') {
        setModalTrocarSenhaAberto(true);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        setVerificarErro('Não foi possível enviar o email de recuperação. Tente novamente.');
        return;
      }

      setRecuperacaoMsg('Se esse email estiver cadastrado, enviamos um link para redefinir a senha.');
    } finally {
      setVerificando(false);
    }
  }

  // Cada item só aparece se o admin configurou (Configurações > Rodapé da
  // Tela de Login) — nada hardcoded aqui além dos rótulos/formatação.
  const temRodape = !!(desenvolvidoPor || emailContato || telefoneContato || termosUsoUrl);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* TESTE VISUAL: fundo em degradê (glow radial vermelho no canto
          superior, mesma paleta do tema — background #0f0f0f / primary
          #e50914) no lugar da imagem estática. Pra reverter, é só trocar
          USE_GRADIENT_BACKGROUND pra false abaixo — o bloco da imagem
          original foi mantido intacto, só fica oculto enquanto a flag
          estiver true.
          Só o radial fica: existia também um linear diagonal por baixo dele
          (bg-gradient-to-br from-primary/25 via-background to-background)
          que criava uma segunda mancha avermelhada, no canto superior
          ESQUERDO — não confundir com o radial abaixo, que nasce no
          topo-CENTRO (at 50% -10%) e é o único gradiente que deve
          permanecer aqui; removido por pedido explícito, sem alterar
          posição/cores/opacidade/tamanho do radial. */}
      {USE_GRADIENT_BACKGROUND ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-background">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(229,9,20,0.35), transparent 70%)' }}
          />
        </div>
      ) : (
        /* Imagem cobre a tela inteira (cover/center/no-repeat, sem distorcer —
           cover preserva a proporção original, só recorta o que sobra). Os
           elementos geométricos da arte ficam nos cantos opostos (topo-direito
           e inferior-esquerdo) com o centro praticamente limpo — por isso
           bg-center funciona bem tanto no card centralizado (desktop) quanto
           recortando as bordas em telas estreitas (mobile), sem cortar nada
           de especialmente importante bem no meio. */
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/imagens/telalogin.png')" }}
        />
      )}
      {/* Overlay escuro por cima do fundo — garante contraste do texto que
          fica direto sobre ele (logo, subtítulo, rodapé), sem um card atrás.
          O formulário em si já tem bg-card opaco (abaixo). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/45" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Logo + subtítulo centralizados, acima do card */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="MembersFlix" width={220} height={44} priority className="h-10 w-auto object-contain" />
          <p className="mt-3 text-sm text-on-variant">Acesse sua conta para continuar.</p>
        </div>

        {/* Efeito de glow animado (conic-gradient + blur girando) removido:
            num card retangular largo, o gradiente cônico gira em torno do
            centro do box, então o "arco" de luz varre de forma desigual
            (mais rápido perto do topo/base, mais devagar perto das
            laterais) — com o blur, isso lia como uma mancha solta se
            deslocando atrás do card em vez de um contorno acompanhando o
            perímetro. Card só com bg-card + rounded-xl por enquanto. */}
        <div className="w-full max-w-md rounded-xl bg-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-on-surface">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field login-input-dark pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="login-senha" className="text-sm font-medium text-on-surface">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handleEsqueceuSenha}
                  disabled={verificando}
                  className="text-xs text-on-variant hover:text-primary disabled:cursor-wait disabled:opacity-70"
                >
                  {verificando ? 'Verificando...' : 'Esqueceu a senha?'}
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                <input
                  id="login-senha"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-field login-input-dark pl-10"
                  autoComplete="current-password"
                />
              </div>
              {verificarErro && <p className="mt-1.5 text-xs text-error">{verificarErro}</p>}
              {recuperacaoMsg && <p className="mt-1.5 text-xs text-primary">{recuperacaoMsg}</p>}
            </div>

            {erro && <p className="text-sm text-error">{erro}</p>}

            {/* Toggle deslizante (não checkbox quadrado) — mesmo padrão
                visual usado em apps: trilho + bolinha que desliza,
                vermelho quando ligado. */}
            <label className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={lembrar}
                onClick={() => setLembrar((v) => !v)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${lembrar ? 'bg-primary' : 'bg-surface-high'}`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${lembrar ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
              <span className="text-sm text-on-variant">Lembrar-me</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-base shadow-[0_0_18px_2px_rgba(229,9,20,0.35)]"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </main>

      {temRodape && (
        <footer className="relative z-10 flex flex-col items-center gap-2 px-6 py-5 text-center text-xs text-on-variant sm:flex-row sm:justify-center sm:gap-6">
          {desenvolvidoPor && <span>Desenvolvido por {desenvolvidoPor}</span>}
          {emailContato && (
            <a href={`mailto:${emailContato}`} className="hover:text-white">
              {emailContato}
            </a>
          )}
          {telefoneContato && (
            <a href={`tel:${telefoneContato.replace(/\D/g, '')}`} className="hover:text-white">
              {telefoneContato}
            </a>
          )}
          {termosUsoUrl && (
            <a href={termosUsoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              Termos de Uso
            </a>
          )}
        </footer>
      )}

      <TrocarSenhaModal
        open={modalTrocarSenhaAberto}
        onClose={() => setModalTrocarSenhaAberto(false)}
        numeroWhatsapp={numeroWhatsapp}
      />
    </div>
  );
}
