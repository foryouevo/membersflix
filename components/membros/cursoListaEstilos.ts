// Classes compartilhadas entre VitrinePageClient (Home) e BuscarPageClient
// (tela de busca dedicada) pros swipers/títulos de "Todos os Cursos" — as
// duas telas renderizam a mesma seção agrupada por categoria, só a origem
// dos cursos (todos vs já filtrados pela busca) muda.

// Largura de cada card em % do carrossel (flex-basis), por breakpoint —
// controla quantos cards ficam visíveis de uma vez. Mobile (<640px, mesmo
// breakpoint `sm` já usado no resto do projeto): 1 card só, sem fatia do
// próximo — arrastar/deslizar e as setas (ativas/desativadas) continuam
// funcionando normalmente, só não tem mais peek do card seguinte. A partir
// de 640px (tablet/notebook, incluindo a faixa ~1024–1366px que antes caía
// no breakpoint `xl` de 1280px do Tailwind e já mostrava 4): 3. Só a partir
// de 1366px (desktop grande) — breakpoint arbitrário via `min-[1366px]:`, o
// Tailwind não tem um nomeado nessa largura — é que aumenta pra 4.
export const CARD_BASIS_CLASSES = 'flex-[0_0_100%] sm:flex-[0_0_32%] min-[1366px]:flex-[0_0_24%]';

// Estilo do h2 "Meus Cursos"/"Todos os Cursos" (título principal da seção).
export const TITULO_SECAO_CLASSNAME = 'ml-[10px] text-[1.6rem] font-bold text-white';

// Subtítulo de cada nicho/categoria dentro de "Todos os Cursos" (ex:
// "Criação e Edição de Vídeos") — mais discreto que o título principal:
// menor, sem negrito, na cor secundária do tema (text-on-variant = #a0a0a0,
// mesmo rgb(160 160 160) pedido).
export const TITULO_CATEGORIA_CLASSNAME = 'ml-[10px] text-base font-normal text-on-variant';
