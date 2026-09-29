'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/**
 * Logo da landing institucional, compartilhada entre LandingHeader.tsx
 * (estado normal) e LandingFooter.tsx — extraída pra não duplicar a
 * correção de legibilidade no tema claro em cada lugar que usa a logo.
 *
 * logo.png é uma imagem RASTER com "MEMBERS" em branco + "FLIX" em
 * vermelho — cor de texto Tailwind não tem efeito nela, então no tema
 * claro (fundo branco/claro por trás) ela fica praticamente invisível. Sem
 * um arquivo separado pra versão escura, a correção é um chip escuro atrás
 * da logo SÓ quando o tema é claro — preserva as cores originais da marca
 * (inclusive o vermelho) em vez de aplicar um filtro CSS (invert etc.), que
 * trocaria o vermelho da marca por outra cor.
 *
 * Não usada no menu mobile em tela cheia (LandingHeader.tsx): aquele
 * overlay é sempre bg-black, independente do tema do site, então a logo já
 * é legível ali sem precisar de chip nenhum.
 */
export default function BrandLogo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  const { theme } = useTheme();
  // Só sabe o tema real depois de montar (next-themes/localStorage) — até
  // lá, sem chip (evita flash/mismatch de hidratação).
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const precisaChip = montado && theme === 'light';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full transition-colors duration-300',
        precisaChip && 'bg-[#141414] px-3 py-1.5',
        className
      )}
    >
      <Image src="/logo.png" alt="MembersFlix" width={160} height={32} priority className={cn('h-6 w-auto object-contain', imgClassName)} />
    </span>
  );
}
