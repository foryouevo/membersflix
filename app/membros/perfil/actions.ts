'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadImagemPublica } from '@/lib/supabase/storage-upload';

/**
 * Diferente das actions de admin (que exigem tipo='admin'), essa é
 * "self-service": qualquer usuário autenticado pode chamar, mas só consegue
 * editar o PRÓPRIO perfil — a identidade vem da sessão (cookie), verificada
 * aqui no servidor, nunca de um id passado pelo client. Usa o client admin
 * só porque o upload de avatar precisa de service role (o bucket
 * 'platform-assets' só aceita escrita via server action, ver
 * lib/supabase/storage-upload.ts) — mas o update em `profiles` continua
 * restrito ao `user.id` de quem chamou, então não abre brecha nenhuma pra
 * editar o perfil de outra pessoa.
 */
async function getUsuarioAtual() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  return user;
}

export async function atualizarMeuPerfil(formData: FormData) {
  const user = await getUsuarioAtual();

  const nome = String(formData.get('nome') ?? '').trim();
  const telefone = String(formData.get('telefone') ?? '').trim();
  const arquivo = formData.get('avatar');

  if (!nome) throw new Error('O nome não pode ficar vazio.');

  const admin = createAdminClient();
  const update: { nome: string; telefone: string | null; avatar_url?: string } = {
    nome,
    telefone: telefone || null,
  };

  if (arquivo instanceof File && arquivo.size > 0) {
    update.avatar_url = await uploadImagemPublica(admin, arquivo, `avatars/${user.id}`, { tamanhoMaximo: 3 * 1024 * 1024 });
  }

  const { error } = await admin.from('profiles').update(update).eq('id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/membros/perfil');
  // avatar/nome também aparecem na sidebar em todo o resto da área de membros
  revalidatePath('/membros', 'layout');

  return { avatarUrl: update.avatar_url ?? null };
}
