// Rota NOVA (/perfil, pedido explícito) — MESMA página que
// app/membros/perfil/page.tsx (que continua existindo em /membros/perfil)
// — reexporta o componente direto, sem duplicar nada: nenhum dado/lógica
// desta página depende de qual segmento de URL a serviu.
export { default } from '@/app/membros/perfil/page';
