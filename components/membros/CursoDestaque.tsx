'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Curso } from '@/types';

/**
 * Card grande em destaque, estilo "hero" dentro do feed — Netflix.
 * Renderiza em qualquer largura de tela: no mobile é o que ocupa o lugar do
 * banner logo abaixo da fileira de chips de categoria (antes de "Meus
 * Cursos"/"Todos os Cursos"); no desktop/tablet substitui o banner antigo
 * ("MEMBERSFLIX" + descrição + "Continuar assistindo") por completo — mesmo
 * componente, só maior (`md:` — ver os *ClassName abaixo), sem lógica
 * diferente entre os dois.
 *
 * Virou um hero institucional da plataforma (título/tags/texto fixos,
 * botão "Explorar cursos" rolando até a seção "Todos os Cursos" da própria
 * Home) — não destaca mais um curso específico, nem visualmente: a imagem
 * de fundo é configurável pelo admin (Admin > Configurações > Destaque da
 * Home, campo `configuracoes.hero_destaque_url`), não a capa de curso
 * nenhum (curso.capa_url chegou a aparecer como camada por cima dela, mas
 * foi removido — misturava a capa do curso com progresso mais recente do
 * aluno nesse hero institucional, bug relatado). Sem imagem cadastrada, cai
 * num fundo escuro sólido (bg-surface-lowest) em vez de quebrar o layout.
 * `curso`/`hasAccess`/`onClickComprar` continuam recebidos (por decisão
 * explícita, ver conversa) mas não são mais usados aqui dentro nenhum dos
 * três.
 */
export default function CursoDestaque({
  curso,
  hasAccess,
  onClickComprar,
  heroDestaqueUrl,
}: {
  curso: Curso;
  hasAccess: boolean;
  onClickComprar: () => void;
  // Fundo do hero — campo próprio (configuracoes.hero_destaque_url),
  // isolado da capa de qualquer curso. null: fundo sólido escuro (ver
  // bloco logo abaixo).
  heroDestaqueUrl: string | null;
}) {
  return (
    // h-[60vh] no mobile (abaixo de 640px) / sm:h-[85vh] no desktop/tablet
    // — mais baixo numa tela pequena, senão o card sozinho ocupa quase a
    // tela inteira antes do aluno ver qualquer curso da lista. O texto
    // continua ancorado embaixo (bottom-0 mais abaixo), então a altura
    // menor só mostra menos da imagem acima dele, sem cortar nada do
    // conteúdo (logo/categoria/título/botão continuam com o mesmo
    // posicionamento). rounded-xl (cantos arredondados) — o wrapper em
    // VitrinePageClient tem padding lateral (px-4/sm:px-14), então o card
    // não é edge-to-edge em nenhuma tela. object-cover cobre essa caixa do
    // jeito que for, sem depender de proporção nenhuma.
    <div className="relative h-[60vh] w-full overflow-hidden rounded-xl sm:h-[85vh]">
      {/* Fundo configurável (Admin > Configurações > Destaque da Home,
          heroDestaqueUrl) + overlay — sem z-index (fica na "camada 0" da
          pilha). Sem imagem cadastrada: bg-surface-lowest (fundo escuro
          sólido do tema) no lugar do <Image>, pra nunca quebrar o layout —
          o overlay/gradiente/logo/texto continuam exatamente iguais por
          cima. Como tudo que já existia no card (logo, gradiente, bloco de
          texto) não tinha z-index nenhum antes, e agora precisa continuar
          acima dessas duas camadas, dei z-10 pra todos eles — não só pro
          bloco de conteúdo pedido explicitamente, mas por igual/
          consistência: misturar só ALGUNS com z-10 e deixar outros (ex: a
          logo, o gradiente escuro) sem nenhum teria escondido eles atrás da
          imagem/overlay novos (z-index compara TODOS os elementos da mesma
          pilha entre si, não só cada um contra o fundo nesse caso) — na
          prática isso quebraria a logo/o contraste do texto, não só
          deixaria o fundo invisível de novo. */}
      {heroDestaqueUrl ? (
        <Image src={heroDestaqueUrl} alt="" fill priority className="object-cover object-center" />
      ) : (
        <div className="absolute inset-0 bg-surface-lowest" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

      {/* Sem camada de capa de curso aqui de propósito (curso.capa_url) —
          já existiu, e causava o bug de a imagem do hero "virar" a capa do
          curso que o aluno tivesse aberto por último (cursoDestaque, em
          app/membros/vitrine/page.tsx, segue a lógica de "continuar
          assistindo": o curso com progresso mais recente). Esse hero é
          institucional (ver comentário do topo do arquivo — título/tags/
          texto fixos, não destaca mais um curso específico), então a
          imagem de fundo também precisa ser isolada da capa de qualquer
          curso — só heroDestaqueUrl (ou o fundo sólido, sem ela) acima. */}

      {/* Logo pequena, canto superior esquerdo — mesma imagem do cabeçalho
          compacto "Início"/MobileHeader. md:left-6 md:top-6: mais afastada
          da borda num card maior, mesma proporção visual do mobile. z-10:
          ver comentário no topo do arquivo — precisa acompanhar os outros
          elementos que ganharam z-10, senão ficaria a única camada "no
          fundo" e sumiria atrás do banner/capa. */}
      <div className="absolute left-3 top-3 z-10 md:left-6 md:top-6">
        <Image src="/imagens/logohome.png" alt="" width={36} height={36} className="h-6 w-auto object-contain drop-shadow md:h-8" />
      </div>

      {/* Gradiente escuro por cima da imagem inteira (não só na base):
          transparente no topo até rgba(0,0,0,0.85) na base — contraste do
          texto branco garantido mesmo sobre a área laranja/clara da capa,
          não só na faixa de baixo. black/85 (Tailwind) = rgba(0,0,0,0.85).
          z-10: mesmo motivo dos outros — precisa continuar acima da capa
          (que também é z-10; DOM order desempata, e essa div vem depois
          dela no JSX, então continua pintando por cima igual antes). */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 to-transparent" />

      {/* text-left: alinha o título (bloco) e o badge de categoria
          (inline-block, então segue o text-align do pai) à esquerda, na
          mesma borda interna do padding do card — não precisa de padding
          extra separado pra isso. O botão abaixo não é afetado (flex w-full
          com items/justify-center próprios, continua centralizado
          independente do text-align herdado). md:p-8: mais respiro num card
          maior; md:max-w-lg trava a largura do bloco de texto pra não
          esticar até a borda direita do card num container bem largo.
          z-10 (pedido explícito) sem `relative`: essa div já é `absolute`
          (inset-x-0 bottom-0, é assim que ela fica ancorada embaixo do
          card) — `position` só aceita um valor por vez, então juntar
          `relative` com `absolute` faria só um dos dois valer (o Tailwind
          geraria `.relative` depois de `.absolute` no CSS final, então
          `relative` venceria) e quebraria esse ancoramento embaixo,
          bagunçando o layout inteiro. Como já não é `static`, já participa
          do empilhamento normalmente — só faltava mesmo o z-10. */}
      {/* md:max-w-[45rem]/xl:max-w-[50rem]: notebook (768-1279px) e tela
          grande (1280px+) recebem valores diferentes agora — antes só
          existia md: (>=768px), que fazia notebook herdar o valor de tela
          grande. md:p-12 (3rem, sem variante xl: própria — não fazia parte
          deste pedido) continua igual em notebook e tela grande. */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-left md:max-w-[45rem] md:p-12 xl:max-w-[50rem]">
        {/* Mobile: text-[2.25rem] leading-[1.1] (era text-xl/leading-tight)
            — trocado por pedido explícito. md:text-[4rem] md:leading-[4rem]
            (notebook) / xl:text-[5rem] xl:leading-[5rem] (tela grande)
            continuam sem mudança. */}
        <p className="text-[2.25rem] font-bold leading-[1.1] text-white drop-shadow md:text-[4rem] md:leading-[4rem] xl:text-[5rem] xl:leading-[5rem]">
          Todos os cursos. Um só lugar.
        </p>

        {/* 3 tags lado a lado (mesmo estilo de pílula que a tag única de
            categoria tinha antes) — gap-2 (0.5rem, igual em notebook/tela
            grande, sem variante própria) entre elas, flex-wrap pra quebrar
            em mais de uma linha no mobile caso não caibam. Mobile: mt-4
            (1rem, era mt-2) — trocado por pedido explícito. md:mt-6
            (1.5rem, notebook) / xl:mt-7 (1.75rem, tela grande) sem mudança. */}
        <div className="mt-4 flex flex-wrap gap-2 md:mt-6 xl:mt-7">
          {/* Mobile: text-[0.7rem] (era text-[0.65rem]) + py-1 px-[0.7rem]
              (era py-0.5 px-2.5, 0.125rem/0.625rem) — trocados por pedido
              explícito (0.25rem em cima/embaixo, 0.7rem nas laterais). md:*
              sem mudança. */}
          <span className="rounded-full bg-white/15 px-[0.7rem] py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white/90 md:px-4 md:py-2 md:text-[0.8rem] md:leading-4">
            +99 cursos
          </span>
          <span className="rounded-full bg-white/15 px-[0.7rem] py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white/90 md:px-4 md:py-2 md:text-[0.8rem] md:leading-4">
            +1000 aulas
          </span>
          <span className="rounded-full bg-white/15 px-[0.7rem] py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white/90 md:px-4 md:py-2 md:text-[0.8rem] md:leading-4">
            Acesso Vitalício
          </span>
        </div>

        {/* Sem max-w próprio (era max-w-[34rem], removido por pedido
            explícito) — o parágrafo ocupa toda a largura disponível do
            container pai, que trava em md:max-w-[45rem]/xl:max-w-[50rem]
            (mobile não tem max-width nenhum no pai, então o texto já ia até
            a borda do card mesmo antes). md:mb-5/md:mt-4 (1.25rem/1rem,
            iguais em notebook/tela grande, sem variante própria).
            Mobile: text-[0.9rem] leading-[1.3rem] (era text-base, que
            equivale a 1rem/1.5rem) — trocado por pedido explícito.
            md:text-[1.3rem] md:leading-[1.8rem] (notebook) / xl:text-[1.5rem]
            xl:leading-8 (tela grande) sem mudança. */}
        <p className="mb-4 mt-3 text-[0.9rem] leading-[1.3rem] text-white/80 md:mb-5 md:mt-4 md:text-[1.3rem] md:leading-[1.8rem] xl:text-[1.5rem] xl:leading-8">
          Aulas organizadas por módulo, do básico ao avançado. Assista no seu ritmo, de onde estiver, sem prazo para
          terminar.
        </p>

        {/* Wrapper dos dois botões — mobile: flex-col (empilhados, cada um
            w-full via classe própria do botão) + gap-3 (0.75rem) entre
            eles; md: flex-row + items-center (lado a lado, "Explorar
            cursos" à esquerda por ordem no DOM), mesmo gap-3 servindo de
            espaçamento horizontal. Tudo isso pedido explicitamente — antes
            só existia o botão vermelho sozinho aqui. */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* rounded-full sobrescreve o `rounded` (4px) do .btn-primary/do
              utilitário base — não mexemos na classe compartilhada (usada em
              botões primários em toda a plataforma), só adicionamos um
              arredondamento maior aqui, específico deste card. md:w-fit
              (width: fit-content, era md:w-auto — trocado por pedido
              explícito: `w-auto` num elemento `flex` ainda ocupava 100% da
              largura disponível, já que é uma caixa block-level em fluxo
              normal; `w-fit` de fato encolhe pro conteúdo, sem precisar virar
              inline-flex): no mobile o botão continua ocupando a largura toda
              (w-full herdado do .btn-primary). md:px-8/md:py-3 continuam
              (padding interno mantido); md:text-[1.1rem] md:leading-6
              (tamanho/altura de linha) são novos, pedidos explicitamente.
              href em âncora (#todos-os-cursos, id novo em
              VitrinePageClient.tsx): rola até a seção "Todos os Cursos" da
              própria Home, não navega pra outra rota. */}
          <a
            href="#todos-os-cursos"
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-2.5 md:w-fit md:px-8 md:py-3 md:text-[1.1rem] md:leading-6"
          >
            Explorar cursos
          </a>

          {/* Segundo botão, "Meus cursos" — pedido explícito, em todas as
              telas. Mesmas classes de tamanho/padding/altura/border-radius
              do botão acima (flex w-full items-center justify-center gap-2
              rounded-full px-4 py-2.5 md:w-fit md:px-8 md:py-3
              md:text-[1.1rem] md:leading-6 + text-sm font-semibold, que no
              botão de cima vêm do .btn-primary) — só a cor muda: fundo
              branco/texto #141414
              (bg-white text-[#141414], não dá pra usar .btn-primary/
              .btn-secondary aqui, nenhum dos dois tem essa combinação) +
              hover branco levemente acinzentado (hover:bg-white/90),
              coerente com o hover do vermelho (.btn-primary usa
              hover:bg-primary-hover, um vermelho um pouco mais escuro — aqui
              é a mesma ideia de "escurecer um pouco no hover", só que a
              partir do branco). Link (não <a>): rota de verdade
              (/membros/meus-cursos), diferente do âncora de rolagem ao
              lado. */}
          <Link
            href="/membros/meus-cursos"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#141414] transition-colors hover:bg-white/90 md:w-fit md:px-8 md:py-3 md:text-[1.1rem] md:leading-6"
          >
            Meus cursos
          </Link>
        </div>
      </div>
    </div>
  );
}
