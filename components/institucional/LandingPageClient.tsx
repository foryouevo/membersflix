'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LandingHeader from '@/components/institucional/LandingHeader';
import LandingFooter from '@/components/institucional/LandingFooter';
import LandingFloatingActions from '@/components/institucional/LandingFloatingActions';
import Container from '@/components/institucional/Container';

// 9 seções, NA ORDEM em que aparecem na página. "palavras" e "numeros" não
// têm item de menu próprio (ver ITENS_MENU em LandingHeader.tsx — 7 itens,
// um pra cada UMA das outras 7 seções) — só entram no scroll spy porque
// fazem parte do fluxo normal de scroll, mas ninguém precisa "pular" direto
// pra elas pelo menu.
const SECOES = [
  'inicio',
  'palavras',
  'numeros',
  'plataforma',
  'cursos',
  'diferenciais',
  'planos',
  'clientes',
  'ajuda',
] as const;

// Título grande mostrado dentro de cada placeholder (pedido explícito —
// "só um título grande centralizado indicando o nome da seção"). Texto
// literal de cada um veio direto do pedido, não inventado aqui.
const TITULO_SECAO: Record<(typeof SECOES)[number], string> = {
  inicio: 'Início',
  palavras: 'Seção de palavras (swiper)',
  numeros: 'Números em destaque',
  plataforma: 'Sobre a Plataforma',
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
}: {
  destinoLogado: string | null;
  numeroWhatsapp: string | null;
  categorias: { id: string; nome: string }[];
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
    <div className="bg-white text-gray-900 dark:bg-[#0a0a0a] dark:text-white">
      <LandingHeader secaoAtiva={secaoAtiva} destinoLogado={destinoLogado} />

      <main>
        {SECOES.map((id) => (
          <section
            key={id}
            id={id}
            ref={(el) => {
              secoesRef.current[id] = el;
            }}
            className="flex min-h-screen scroll-mt-24 flex-col items-center justify-center border-b border-gray-200 text-center dark:border-white/10"
          >
            <Container className="flex flex-col items-center">
              {/* Placeholder (pedido explícito) — só o nome da seção, pra
                  validar a navegação/scroll-spy visualmente. Substituir
                  pelo conteúdo de verdade de cada seção é tarefa futura. */}
              <span className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Placeholder</span>
              <h2 className="text-3xl font-bold sm:text-5xl">{TITULO_SECAO[id]}</h2>
              {id === 'inicio' && (
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                  {/* Mesma troca do header (ver LandingHeader.tsx): logado
                      vira 1 botão só pra plataforma; deslogado mantém os
                      dois de sempre (criar conta / já tenho conta). */}
                  {destinoLogado ? (
                    <Link href={destinoLogado} className="btn-primary px-6 py-3 text-base">
                      Ir para a plataforma
                    </Link>
                  ) : (
                    <>
                      <Link href="/login?form=cadastro" className="btn-primary px-6 py-3 text-base">
                        Criar minha conta grátis
                      </Link>
                      <Link
                        href="/login"
                        className="rounded border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/10"
                      >
                        Já tenho conta
                      </Link>
                    </>
                  )}
                </div>
              )}
            </Container>
          </section>
        ))}
      </main>

      <LandingFooter logado={!!destinoLogado} categorias={categorias} numeroWhatsapp={numeroWhatsapp} />
      <LandingFloatingActions numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
