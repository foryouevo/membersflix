export type UserTipo = 'admin' | 'aluno';
export type StatusPagamento = 'pendente' | 'pago';
export type VideoOrigem = 'upload' | 'url_externa' | 'drive';
export type VitrineSecaoTipo = 'continue_watching' | 'dinamica' | 'custom';
export type CursoStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  tipo: UserTipo;
  status_pagamento: StatusPagamento;
  liberado_em: string;
  bloqueado: boolean;
  // true só pra contas criadas pelo próprio aluno na tela de login (aba
  // "Cadastra-se") — false (default) pra toda conta criada pelo admin
  // (app/admin/alunos/actions.ts). Diferencia qual regra de bloqueio
  // pós-trial de 30min se aplica: conta inteira (false, ver
  // bloquear_pagamentos_pendentes) ou só o curso escolhido (true, ver
  // bloquear_acessos_curso_pendentes) — migration 012.
  cadastro_publico: boolean;
  created_at: string;
}

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  created_at: string;
}

export interface Curso {
  id: string;
  // Gerado automaticamente pelo banco (trigger, ver
  // supabase/migrations/011_slugs_curso_aula.sql) a partir de `titulo` na
  // criação — nunca muda depois, mesmo que o título seja editado (URL
  // estável). Usado nas rotas novas /curso/[slug] (ver app/(portal)/).
  slug: string;
  titulo: string;
  descricao: string | null;
  categoria_id: string | null;
  capa_url: string | null;
  thumbnail_url: string | null;
  instrutor_nome: string | null;
  instrutor_bio: string | null;
  instrutor_avatar_url: string | null;
  status: CursoStatus;
  mensagem_whatsapp: string;
  drive_folder_id: string | null;
  ordem: number;
  created_at: string;
  categoria?: Categoria | null;
}

export interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  capa_url: string | null;
  ordem: number;
  drive_folder_id: string | null;
  // Hierarquia de 2 níveis: null = módulo raiz (ou "pai"/guarda-chuva);
  // preenchido = este módulo é filho do módulo com esse id. Um módulo pai
  // nunca tem aula própria — as aulas ficam sempre nos filhos.
  modulo_pai_id: string | null;
  created_at: string;
}

export interface Aula {
  id: string;
  modulo_id: string;
  // Mesma ideia de Curso.slug acima — gerado pelo mesmo tipo de trigger
  // (gerar_slug_aula), único GLOBALMENTE (não só dentro do módulo/curso).
  slug: string;
  titulo: string;
  descricao: string | null;
  video_origem: VideoOrigem;
  video_url: string | null;
  thumbnail_url: string | null;
  duracao_segundos: number;
  drive_file_id: string | null;
  ordem: number;
  created_at: string;
}

export interface Documento {
  id: string;
  aula_id: string;
  nome: string;
  url: string;
  tipo: string | null;
  tamanho_bytes: number | null;
  drive_file_id: string | null;
  created_at: string;
}

export interface AcessoCurso {
  id: string;
  aluno_id: string;
  curso_id: string;
  bloqueado: boolean;
  liberado_em: string;
  created_at: string;
  curso?: Curso;
}

export interface ProgressoAula {
  id: string;
  aluno_id: string;
  aula_id: string;
  curso_id: string;
  concluida: boolean;
  segundo_atual: number;
  atualizado_em: string;
}

export interface Configuracoes {
  id: number;
  numero_whatsapp: string | null;
  banner_plataforma_url: string | null;
  desenvolvido_por: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  termos_uso_url: string | null;
  banner_capa_url: string | null;
  banner_badge: string | null;
  banner_resumo: string | null;
  // Fundo do hero em destaque da Home (CursoDestaque) — campo próprio,
  // isolado de cursos.capa_url e de banner_capa_url (ver migração
  // 008_hero_destaque_home.sql).
  hero_destaque_url: string | null;
  // Fundo da tela de login — sem valor, cai no fallback estático
  // /hero-destaque.png (ver migração 009_login_background.sql).
  login_background_url: string | null;
  updated_at: string;
}

export interface VitrineSecao {
  id: string;
  titulo: string;
  tipo: VitrineSecaoTipo;
  categoria_id: string | null;
  ordem: number;
  created_at: string;
}

export interface VitrineSecaoCurso {
  id: string;
  secao_id: string;
  curso_id: string;
  ordem: number;
}

export type { Database } from './database.types';
