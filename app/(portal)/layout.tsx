import MembrosLayoutShell from '@/components/membros/MembrosLayoutShell';

// Route group "(portal)" — as parênteses NÃO entram na URL (Next.js App
// Router): as páginas aqui dentro vivem em /inicio, /cursos, /perfil,
// /curso/[slug]... de verdade, sem nenhum prefixo /portal. Existe só pra
// estas páginas poderem compartilhar ESTE layout.tsx (mesmo
// header/bottomnav/checagem de sessão que a área /membros/* já usa, via
// MembrosLayoutShell — nenhuma lógica duplicada) sem precisar ficar dentro
// da pasta app/membros/, que teria empurrado a URL pra /membros/inicio em
// vez de /inicio.
export default MembrosLayoutShell;
