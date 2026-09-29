'use client';

import Image from 'next/image';
import { User } from 'lucide-react';

const TOTAL_AVATARES = 3;

/**
 * Grupo de avatares sobrepostos da prova social do hero (HeroSection.tsx),
 * inspirado na composição da referência visual desta tarefa (estrutura
 * copiada, sem copiar fotos/marca de lá — pedido explícito).
 *
 * `imagens`: URLs reais de foto de aluno/usuário — o projeto NÃO tem
 * nenhuma foto real cadastrada pra isso ainda (pedido explícito: "não
 * invente fotos de pessoas"), então por enquanto o componente sempre cai
 * no fallback abaixo (círculo neutro + ícone de usuário). Quando existir
 * uma fonte de verdade (ex.: avatar de perfil de aluno já teria que vir de
 * alguma tabela/storage do Supabase, nada disso existe hoje), é só passar
 * as URLs aqui por este prop — o componente já está pronto pra isso, o
 * fallback só entra quando uma posição específica não tem imagem.
 */
export default function AvataresProvaSocial({ imagens = [] }: { imagens?: string[] }) {
  const itens = Array.from({ length: TOTAL_AVATARES }, (_, i) => imagens[i] ?? null);

  return (
    // -space-x-2 (era -space-x-3 fixo): overlap um pouco menor no mobile,
    // proporcional ao círculo também menor (h-7/28px, ver abaixo) — volta
    // a md:-space-x-3 a partir de md (768px), EXATAMENTE como era antes
    // desta tarefa (pedido explícito: não alterar tablet/desktop).
    <div className="flex -space-x-2 md:-space-x-3">
      {itens.map((src, i) => (
        <span
          key={i}
          // border na cor do FUNDO DO CARD (aproximada — o card tem um
          // degradê, não uma cor sólida única, ver HeroSection.tsx): faz
          // as bordas dos círculos sobrepostos, que sem isso ficariam
          // "coladas" um no outro sem separação visual nenhuma. h-7/w-7
          // (28px) no mobile — pedido explícito desta tarefa ("avatares
          // com tamanho um pouco menor no mobile, 28 a 32px") — md:h-8/w-8
          // (32px) restaura o tamanho de sempre a partir de md.
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-gray-100 bg-gray-200 text-gray-400 dark:border-[#141414] dark:bg-white/10 dark:text-gray-500 md:h-8 md:w-8"
          style={{ zIndex: TOTAL_AVATARES - i }}
        >
          {src ? (
            <Image src={src} alt="" width={32} height={32} className="h-full w-full object-cover" />
          ) : (
            <User size={14} strokeWidth={2} />
          )}
        </span>
      ))}
    </div>
  );
}
