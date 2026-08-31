'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { uploadImagemPublica } from '@/lib/supabase/storage-upload';

const BANNER_PATH_PREFIX = 'configuracoes/banner-plataforma';
const BANNER_HOME_PATH_PREFIX = 'configuracoes/banner-home';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle();
  if (profile?.tipo !== 'admin') throw new Error('Acesso negado.');
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
