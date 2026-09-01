'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Play } from 'lucide-react';
import { formatTitulo } from '@/lib/utils';
import type { Curso } from '@/types';

/**
 * Card grande de curso em destaque, estilo "hero" dentro do feed — Netflix.
 * Renderiza em qualquer largura de tela: no mobile é o que ocupa o lugar do
 * banner logo abaixo da fileira de chips de categoria (antes de "Meus
 * Cursos"/"Todos os Cursos"); no desktop/tablet substitui o banner antigo
 * ("MEMBERSFLIX" + descrição + "Continuar assistindo") por completo — mesmo
 * componente, só maior (`md:` — ver os *ClassName abaixo), sem lógica
 * diferente entre os dois.
 *
 * Sem acesso: botão "Comprar agora" abre o MESMO AccessModal (WhatsApp) já
 * usado em qualquer card/módulo bloqueado da plataforma — não existe link de
 * checkout separado no sistema hoje, então reaproveitar é o que já existe,
 * não inventar um fluxo novo. Com acesso: "Assistir agora" leva pra
 * /membros/curso/[id], mesmo padrão do CourseCard — é a própria tela do
 * curso que resolve "Começar"/"Continuar assistindo" e pra qual aula exata,
 * sem duplicar aquela lógica aqui.
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
    // h-[85vh] (era h-[480px]/md:h-[600px], dois valores fixos por
    // breakpoint — agora um só, relativo à altura da viewport, igual em
    // mobile e desktop): o texto continua ancorado embaixo (bottom-0 mais
    // abaixo), então uma altura maior só mostra mais da imagem acima dele,
    // sem ficar "vazio" nem desproporção nenhuma. rounded-xl de volta
    // (cantos arredondados) — o wrapper em VitrinePageClient voltou a ter
    // padding lateral, então o card não é mais edge-to-edge; cantos retos
    // não faziam mais sentido com respiro visível nas laterais. object-cover
    // cobre essa caixa do jeito que for, sem depender de proporção nenhuma.
    <div className="relative h-[85vh] w-full overflow-hidden rounded-xl bg-surface-high">
      {/* Capa (16:9) — o mesmo campo já configurado no admin (Cursos >
          editar curso > Capa), não a thumbnail (essa é pro card pequeno de
          CourseCard). object-cover + object-center: preenche o card sem
          distorcer, recortando as sobras nas laterais e mantendo o centro
          da imagem — onde normalmente está o elemento mais importante
          (rosto, texto principal) — sempre visível. */}
      {curso.capa_url ? (
        <Image src={curso.capa_url} alt={curso.titulo} fill priority className="object-cover object-center" sizes="100vw" />
      ) : (
        // Sem capa cadastrada (admin > curso > Capa): mesmo placeholder do
        // CourseCard (ícone de Play centralizado), não deixa a área vazia.
        <div className="flex h-full items-center justify-center bg-surface-high text-on-variant">
          <Play size={28} />
        </div>
      )}

      {/* Logo pequena, canto superior esquerdo — mesma imagem do cabeçalho
          compacto "Início"/MobileHeader. md:left-6 md:top-6: mais afastada
          da borda num card maior, mesma proporção visual do mobile. */}
      <div className="absolute left-3 top-3 md:left-6 md:top-6">
        <Image src="/imagens/logohome.png" alt="" width={36} height={36} className="h-6 w-auto object-contain drop-shadow md:h-8" />
      </div>

      {/* Gradiente escuro por cima da imagem inteira (não só na base):
          transparente no topo até rgba(0,0,0,0.85) na base — contraste do
          texto branco garantido mesmo sobre a área laranja/clara da capa,
          não só na faixa de baixo. black/85 (Tailwind) = rgba(0,0,0,0.85). */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />

      {/* text-left: alinha o título (bloco) e o badge de categoria
          (inline-block, então segue o text-align do pai) à esquerda, na
          mesma borda interna do padding do card — não precisa de padding
          extra separado pra isso. O botão abaixo não é afetado (flex w-full
          com items/justify-center próprios, continua centralizado
          independente do text-align herdado). md:p-8: mais respiro num card
          maior; md:max-w-lg trava a largura do bloco de texto pra não
          esticar até a borda direita do card num container bem largo. */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-left md:max-w-lg md:p-8">
        <p className="text-xl font-bold leading-tight text-white drop-shadow md:text-3xl">{formatTitulo(curso.titulo)}</p>
        {curso.categoria?.nome && (
          <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white/90 md:mt-3 md:px-3 md:py-1 md:text-xs">
            {curso.categoria.nome}
          </span>
        )}

        {/* rounded-full sobrescreve o `rounded` (4px) do .btn-primary/do
            utilitário base — não mexemos na classe compartilhada (usada em
            botões primários em toda a plataforma), só adicionamos um
            arredondamento maior aqui, específico deste card. md:w-auto:
            no mobile o botão ocupa a largura toda (w-full herdado do
            .btn-primary); num card largo de desktop isso ficaria enorme e
            fora do padrão de botões da plataforma — md:px-8 dá uma largura
            proporcional ao conteúdo em vez de esticar. */}
        {hasAccess ? (
          <Link
            href={`/membros/curso/${curso.id}`}
            className="btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 md:mt-5 md:w-auto md:px-8 md:py-3 md:text-base"
          >
            <Play size={16} className="fill-white" />
            Assistir agora
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClickComprar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-background transition-colors hover:bg-white/90 md:mt-5 md:w-auto md:px-8 md:py-3 md:text-base"
          >
            <ShoppingCart size={16} />
            Comprar agora
          </button>
        )}
      </div>
    </div>
  );
}
