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
  {
    bucket = PLATFORM_ASSETS_BUCKET,
    tamanhoMaximo = TAMANHO_MAXIMO_IMAGEM_BYTES,
    // Opcional: whitelist de MIME types (ex: ['image/jpeg', 'image/png',
    // 'image/webp']). Sem isso (undefined, default), só valida que É uma
    // imagem (image/*) — comportamento de sempre, pros chamadores que não
    // precisam restringir formato. Passar a lista é o jeito de restringir
    // sem mudar esse default pros outros usos já existentes deste helper.
    tiposPermitidos,
  }: { bucket?: string; tamanhoMaximo?: number; tiposPermitidos?: string[] } = {}
) {
  if (!arquivo || arquivo.size === 0) {
    throw new Error('Selecione uma imagem.');
  }
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('O arquivo precisa ser uma imagem.');
  }
  if (tiposPermitidos && !tiposPermitidos.includes(arquivo.type)) {
    throw new Error('Formato inválido. Envie um arquivo JPG, PNG ou WEBP.');
  }
  if (arquivo.size > tamanhoMaximo) {
    throw new Error(`A imagem deve ter no máximo ${Math.round(tamanhoMaximo / (1024 * 1024))}MB.`);
  }

  const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const caminho = `${caminhoBase}.${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  // TEMPORÁRIO — diagnóstico do "Invalid Compact JWS" relatado (item 2 do
  // pedido). Só o comprimento, nunca a chave em si. Remover depois de
  // confirmado o que está causando isso.
  console.log('tamanho da service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

  const { error: erroUpload } = await admin.storage.from(bucket).upload(caminho, bytes, {
    contentType: arquivo.type,
    upsert: true,
  });
  if (erroUpload) throw new Error(erroUpload.message);

  const { data: publico } = admin.storage.from(bucket).getPublicUrl(caminho);
  return `${publico.publicUrl}?v=${Date.now()}`;
}
