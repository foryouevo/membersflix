// Rota NOVA (/inicio, pedido explícito) — MESMA página que
// app/membros/vitrine/page.tsx (que continua existindo em /membros/vitrine)
// — reexporta o componente direto, sem duplicar nada: nenhum dado/lógica
// desta página depende de qual segmento de URL a serviu.
export { default } from '@/app/membros/vitrine/page';
