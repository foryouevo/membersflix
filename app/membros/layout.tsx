import MembrosLayoutShell from '@/components/membros/MembrosLayoutShell';

// Corpo (auth + profile/config/categorias/instrutores + MembrosChrome)
// extraído pra MembrosLayoutShell.tsx — reaproveitado também por
// app/(portal)/layout.tsx (rotas novas /inicio, /cursos, /perfil,
// /curso/[slug]...), sem duplicar a lógica em dois layout.tsx.
export default MembrosLayoutShell;
