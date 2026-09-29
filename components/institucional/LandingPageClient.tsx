'use client';

import { useEffect, useRef, useState } from 'react';
import LandingHeader from '@/components/institucional/LandingHeader';
import LandingFooter from '@/components/institucional/LandingFooter';
import LandingFloatingActions from '@/components/institucional/LandingFloatingActions';
import Container from '@/components/institucional/Container';
import HeroSection from '@/components/institucional/HeroSection';
import DestaquesMarquee from '@/components/institucional/DestaquesMarquee';
import NumerosSection from '@/components/institucional/NumerosSection';
import SectionHeader from '@/components/institucional/SectionHeader';
import PlataformaSection from '@/components/institucional/PlataformaSection';

// 9 seções, NA ORDEM em que aparecem na página. "imagemPlataforma" (que
// existia como seção PRÓPRIA numa tarefa anterior) saiu daqui nesta tarefa
// — o mockup da plataforma com efeito de scroll (ImagemPlataformaSection)
// agora vive DENTRO do card do hero (ver HeroSection.tsx), não é mais uma
// seção de página separada. "palavras"/"numeros" continuam sem item de
// menu próprio (ver ITENS_MENU em LandingHeader.tsx), só participam do
// scroll spy.
const SECOES = ['inicio', 'palavras', 'numeros', 'plataforma', 'cursos', 'diferenciais', 'planos', 'clientes', 'ajuda'] as const;

// Título grande mostrado dentro de cada placeholder (pedido explícito de
// uma tarefa anterior — "só um título grande centralizado indicando o nome
// da seção"). "inicio" NUNCA usa este título — tem componente PRÓPRIO
// (HeroSection, ver o map mais abaixo) — a entrada aqui ficou só por
// completude do tipo Record (não afeta a tela).
// "palavras", "numeros" e "plataforma" NUNCA usam este título — têm
// componente PRÓPRIO (DestaquesMarquee/NumerosSection/PlataformaSection,
// ver o map mais abaixo), mesmo tratamento de "inicio".
const TITULO_SECAO: Record<(typeof SECOES)[number], string> = {
  inicio: 'Início',
  palavras: '',
  numeros: '',
  plataforma: '',
  cursos: 'Cursos Disponíveis',
  diferenciais: 'Diferenciais',
  planos: 'Planos',
  clientes: 'Clientes',
  ajuda: 'Perguntas Frequentes',
};

/**
 * Landing institucional — rota raiz (/), pra QUALQUER visitante, logado ou
 * não (pedido explícito: "/" parou de redirecionar automaticamente pra
 * /login ou pra /inicio/admin — ver app/page.tsx). Página de página única
 * (single-page), com o header fixo/flutuante (LandingHeader.tsx) navegando
 * por scroll suave entre seções âncora, em vez de rotas separadas.
 *
 * Seções ainda são placeholders (pedido explícito — "só título grande
 * centralizado, sem design final ainda, vamos estilizar uma por vez
 * depois"): cada uma é só uma div min-h-screen com o nome escrito dentro,
 * pra validar a navegação/scroll-spy funcionando. Trocar o conteúdo de
 * cada uma por design de verdade é tarefa futura, sem mexer no
 * header/scroll-spy/footer/botões flutuantes.
 *
 * Sem padding-top no <main> (era pt-16): o header agora é um pill
 * FLUTUANTE e TRANSPARENTE no topo da página (pedido explícito desta
 * tarefa) — o hero (#inicio) precisa nascer por TRÁS dele, visível através
 * da transparência, não empurrado pra baixo. scroll-mt-24 em cada seção
 * (era scroll-mt-16) compensa isso na hora de navegar: ao pular pra uma
 * seção, o topo dela para um pouco ABAIXO do topo real da viewport (altura
 * do pill ~4rem + a margem ~1rem que ele tem do topo, arredondado pra
 * 6rem de folga), pra nunca nascer escondida atrás do pill (que, a partir
 * do primeiro scroll, já tem fundo sólido).
 *
 * Container (components/institucional/Container.tsx) em cada seção: MESMO
 * max-width/padding lateral do header, pedido explícito ("margens
 * alinhadas ao longo de toda a página") — antes cada seção tinha só um
 * px-6 solto, sem limite de largura, então o conteúdo centralizado dela
 * não ficava necessariamente alinhado com a coluna do header em telas
 * muito largas.
 *
 * `destinoLogado`: null pra visitante deslogado (header mostra
 * "Entrar"/"Criar conta grátis"); '/inicio' ou '/admin/dashboard' quando já
 * existe sessão — troca os botões por um único "Ir para a plataforma".
 * Decidido no servidor (app/page.tsx, já tem o profile ali) e só repassado
 * pra cá/pro header/footer — nenhuma chamada extra ao Supabase no client
 * só pra saber isso.
 *
 * `numeroWhatsapp`: mesma configuração (`configuracoes.numero_whatsapp`)
 * já usada em todo o resto da plataforma — repassada pro botão/pop-up de
 * suporte flutuante (LandingFloatingActions.tsx) e pro ícone de WhatsApp
 * do footer (LandingFooter.tsx).
 *
 * `categorias`: lista REAL de categorias de curso (mesma tabela que
 * alimenta o filtro da área de membros, ver app/page.tsx) — repassada só
 * pra coluna "Cursos" do footer.
 */
export default function LandingPageClient({
  destinoLogado,
  numeroWhatsapp,
  categorias,
  emailContato,
}: {
  destinoLogado: string | null;
  numeroWhatsapp: string | null;
  categorias: { id: string; nome: string }[];
  emailContato: string | null;
}) {
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>('inicio');
  const secoesRef = useRef<Record<string, HTMLElement | null>>({});

  // Scroll spy: 1 IntersectionObserver só, observando as 9 seções — mais
  // barato e mais simples que calcular scrollTop/offsetTop a cada evento de
  // scroll (sem debounce/throttle pra acertar). rootMargin "-64px" (altura
  // do header) + "-60%" na base: considera uma seção "ativa" quando ela
  // cruza uma faixa fina logo abaixo do header, em vez de exigir que a
  // seção INTEIRA esteja visível (o que nunca aconteceria pras seções
  // mais altas que a tela, como estas min-h-screen).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setSecaoAtiva(entry.target.id);
        }
      },
      { rootMargin: '-64px 0px -60% 0px', threshold: 0 }
    );
    for (const id of SECOES) {
      const el = secoesRef.current[id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    // dark:bg-background (era dark:bg-[#0a0a0a] — pedido explícito desta
    // tarefa: fundo escuro unificado pro site inteiro, ver a variável
    // --background em app/globals.css). Cobre TODAS as seções da página
    // (hero, #palavras, números, plataforma, cursos, diferenciais,
    // planos, clientes, ajuda) porque nenhuma delas define um fundo
    // próprio por cima deste wrapper — sempre herdaram daqui.
    <div className="bg-white text-gray-900 dark:bg-background dark:text-white">
      <LandingHeader secaoAtiva={secaoAtiva} destinoLogado={destinoLogado} />

      <main>
        {SECOES.map((id) => {
          // "inicio" tem componente PRÓPRIO (HeroSection.tsx, que já inclui
          // o mockup da plataforma com efeito de scroll — ver comentário de
          // SECOES acima) — nada de min-h-screen/border-b/texto
          // "Placeholder" nele; as outras 8 seções continuam com o MESMO
          // placeholder genérico de sempre (fora do escopo desta tarefa).
          if (id === 'inicio') {
            // Sem min-h-screen/justify-center (era isso — causa raiz de um
            // bug relatado numa tarefa anterior: empurrava o hero pra
            // ocupar a tela INTEIRA com o conteúdo centralizado no meio,
            // deixando a imagem da plataforma inteira ABAIXO da primeira
            // tela, mesmo em 1920x1080). Fluxo normal agora — a altura do
            // hero é só a soma do próprio conteúdo (HeroSection já cuida
            // do padding-top que compensa o menu fixo).
            return (
              <section
                key={id}
                id={id}
                ref={(el) => {
                  secoesRef.current[id] = el;
                }}
                className="scroll-mt-24 text-center"
              >
                <HeroSection destinoLogado={destinoLogado} categorias={categorias} />
              </section>
            );
          }
          // "palavras" tem componente PRÓPRIO (DestaquesMarquee.tsx —
          // pedido explícito de uma tarefa anterior: virou uma faixa
          // fina, sem min-h-screen/padding grande/placeholder, colada
          // logo abaixo do hero). Mesma margem lateral fluida do wrapper
          // do hero (px-3/sm:px-4/lg:px-6 — "acompanhe a largura fluida
          // do hero"). pt-0 incondicional (era pt-3 sm:pt-4 — pedido
          // explícito desta tarefa: "deixe o padding-top em 0, em TODAS
          // as larguras" — a faixa agora fica colada direto embaixo do
          // card do hero, sem nenhum respiro extra vindo daqui; se
          // sobrar algum espaço visível, ele vem do PRÓPRIO hero, não
          // deste padding). Sem border-b (a faixa já tem seu próprio
          // fade nas laterais via mask-image, ver DestaquesMarquee.tsx —
          // uma borda aqui ficaria redundante/estranha).
          if (id === 'palavras') {
            return (
              <section
                key={id}
                id={id}
                ref={(el) => {
                  secoesRef.current[id] = el;
                }}
                aria-label="Destaques da plataforma"
                className="scroll-mt-24 px-3 pt-0 sm:px-4 lg:px-6"
              >
                <DestaquesMarquee />
              </section>
            );
          }
          // "numeros" tem componente PRÓPRIO (NumerosSection.tsx — pedido
          // explícito desta tarefa) — nada de min-h-screen/border-b/
          // placeholder nele; o resto das seções continua com o MESMO
          // placeholder genérico de sempre (fora do escopo desta tarefa).
          if (id === 'numeros') {
            return (
              <section
                key={id}
                id={id}
                ref={(el) => {
                  secoesRef.current[id] = el;
                }}
                className="scroll-mt-24"
              >
                <NumerosSection categorias={categorias} destinoLogado={destinoLogado} />
              </section>
            );
          }
          // "plataforma" tem componente PRÓPRIO (PlataformaSection.tsx —
          // pedido explícito desta tarefa: efeito de coluna fixa/sticky
          // com a pilha de cartões visuais) — nada de min-h-screen/
          // border-b/placeholder nele. scroll-mt-24 continua aqui (mesma
          // folga de sempre pro menu fixo não cobrir o topo da seção) —
          // é o MESMO id ("plataforma") que o link do menu
          // (LandingHeader.tsx, ITENS_MENU) e o botão "Saiba mais" da
          // seção de números (NumerosSection.tsx) já usam.
          if (id === 'plataforma') {
            return (
              <section
                key={id}
                id={id}
                ref={(el) => {
                  secoesRef.current[id] = el;
                }}
                // overflow-x-clip (pedido explícito desta tarefa) — rede
                // de segurança contra a margem NEGATIVA da "sangria" do
                // card (PlataformaSection.tsx, ver --card-bleed em
                // app/globals.css): essa margem já é matematicamente
                // limitada pra nunca ultrapassar a tela, mas isso aqui
                // garante que nenhum arredondamento de sub-pixel force um
                // scroll horizontal. Só o eixo X (overflow-x, não
                // overflow/overflow-y) — overflow-y continua "visible" por
                // padrão, senão quebraria o position:sticky da coluna
                // esquerda lá dentro.
                className="scroll-mt-24 overflow-x-clip"
              >
                <PlataformaSection destinoLogado={destinoLogado} />
              </section>
            );
          }
          return (
            <section
              key={id}
              id={id}
              ref={(el) => {
                secoesRef.current[id] = el;
              }}
              className="flex min-h-screen scroll-mt-24 flex-col items-center justify-center border-b border-gray-200 text-center dark:border-white/10"
            >
              <Container className="flex flex-col items-center">
                {/* Placeholder (pedido explícito de uma tarefa anterior) —
                    só o nome da seção, pra validar a navegação/scroll-spy
                    visualmente. Substituir pelo conteúdo de verdade de cada
                    seção é tarefa futura.
                    Pedido explícito desta tarefa: essas seções ainda-
                    placeholder passam a usar o MESMO SectionHeader
                    compartilhado (mesmo padrão visual do resto do site),
                    mas SEM inventar texto/destaque/CTA nenhum — eyebrow
                    continua literalmente "Placeholder" (sem trecho em
                    destaque) e o título continua o mesmo de sempre
                    (TITULO_SECAO, sem nenhuma palavra marcada de
                    vermelho). showActions={false}: sem botões de CTA
                    aqui — não faz sentido oferecer "Criar conta" embaixo
                    de um título tipo "Perguntas Frequentes" sem contexto
                    nenhum ainda.
                    TODO: quando esta seção ganhar conteúdo de verdade,
                    definir (a) a palavra do título que vira destaque
                    vermelho e (b) o texto de apoio (prop `description`) —
                    nenhum dos dois existe ainda porque não há informação
                    real da plataforma pra essa seção neste momento. */}
                <SectionHeader eyebrow="Placeholder" title={TITULO_SECAO[id]} align="center" showActions={false} />
              </Container>
            </section>
          );
        })}
      </main>

      <LandingFooter logado={!!destinoLogado} categorias={categorias} numeroWhatsapp={numeroWhatsapp} emailContato={emailContato} />
      <LandingFloatingActions numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
