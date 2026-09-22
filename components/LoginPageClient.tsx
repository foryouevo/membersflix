'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, GraduationCap, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { verificarStatusPorEmail, cadastrarAlunoPublico } from '@/app/login/actions';
import TrocarSenhaModal from '@/components/TrocarSenhaModal';
import { preloadLoginIntro, playLoginIntro } from '@/lib/loginIntro';

// TESTE VISUAL: qual fundo mostrar atrás do card de login — 'gradiente'
// (glow radial vermelho, padrão da Home), 'imagem-estatica' (a arte
// original, /imagens/telalogin.png) ou 'banner-netflix' (a mesma imagem do
// card de destaque da Home, public/bannerNetflix.jpg, cobrindo a tela cheia
// — pedido explícito, novo teste). Trocar aqui alterna entre os três sem
// apagar nenhum dos blocos (era um boolean USE_GRADIENT_BACKGROUND antes,
// virou essa union por causa da terceira opção).
const FUNDO_LOGIN: 'gradiente' | 'imagem-estatica' | 'banner-netflix' = 'banner-netflix';

export default function LoginPageClient({
  desenvolvidoPor,
  emailContato,
  termosUsoUrl,
  numeroWhatsapp,
  loginBackgroundUrl,
  cursos,
}: {
  desenvolvidoPor: string | null;
  emailContato: string | null;
  termosUsoUrl: string | null;
  numeroWhatsapp: string | null;
  // Fundo em tela cheia configurável pelo admin (Admin > Configurações >
  // Fundo da Tela de Login). null: cai no fallback estático
  // /hero-destaque.png, ver uso mais abaixo (bloco FUNDO_LOGIN ===
  // 'banner-netflix') — a tela nunca fica sem imagem de fundo.
  loginBackgroundUrl: string | null;
  // Cursos ativos pro <select> do cadastro ("Qual curso gostaria de ter
  // acesso inicial?") — ver app/login/page.tsx (buscarCursosParaCadastro).
  cursos: { id: string; titulo: string }[];
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

  // Cadastro público (verso do card, flip 180°) — estado isolado do
  // formulário de login acima, só entra em jogo quando `flipped` é true.
  const [flipped, setFlipped] = useState(false);
  const [nomeCad, setNomeCad] = useState('');
  const [emailCad, setEmailCad] = useState('');
  const [senhaCad, setSenhaCad] = useState('');
  const [confirmarSenhaCad, setConfirmarSenhaCad] = useState('');
  const [cursoIdCad, setCursoIdCad] = useState('');
  const [erroCad, setErroCad] = useState<string | null>(null);
  const [loadingCad, setLoadingCad] = useState(false);

  // Altura dinâmica do card com flip (bug reportado: com as duas faces
  // sobrepostas via CSS Grid — col-start-1 row-start-1 — a célula do grid
  // sempre cresce pro MAIOR dos dois lados, então o lado de login (mais
  // curto) ficava com espaço vazio embaixo quando visível. Troca de
  // abordagem: as faces agora são `absolute inset-0` (saem do fluxo, não
  // definem mais a altura do pai sozinhas) e a altura do "flipper" pai é
  // medida via ref na face ativa e aplicada via state — sempre bate com o
  // conteúdo real de quem está visível no momento, dos dois lados.
  const loginFaceRef = useRef<HTMLDivElement>(null);
  const cadastroFaceRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const faceAtivaRef = flipped ? cadastroFaceRef : loginFaceRef;
    function medirAltura() {
      if (faceAtivaRef.current) setCardHeight(faceAtivaRef.current.scrollHeight);
    }
    medirAltura();

    // ResizeObserver (não só a troca de `flipped`): acompanha mudanças de
    // altura DENTRO da própria face ativa sem precisar de um flip pra
    // re-medir — ex.: mensagem de erro de login/cadastro aparecendo abaixo
    // do formulário, que aumenta a altura do conteúdo na hora.
    const observer = new ResizeObserver(medirAltura);
    if (faceAtivaRef.current) observer.observe(faceAtivaRef.current);
    return () => observer.disconnect();
  }, [flipped]);

  // Limpa erro de AMBOS os lados ao virar o card — sem isso, um erro de
  // "senha inválida" do login ficava visível (fora de contexto) depois de
  // virar pro cadastro, e vice-versa.
  function handleFlip(paraCadastro: boolean) {
    setErro(null);
    setErroCad(null);
    setFlipped(paraCadastro);
  }

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

  async function handleSubmitCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErroCad(null);

    if (senhaCad.length < 6) {
      setErroCad('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senhaCad !== confirmarSenhaCad) {
      setErroCad('As senhas não coincidem.');
      return;
    }
    if (!cursoIdCad) {
      setErroCad('Escolha um curso pra começar.');
      return;
    }

    setLoadingCad(true);
    preloadLoginIntro();

    try {
      // Server action cria a conta (status "pendente", 30min de trial no
      // curso escolhido — ver app/login/actions.ts) e devolve email/senha
      // só pra este login automático logo abaixo; nunca fica guardado em
      // lugar nenhum além da memória deste componente.
      const { email: emailCriado, senha: senhaCriada } = await cadastrarAlunoPublico({
        nome: nomeCad,
        email: emailCad,
        senha: senhaCad,
        cursoId: cursoIdCad,
      });

      // Login imediato (pedido explícito: "já consegue logar
      // imediatamente") — reaproveita o MESMO signInWithPassword do
      // formulário de login acima, não um mecanismo à parte.
      const { error } = await supabase.auth.signInWithPassword({ email: emailCriado, password: senhaCriada });
      if (error) {
        setErroCad('Cadastro criado, mas não foi possível entrar automaticamente. Faça login normalmente.');
        setLoadingCad(false);
        handleFlip(false);
        return;
      }

      playLoginIntro(() => {
        router.replace('/');
        router.refresh();
      });
    } catch (err: any) {
      setErroCad(err.message ?? 'Erro ao criar cadastro.');
      setLoadingCad(false);
    }
  }

  return (
    // overflow-hidden (novo, item 1 do pedido): container raiz das 3
    // camadas (imagem/overlay/card) — nenhuma delas deveria vazar pra fora
    // dos limites da tela, então isso é só uma trava de segurança, sem
    // efeito visual esperado no dia a dia.
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col bg-background">
      {/* TESTE VISUAL: fundo em degradê (glow radial vermelho no canto
          superior, mesma paleta do tema — background #0f0f0f / primary
          #e50914), a imagem estática original ou o banner de tela cheia —
          qual dos três aparece é definido pela constante FUNDO_LOGIN, acima.
          Só o radial fica no caso 'gradiente': existia também um linear
          diagonal por baixo dele (bg-gradient-to-br from-primary/25
          via-background to-background) que criava uma segunda mancha
          avermelhada, no canto superior ESQUERDO — não confundir com o
          radial abaixo, que nasce no topo-CENTRO (at 50% -10%) e é o único
          gradiente que deve permanecer aqui; removido por pedido explícito
          numa tarefa anterior, sem alterar posição/cores/opacidade/tamanho
          do radial. */}
      {FUNDO_LOGIN === 'gradiente' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-background">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(229,9,20,0.35), transparent 70%)' }}
          />
        </div>
      )}

      {FUNDO_LOGIN === 'imagem-estatica' && (
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

      {FUNDO_LOGIN === 'banner-netflix' && (
        <>
          {/* loginBackgroundUrl (Admin > Configurações > Fundo da Tela de
              Login) — era um src fixo ("/bannerNetflix.jpg", depois
              cogitado trocar pra "/hero-destaque.png") antes de virar
              configurável pelo admin, pedido explícito. Sem valor
              cadastrado ainda (upload nunca feito, ou removido pelo
              admin): cai em "/hero-destaque.png" como fallback — a tela
              nunca fica sem fundo. z-0 (não -z-10 — trocado numa tarefa
              anterior: z-index NEGATIVO depende de nenhum ancestral no
              caminho criar um stacking context isolado sem querer, senão
              o elemento "vaza" pra fora da comparação esperada; z-0/10/20,
              todos positivos e explícitos, comparados dentro do MESMO
              contexto — o do container raiz, que não tem z-index próprio
              — não têm essa ambiguidade: 0 < 10 < 20 sempre, sem depender
              de nenhum comportamento implícito). */}
          <Image
            src={loginBackgroundUrl || '/hero-destaque.png'}
            alt=""
            fill
            priority
            className="z-0 object-cover object-center"
          />
          {/* Overlay em degradê RADIAL (era bg-gradient-to-br diagonal
              preto/vermelho, trocado por pedido explícito) — mesma forma do
              gradiente do <body> do sistema (app/globals.css:
              radial-gradient(100% 60% at 50% 0%, ...), vermelho nascendo no
              topo-centro e irradiando pra baixo/cantos), só que com
              transparência (rgba, não hex sólido) em cada stop, pra
              deixar a imagem de fundo perceptível por trás — principalmente
              nas bordas e na parte de baixo da tela, onde o degradê do body
              já clareia bastante. style inline (não classes Tailwind):
              radial-gradient com múltiplos stops em rgba não tem um
              utilitário Tailwind equivalente, mesmo padrão já usado no
              glow radial da opção 'gradiente' deste arquivo (acima) e no
              próprio <body>. z-10: acima da imagem (z-0), abaixo do
              <main>/card (z-20, ver abaixo) — não é o mesmo <div>
              compartilhado logo adiante (que só renderiza pros outros dois
              fundos), pra não empilhar dois overlays. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              backgroundImage:
                'radial-gradient(100% 60% at 50% 0%, rgba(92,32,32,0.9) 0%, rgba(58,26,26,0.8) 30%, rgba(36,23,23,0.7) 55%, rgba(20,20,20,0.85) 100%)',
            }}
          />
        </>
      )}

      {/* Overlay escuro por cima do fundo — garante contraste do texto que
          fica direto sobre ele (logo, subtítulo, rodapé), sem um card atrás.
          O formulário em si já tem bg-card opaco (abaixo). Só pros dois
          fundos "antigos" (sem z-index próprio, dependem da ordem no DOM) —
          'banner-netflix' já tem o overlay dedicado dele acima, com seu
          próprio z-index; renderizar este aqui TAMBÉM nesse caso empilharia
          os dois overlays. */}
      {FUNDO_LOGIN !== 'banner-netflix' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/45" />
      )}

      {/* z-20 (era z-10) — item 5 do pedido: <main> já criava seu próprio
          stacking context (position:relative + z-index não-auto), então o
          z-20 do card, mais abaixo, só é comparado DENTRO deste contexto,
          não diretamente contra a imagem/overlay acima; quem decide onde
          o bloco main+card inteiro fica na pilha, em relação aos dois
          irmãos de fundo, é o z-index do PRÓPRIO <main>. Antes era z-10,
          empatando com o overlay do banner (também z-10) — funcionava por
          desempate de ordem no DOM (o <main> vem depois no JSX), mas de
          forma implícita; z-20 remove essa ambiguidade, deixando 0 < 10 <
          20 explícito em vez de depender de quem foi escrito primeiro. */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-12">
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
        {/* z-20 explícito (item 4 do pedido) — redundante com o z-20 do
            <main> pai (que já garante isso sozinho, ver comentário lá),
            mas documentado aqui também: se algum dia o card ganhar um
            irmão dentro do <main> que precise ficar atrás dele, o z-20
            já está declarado no lugar certo, sem depender só do pai.

            FLIP 180° (pedido explícito) — 3 camadas:
            1) [perspective:1600px] no wrapper mais externo: dá profundidade
               3D pra rotação do filho — sem isso rotateY vira um
               "achatamento" 2D em vez de parecer girar no espaço.
            2) O "flipper" (relative + [transform-style:preserve-3d] +
               rotateY condicional): é ele que gira. As duas faces usam
               `absolute inset-x-0 top-0` (saem do fluxo do documento, mas
               SEM fixar `bottom` — de propósito: `inset-0` (com bottom
               junto) força height:auto a virar "100% do pai" pela regra do
               CSS pra absolutamente posicionados com top+bottom setados,
               o que era o BUG real da correção anterior — a face media a
               própria altura, mas essa altura já tinha sido esticada pra
               bater com o pai, então a medição só devolvia o valor antigo
               de volta, nunca encolhia). Sem `bottom`, a altura da face
               fica `auto` de verdade (dirigida pelo conteúdo) — é isso que
               o useLayoutEffect + ResizeObserver (abaixo) mede e aplica ao
               flipper via state (`cardHeight`) a cada troca de face.
            3) Cada FACE (login/cadastro) com [backface-visibility:hidden]:
               esconde o verso "cru" de cada uma. A face de cadastro já
               nasce com rotateY(180deg) fixo nela mesma — soma com o
               rotateY do flipper: quando o flipper vira 180°, a soma dá
               360°/0° (de frente, legível); quando o flipper está a 0°, a
               face de cadastro fica a 180° (de costas, escondida pelo
               backface-visibility). Mesmo mecanismo de sempre pra "virar
               a carta", só com Tailwind arbitrary values em vez de CSS à
               parte — sem framer-motion (não é dependência deste
               projeto). */}
        <div className="relative z-20 w-full max-w-md [perspective:1600px]">
          <div
            className="relative [transform-style:preserve-3d]"
            style={{
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              height: cardHeight ? `${cardHeight}px` : undefined,
              // transition única via style (não dá pra combinar com as
              // classes transition-transform/duration-700 do Tailwind: a
              // propriedade `transition` inline é shorthand e sobrescreve
              // qualquer transition-property/duration setada por classe) —
              // duração da altura mais curta que a do giro (300ms vs
              // 700ms) pra não deixar o card "esticando" visivelmente
              // durante o meio do flip.
              transition: 'transform 700ms ease-out, height 300ms ease-out',
            }}
          >
            {/* FRENTE — formulário de login (conteúdo/lógica inalterados,
                só ganhou o link "Cadastra-se" no fim). aria-hidden +
                pointer-events-none quando virado: sem isso, os campos
                continuavam alcançáveis via Tab mesmo escondidos atrás do
                card. */}
            <div
              ref={loginFaceRef}
              aria-hidden={flipped}
              // absolute inset-x-0 top-0, SEM bottom (ver comentário do
              // flipper, acima) — a altura fica auto/dirigida pelo
              // conteúdo, é isso que é medido e aplicado ao pai via state.
              className={`absolute inset-x-0 top-0 w-full rounded-xl bg-card p-8 [backface-visibility:hidden] ${flipped ? 'pointer-events-none' : ''}`}
            >
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
            </button>

            {/* "Você não tem conta? Cadastra-se" (pedido explícito) —
                hover vermelho só no "Cadastra-se" (o resto do texto fica
                neutro, text-on-variant, igual ao resto de texto
                secundário desta tela). break-words + w-full (bugfix: em
                telas estreitas o texto estava estourando a borda direita
                do card em vez de quebrar linha dentro do padding). */}
            <p className="w-full break-words pt-1 text-center text-sm text-on-variant">
              Você não tem conta?{' '}
              <button type="button" onClick={() => handleFlip(true)} className="font-medium text-white hover:text-primary">
                Cadastra-se
              </button>
            </p>
          </form>
            </div>

            {/* VERSO — formulário de cadastro público (novo). Mesmo
                rotateY(180deg) fixo + backface-visibility:hidden do
                comentário acima do flipper. */}
            <div
              ref={cadastroFaceRef}
              aria-hidden={!flipped}
              // absolute inset-x-0 top-0, SEM bottom (mesmo motivo da face
              // de login, acima).
              className={`absolute inset-x-0 top-0 w-full rounded-xl bg-card p-8 [backface-visibility:hidden] ${!flipped ? 'pointer-events-none' : ''}`}
              style={{ transform: 'rotateY(180deg)' }}
            >
              <form onSubmit={handleSubmitCadastro} className="space-y-3">
                <div>
                  <label htmlFor="cadastro-nome" className="mb-1.5 block text-sm font-medium text-on-surface">
                    Nome
                  </label>
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                    <input
                      id="cadastro-nome"
                      required
                      placeholder="Seu nome"
                      value={nomeCad}
                      onChange={(e) => setNomeCad(e.target.value)}
                      className="input-field login-input-dark pl-10"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cadastro-email" className="mb-1.5 block text-sm font-medium text-on-surface">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                    <input
                      id="cadastro-email"
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={emailCad}
                      onChange={(e) => setEmailCad(e.target.value)}
                      className="input-field login-input-dark pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Senha + Confirmar senha lado a lado — cabem bem numa
                    grade de 2 colunas mesmo com os ícones, e ajuda a
                    manter o verso do card mais compacto (o grid do
                    flipper já cresce pro maior dos dois lados; menos
                    altura aqui = flip mais discreto). */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cadastro-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                      <input
                        id="cadastro-senha"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={senhaCad}
                        onChange={(e) => setSenhaCad(e.target.value)}
                        className="input-field login-input-dark pl-10"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cadastro-confirmar-senha" className="mb-1.5 block text-sm font-medium text-on-surface">
                      Confirmar
                    </label>
                    <div className="relative">
                      <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                      <input
                        id="cadastro-confirmar-senha"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmarSenhaCad}
                        onChange={(e) => setConfirmarSenhaCad(e.target.value)}
                        className="input-field login-input-dark pl-10"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="cadastro-curso" className="mb-1.5 block text-sm font-medium text-on-surface">
                    Curso de interesse
                  </label>
                  <div className="relative">
                    <GraduationCap size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-variant" />
                    <select
                      id="cadastro-curso"
                      required
                      value={cursoIdCad}
                      onChange={(e) => setCursoIdCad(e.target.value)}
                      className="input-field login-input-dark pl-10"
                    >
                      <option value="" disabled>
                        Selecione um curso
                      </option>
                      {cursos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  {cursos.length === 0 && (
                    <p className="mt-1.5 text-xs text-on-variant">Nenhum curso disponível no momento — tente novamente mais tarde.</p>
                  )}
                </div>

                {erroCad && <p className="text-sm text-error">{erroCad}</p>}

                <button
                  type="submit"
                  disabled={loadingCad || cursos.length === 0}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-base shadow-[0_0_18px_2px_rgba(229,9,20,0.35)]"
                >
                  {loadingCad ? 'Criando conta...' : 'Criar minha conta'}
                </button>

                {/* "Já tenho conta" — volta (flip de volta) pro login,
                    pedido explícito. w-full + max-w-full no botão
                    inline-flex (bugfix: um <button inline-flex> é uma caixa
                    inline atômica — o navegador não quebra linha por
                    dentro dele sozinho; sem max-w-full + flex-wrap, ele
                    podia estourar a borda direita do card em telas
                    estreitas em vez de quebrar). */}
                <p className="w-full pt-1 text-center text-sm text-on-variant">
                  <button
                    type="button"
                    onClick={() => handleFlip(false)}
                    className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 font-medium text-white hover:text-primary"
                  >
                    <ArrowLeft size={14} />
                    Já tenho conta
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Sem `temRodape` (era condicionado a ter pelo menos 1 item
          configurado pelo admin) — "Política de Privacidade" agora é
          permanente, não vem de config nenhuma, então o rodapé sempre tem
          pelo menos esse item; não faz mais sentido esconder o <footer>
          inteiro. Telefone removido de vez (pedido explícito) — nem o
          campo é mais lido/passado como prop (ver app/login/page.tsx),
          só a coluna/UI do admin continuam existindo, fora do escopo
          deste pedido. */}
      <footer className="relative z-10 flex flex-col items-center gap-2 px-6 py-5 text-center text-xs text-on-variant sm:flex-row sm:justify-center sm:gap-6">
        {/* "membersflix.com" (o texto configurado pelo admin) virando o
            próprio link — pedido explícito, apontando pra home (/). */}
        {desenvolvidoPor && (
          <span>
            Desenvolvido por{' '}
            <Link href="/" className="hover:text-white">
              {desenvolvidoPor}
            </Link>
          </span>
        )}
        {emailContato && (
          <a href={`mailto:${emailContato}`} className="hover:text-white">
            {emailContato}
          </a>
        )}
        {termosUsoUrl && (
          <a href={termosUsoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
            Termos de Uso
          </a>
        )}
        {/* Política de Privacidade — item NOVO, pedido explícito: sempre
            visível (não vem de `configuracoes`, ao contrário dos itens
            acima), rota interna /politicas (ver app/politicas/page.tsx). */}
        <Link href="/politicas" className="hover:text-white">
          Política de Privacidade
        </Link>
      </footer>

      <TrocarSenhaModal
        open={modalTrocarSenhaAberto}
        onClose={() => setModalTrocarSenhaAberto(false)}
        numeroWhatsapp={numeroWhatsapp}
      />
    </div>
  );
}
