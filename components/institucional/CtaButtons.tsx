'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

// Classes dos botões — pedido explícito de uma tarefa anterior: "extraia
// pra um componente compartilhado, sem duplicar código". Exportadas
// (não só usadas aqui dentro) pra SectionHeader.tsx conseguir montar
// botões de AÇÃO CUSTOMIZADA (pedido explícito desta tarefa — ex.: o
// "Saiba mais" da seção de números, que não é nem "Criar conta" nem "Já
// tenho conta") com o MESMO visual/altura/hover de sempre, sem copiar a
// string de classes de novo num terceiro lugar.
export const BOTAO_PRIMARIO_CLASSES =
  'btn-primary inline-flex h-11 w-full max-w-[280px] items-center justify-center px-6 text-sm duration-200 md:h-auto md:w-auto md:max-w-none md:py-3 md:text-base';
// bg-white/text-zinc-800 SEMPRE (não `dark:`) — o botão fica branco nos
// dois temas, só a borda/sombra muda (no claro, ela é quem evita o botão
// "sumir" contra o fundo também claro).
export const BOTAO_SECUNDARIO_CLASSES =
  'inline-flex h-11 w-full max-w-[280px] items-center justify-center rounded-full border border-gray-200 bg-white px-6 text-sm font-semibold text-zinc-800 shadow-sm transition-colors duration-200 hover:bg-gray-50 md:h-auto md:w-auto md:max-w-none md:py-3 md:text-base';

/**
 * Botões de CTA compartilhados — "Criar minha conta grátis" / "Já tenho
 * conta" (ou "Ir para a plataforma", se já logado). Extraídos do hero
 * (HeroSection.tsx) numa tarefa anterior pra serem reutilizados também em
 * SectionHeader.tsx, sem duplicar classes/links em dois lugares. MESMO
 * estilo/altura/border-radius/hover/links de sempre — nada mudou aqui, só
 * saiu do lugar.
 */
export default function CtaButtons({ destinoLogado, className }: { destinoLogado: string | null; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col items-center gap-3 md:w-auto md:flex-row', className)}>
      {destinoLogado ? (
        <Link href={destinoLogado} className={BOTAO_PRIMARIO_CLASSES}>
          Ir para a plataforma
        </Link>
      ) : (
        <>
          <Link href="/login?form=cadastro" className={BOTAO_PRIMARIO_CLASSES}>
            Criar minha conta grátis
          </Link>
          <Link href="/login" className={BOTAO_SECUNDARIO_CLASSES}>
            Já tenho conta
          </Link>
        </>
      )}
    </div>
  );
}
