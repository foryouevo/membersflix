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
  created_at: string;
}

export interface Aula {
  id: string;
  modulo_id: string;
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

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      categorias: { Row: Categoria; Insert: Partial<Categoria>; Update: Partial<Categoria> };
      cursos: { Row: Curso; Insert: Partial<Curso>; Update: Partial<Curso> };
      modulos: { Row: Modulo; Insert: Partial<Modulo>; Update: Partial<Modulo> };
      aulas: { Row: Aula; Insert: Partial<Aula>; Update: Partial<Aula> };
      documentos: { Row: Documento; Insert: Partial<Documento>; Update: Partial<Documento> };
      acessos_curso: { Row: AcessoCurso; Insert: Partial<AcessoCurso>; Update: Partial<AcessoCurso> };
      progresso_aulas: { Row: ProgressoAula; Insert: Partial<ProgressoAula>; Update: Partial<ProgressoAula> };
      configuracoes: { Row: Configuracoes; Insert: Partial<Configuracoes>; Update: Partial<Configuracoes> };
      vitrine_secoes: { Row: VitrineSecao; Insert: Partial<VitrineSecao>; Update: Partial<VitrineSecao> };
      vitrine_secao_cursos: { Row: VitrineSecaoCurso; Insert: Partial<VitrineSecaoCurso>; Update: Partial<VitrineSecaoCurso> };
    };
  };
}
