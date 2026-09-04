'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { uploadImagemPublica } from '@/lib/supabase/storage-upload';

const BANNER_PATH_PREFIX = 'configuracoes/banner-plataforma';
const BANNER_HOME_PATH_PREFIX = 'configuracoes/banner-home';
const HERO_DESTAQUE_PATH_PREFIX = 'configuracoes/hero-destaque';
// Whitelist do upload do hero em destaque (item explícito do pedido — os
// outros uploads desta tela aceitam qualquer image/*, esse não).
const HERO_DESTAQUE_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const LOGIN_BACKGROUND_PATH_PREFIX = 'configuracoes/login-background';
// Mesma whitelist do hero em destaque — pedido explícito (jpg/png/webp).
const LOGIN_BACKGROUND_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
   const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle() as { data: { tipo: string } | null };
  if ((profile as any)?.tipo !== 'admin') throw new Error('Acesso negado.');
}

export async function salvarNumeroWhatsapp(numero: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('configuracoes').update({ numero_whatsapp: numero }).eq('id', 1);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/membros/vitrine');
}

export interface RodapeLoginInput {
  desenvolvido_por: string;
  email_contato: string;
  telefone_contato: string;
  termos_uso_url: string;
}

export async function salvarRodapeLogin(input: RodapeLoginInput) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('configuracoes')
    .update({
      desenvolvido_por: input.desenvolvido_por || null,
      email_contato: input.email_contato || null,
      telefone_contato: input.telefone_contato || null,
      termos_uso_url: input.termos_uso_url || null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/login');
}

export async function uploadBannerPlataforma(formData: FormData) {
  await assertAdmin();

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) throw new Error('Selecione uma imagem.');

  const admin = createAdminClient();
  const url = await uploadImagemPublica(admin, arquivo, BANNER_PATH_PREFIX);

  const { error: erroSalvar } = await admin.from('configuracoes').update({ banner_plataforma_url: url }).eq('id', 1);
  if (erroSalvar) throw new Error(erroSalvar.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/membros/vitrine');
  return url;
}

export interface BannerHomeTextoInput {
  banner_badge: string;
  banner_resumo: string;
}

export async function salvarBannerHomeTexto(input: BannerHomeTextoInput) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('configuracoes')
    .update({
      banner_badge: input.banner_badge || null,
      banner_resumo: input.banner_resumo || null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/membros/vitrine');
}

export async function uploadBannerHomeCapa(formData: FormData) {
  await assertAdmin();

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) throw new Error('Selecione uma imagem.');

  const admin = createAdminClient();
  const url = await uploadImagemPublica(admin, arquivo, BANNER_HOME_PATH_PREFIX);

  const { error: erroSalvar } = await admin.from('configuracoes').update({ banner_capa_url: url }).eq('id', 1);
  if (erroSalvar) throw new Error(erroSalvar.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/membros/vitrine');
  return url;
}

// Imagem de fundo do hero em destaque da Home (CursoDestaque) — campo
// próprio (hero_destaque_url), isolado de cursos.capa_url e de
// banner_capa_url (ver migração 008_hero_destaque_home.sql). Só aceita
// jpg/png/webp (tiposPermitidos), diferente dos outros uploads desta tela.
export async function uploadHeroDestaque(formData: FormData) {
  await assertAdmin();

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) throw new Error('Selecione uma imagem.');

  const admin = createAdminClient();
  const url = await uploadImagemPublica(admin, arquivo, HERO_DESTAQUE_PATH_PREFIX, {
    tiposPermitidos: HERO_DESTAQUE_TIPOS_PERMITIDOS,
  });

  const { error: erroSalvar } = await admin.from('configuracoes').update({ hero_destaque_url: url }).eq('id', 1);
  if (erroSalvar) throw new Error(erroSalvar.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/membros/vitrine');
  return url;
}

// "Remover": limpa o campo no banco (fundo sólido escuro assume no hero, ver
// CursoDestaque.tsx) — não apaga o arquivo do Storage (o path é fixo/upsert,
// então um novo upload já sobrescreve o antigo; manter o arquivo órfão não
// atrapalha nada e evita a complexidade de rastrear a extensão exata pra
// deletar certo).
export async function removerHeroDestaque() {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('configuracoes').update({ hero_destaque_url: null }).eq('id', 1);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/membros/vitrine');
}

// Imagem de fundo da tela de login — campo próprio (login_background_url),
// ver migração 009_login_background.sql. Sem valor, a tela de login cai no
// fallback estático /hero-destaque.png (app/login/page.tsx). Só aceita
// jpg/png/webp (tiposPermitidos), igual ao upload do hero em destaque.
export async function uploadLoginBackground(formData: FormData) {
  await assertAdmin();

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) throw new Error('Selecione uma imagem.');

  // TEMPORÁRIO — log de diagnóstico pro erro "Invalid Compact JWS" relatado
  // (item 3 do pedido: capturar o erro completo antes do catch genérico do
  // client, que só vê `err.message`). Remover depois de confirmado o que
  // está causando isso — não é lógica permanente.
  const admin = createAdminClient();
  let url: string;
  try {
    url = await uploadImagemPublica(admin, arquivo, LOGIN_BACKGROUND_PATH_PREFIX, {
      tiposPermitidos: LOGIN_BACKGROUND_TIPOS_PERMITIDOS,
    });
  } catch (err) {
    console.error('[uploadLoginBackground] Falha no upload pro Storage — erro completo:', err);
    throw err;
  }

  const { error: erroSalvar } = await admin
    .from('configuracoes')
    .update({ login_background_url: url, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (erroSalvar) {
    console.error('[uploadLoginBackground] Falha ao salvar login_background_url — erro completo:', erroSalvar);
    throw new Error(erroSalvar.message);
  }

  revalidatePath('/admin/configuracoes');
  revalidatePath('/login');
  return url;
}

// "Remover": limpa o campo no banco — a tela de login volta pro fallback
// estático /hero-destaque.png na hora (não apaga o arquivo do Storage, mesmo
// motivo do removerHeroDestaque acima: path fixo/upsert, um novo upload já
// sobrescreve, manter o órfão não atrapalha).
export async function removerLoginBackground() {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('configuracoes')
    .update({ login_background_url: null, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/configuracoes');
  revalidatePath('/login');
}
