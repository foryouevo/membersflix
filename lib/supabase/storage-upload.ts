import type { SupabaseClient } from '@supabase/supabase-js';

// Server-only. Usado pelas server actions de upload de imagem (banner
// institucional, capa/thumbnail de curso, etc.) — valida o arquivo, sobe pro
// bucket público 'platform-assets' e devolve a URL pública já com
// cache-busting (necessário porque o caminho costuma ser reaproveitado via
// upsert, então sem isso o navegador/CDN poderia continuar servindo a
// imagem antiga depois de trocar).

export const PLATFORM_ASSETS_BUCKET = 'platform-assets';
export const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadImagemPublica(
  admin: SupabaseClient,
  arquivo: File,
  caminhoBase: string,
  { bucket = PLATFORM_ASSETS_BUCKET, tamanhoMaximo = TAMANHO_MAXIMO_IMAGEM_BYTES } = {}
) {
  if (!arquivo || arquivo.size === 0) {
    throw new Error('Selecione uma imagem.');
  }
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('O arquivo precisa ser uma imagem.');
  }
  if (arquivo.size > tamanhoMaximo) {
    throw new Error(`A imagem deve ter no máximo ${Math.round(tamanhoMaximo / (1024 * 1024))}MB.`);
  }

  const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const caminho = `${caminhoBase}.${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  const { error: erroUpload } = await admin.storage.from(bucket).upload(caminho, bytes, {
    contentType: arquivo.type,
    upsert: true,
  });
  if (erroUpload) throw new Error(erroUpload.message);

  const { data: publico } = admin.storage.from(bucket).getPublicUrl(caminho);
  return `${publico.publicUrl}?v=${Date.now()}`;
}
