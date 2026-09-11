import { cn } from '@/lib/utils';

// Cabeçalho de título reaproveitado nos 4 cards da tela de Perfil que têm
// título (Continuar Assistindo, Informações da Conta, Meu(s) Curso(s),
// Cursos Recomendados) — extraído aqui em vez de repetir a mesma barrinha +
// <h2> em cada um dos 4 arquivos (app/membros/perfil/page.tsx tem 2 dos 4
// usos; MeusCursosCard.tsx e CursosRecomendados.tsx os outros 2).
//
// Barrinha vertical vermelha: elemento de identidade visual, à esquerda do
// texto — gap-2.5 (10px) entre os dois. h-4/w-[5px]/rounded-full: mesma
// altura/cor/arredondamento em TODO card que a usa (pedido explícito de
// consistência). SEM ícone (pedido de uma tarefa posterior — só barrinha +
// texto; o componente tinha um ícone antes de cada título, removido daqui
// e de todos os 4 pontos que chamam este componente).
//
// `className` (opcional): o próprio wrapper deste componente — quem chama
// usa pra aplicar margem (`mb-3`/`mb-4`, cada card já tinha a sua) ou,
// em CursosRecomendados.tsx, `min-w-0` (pro título truncar com reticências
// em vez de sobrepor as setas de navegação ao lado, numa tela estreita).
// `truncate` no <h2> não tem efeito nenhum sem esse `min-w-0` vindo de
// fora — inofensivo nos outros 3 usos, que não têm essa disputa de espaço.
export default function CardTitulo({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-white', className)}>
      <span className="h-4 w-[5px] shrink-0 rounded-full bg-primary" aria-hidden="true" />
      <h2 className="truncate font-semibold">{children}</h2>
    </div>
  );
}
