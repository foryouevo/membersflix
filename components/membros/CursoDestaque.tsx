'use client';

import Image from 'next/image';
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
 * Home) — não destaca mais um curso específico. `hasAccess`/`onClickComprar`
 * continuam recebidos (por decisão explícita, ver conversa) mas não são mais
 * usados aqui dentro; `curso` ainda é — a capa (capa_url) continua podendo
 * aparecer como camada acima do banner estático, se cadastrada.
 */
export default function CursoDestaque({
  curso,
  hasAccess,
  onClickComprar,
}: {
  curso: Curso;
  hasAccess: boolean;
  onClickComprar: () => void;
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
      {/* Fundo estático (bannerNetflix.jpg) + overlay — sem z-index (fica na
          "camada 0" da pilha). Como tudo que já existia no card (capa
          dinâmica/placeholder, logo, gradiente, bloco de texto) não tinha
          z-index nenhum antes, e agora precisa continuar acima dessas duas
          camadas novas, dei z-10 pra todos eles — não só pro bloco de
          conteúdo e pro placeholder pedidos explicitamente, mas por
          igual/consistência: misturar só ALGUNS com z-10 e deixar outros
          (ex: a logo, o gradiente escuro da capa) sem nenhum teria
          escondido eles atrás da imagem/overlay novos (z-index compara
          TODOS os elementos da mesma pilha entre si, não só cada um contra
          o banner nesse caso) — na prática isso quebraria a logo/o
          contraste do texto, não só deixaria o banner invisível de novo. */}
      <Image src="/bannerNetflix.jpg" alt="" fill priority className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

      {/* Capa (16:9) — o mesmo campo já configurado no admin (Cursos >
          editar curso > Capa), não a thumbnail (essa é pro card pequeno de
          CourseCard). object-cover + object-center: preenche o card sem
          distorcer, recortando as sobras nas laterais e mantendo o centro
          da imagem — onde normalmente está o elemento mais importante
          (rosto, texto principal) — sempre visível. z-10: precisa ficar
          acima do banner/overlay novos acima. */}
      {/* Sem capa cadastrada (admin > curso > Capa): não renderiza nada aqui
          — a bannerNetflix.jpg de fundo já preenche a área, então o
          placeholder do ícone de Play (fundo bg-surface-high + ícone) não
          faz mais falta e foi removido. */}
      {curso.capa_url && (
        <Image src={curso.capa_url} alt={curso.titulo} fill priority className="z-10 object-cover object-center" sizes="100vw" />
      )}

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
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-left md:max-w-lg md:p-8">
        <p className="text-xl font-bold leading-tight text-white drop-shadow md:text-3xl">Todos os cursos. Um só lugar.</p>

        {/* 3 tags lado a lado (mesmo estilo de pílula que a tag única de
            categoria tinha antes) — gap-2 (0.5rem) entre elas, flex-wrap
            pra quebrar em mais de uma linha no mobile caso não caibam. */}
        <div className="mt-2 flex flex-wrap gap-2 md:mt-3">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white/90 md:px-3 md:py-1 md:text-xs">
            +99 cursos
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white/90 md:px-3 md:py-1 md:text-xs">
            +1000 aulas
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white/90 md:px-3 md:py-1 md:text-xs">
            Acesso Vitalício
          </span>
        </div>

        {/* max-w-[34rem]: trava a largura do texto antes mesmo do md:max-w-lg
            (32rem) do wrapper entrar em ação — no mobile o wrapper não tem
            max-width nenhum, então sem isso o texto esticaria até a borda
            do card numa tela larga. mb-4/md:mb-5: é essa margem (não mais
            um mt- no botão abaixo) que garante o respiro antes dele. */}
        <p className="mb-4 mt-3 max-w-[34rem] text-base text-white/80 md:mb-5 md:mt-4">
          Aulas organizadas por módulo, do básico ao avançado. Assista no seu ritmo, de onde estiver, sem prazo para
          terminar.
        </p>

        {/* rounded-full sobrescreve o `rounded` (4px) do .btn-primary/do
            utilitário base — não mexemos na classe compartilhada (usada em
            botões primários em toda a plataforma), só adicionamos um
            arredondamento maior aqui, específico deste card. md:w-auto:
            no mobile o botão ocupa a largura toda (w-full herdado do
            .btn-primary); num card largo de desktop isso ficaria enorme e
            fora do padrão de botões da plataforma — md:px-8 dá uma largura
            proporcional ao conteúdo em vez de esticar. href em âncora
            (#todos-os-cursos, id novo em VitrinePageClient.tsx): rola até a
            seção "Todos os Cursos" da própria Home, não navega pra outra
            rota. */}
        <a
          href="#todos-os-cursos"
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-2.5 md:w-auto md:px-8 md:py-3 md:text-base"
        >
          Explorar cursos
        </a>
      </div>
    </div>
  );
}
