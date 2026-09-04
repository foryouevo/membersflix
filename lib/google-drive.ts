import { google } from 'googleapis';
import { createPrivateKey } from 'node:crypto';
import { driveEmbedUrlFromId } from '@/lib/drive-url';

export { isGoogleDriveUrl, extractDriveFileId, toDriveEmbedUrl } from '@/lib/drive-url';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
  webContentLink?: string | null;
  thumbnailLink?: string | null;
  size?: string | null;
}

/**
 * Normaliza a chave privada da Service Account antes de usar — cobre as
 * variações comuns de como esse valor chega quebrado via env var
 * (principalmente colado à mão no painel do Vercel), que produziriam o
 * erro genérico e pouco útil do OpenSSL/Node ("error:1E08010C:DECODER
 * routines::unsupported") sem dizer O QUE está errado:
 *
 * 1. .trim() nas pontas — espaço/quebra de linha extra colado sem querer
 *    antes do "-----BEGIN" ou depois do "-----END...-----" já é
 *    suficiente pra quebrar o parse do PEM.
 * 2. Aspas envolvendo o valor inteiro (") — se alguém colou o valor
 *    JÁ com as aspas do .env.local.example (`"-----BEGIN...\n...-----"`)
 *    dentro do campo do Vercel, essas aspas viram parte LITERAL da
 *    string (o painel do Vercel não as trata como delimitador — isso só
 *    existe num arquivo .env de verdade). Removidas aqui se estiverem
 *    presentes nas duas pontas.
 * 3. "\n" literal (dois caracteres, barra invertida + n) → quebra de
 *    linha real — é assim que a chave normalmente chega colada numa env
 *    var de uma linha só. Sem essa troca, o PEM vira uma única linha
 *    gigante, sem as quebras que o parser exige entre cabeçalho, corpo em
 *    base64 e rodapé.
 *
 * Um .trim() final cobre espaço que a troca de \n possa ter deixado
 * sobrando nas pontas de novo.
 */
function normalizarChavePrivada(valor: string): string {
  let chave = valor.trim();
  if (chave.length >= 2 && chave.startsWith('"') && chave.endsWith('"')) {
    chave = chave.slice(1, -1).trim();
  }
  return chave.replace(/\\n/g, '\n').trim();
}

/**
 * Diagnóstico seguro pra log de erro — nunca inclui a chave em si (nem um
 * pedaço dela), só metadados que ajudam a identificar qual variação de
 * formatação causou o problema, sem vazar segredo nenhum em log.
 */
function diagnosticoChave(chave: string) {
  return {
    tamanho: chave.length,
    comecaComBegin: chave.startsWith('-----BEGIN PRIVATE KEY-----'),
    terminaComEnd: chave.endsWith('-----END PRIVATE KEY-----'),
    numeroDeLinhas: chave.split('\n').length,
  };
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      'Credenciais do Google Drive não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).'
    );
  }

  const key = normalizarChavePrivada(rawKey);

  // Checagem rápida e específica (markers ausentes = quase sempre \n não
  // virou quebra de linha, ou aspas não removidas) ANTES da checagem
  // completa abaixo — dá uma mensagem mais direta pro caso mais comum.
  if (!key.startsWith('-----BEGIN PRIVATE KEY-----') || !key.endsWith('-----END PRIVATE KEY-----')) {
    console.error(
      '[google-drive] GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não tem os marcadores "-----BEGIN/END PRIVATE KEY-----" esperados depois de normalizada (trim + remoção de aspas envolventes + \\n → quebra de linha real). Diagnóstico (sem expor a chave):',
      diagnosticoChave(key)
    );
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY malformada (marcadores PEM ausentes) — ver log do servidor pro diagnóstico.'
    );
  }

  // Validação de verdade: usa o MESMO parser PEM/DER que o Node/OpenSSL
  // usaria ao assinar o JWT (é exatamente aí que "error:1E08010C:DECODER
  // routines::unsupported" acontece hoje, só que sem contexto nenhum, do
  // lado de dentro da lib googleapis). Fazendo essa checagem aqui, o mesmo
  // erro (se a chave realmente estiver corrompida — não só sem os
  // marcadores, mas com o conteúdo base64 do meio truncado/alterado) é
  // pego imediatamente, num lugar que loga o diagnóstico antes de propagar.
  try {
    createPrivateKey({ key, format: 'pem' });
  } catch (err) {
    console.error(
      '[google-drive] GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tem os marcadores PEM mas não pôde ser decodificada (conteúdo corrompido/truncado no meio). Diagnóstico (sem expor a chave):',
      diagnosticoChave(key)
    );
    throw err;
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Lista o conteúdo direto (não-recursivo) de uma pasta do Drive, ordenado por nome. */
export async function listFolderContents(folderId: string): Promise<DriveFile[]> {
  const drive = getDrive();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, size)',
      orderBy: 'name_natural',
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    files.push(...((res.data.files as DriveFile[]) ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export function isFolder(file: DriveFile) {
  return file.mimeType === FOLDER_MIME;
}

export function isVideo(file: DriveFile) {
  return file.mimeType.startsWith('video/');
}

/**
 * URL de embed para tocar o vídeo — só funciona dentro de um <iframe>
 * (.../file/d/FILE_ID/preview). O Drive não expõe um link de streaming direto
 * utilizável em <video>/react-player, então é isto que deve ser salvo em
 * aulas.video_url quando video_origem = 'drive'.
 */
export function drivePreviewUrl(fileId: string) {
  return driveEmbedUrlFromId(fileId);
}

/** @deprecated use drivePreviewUrl — mantido só para não quebrar imports antigos. */
export const driveStreamUrl = drivePreviewUrl;

export function driveThumbnailUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w480`;
}

/**
 * Busca o CONTEÚDO (bytes) de um arquivo do Drive via Service Account
 * (files.get?alt=media) — usado só pelo proxy de streaming
 * (app/api/membros/aulas/[aulaId]/video/stream/route.ts), pra servir o
 * vídeo pro aluno sem o arquivo precisar estar público no Drive ("qualquer
 * pessoa com o link"). Sem relação com listFolderContents (import do
 * admin, acima — esse só lista metadados, nunca baixa conteúdo).
 *
 * Repassa o header Range recebido do navegador pro Drive — é isso que
 * permite avançar/voltar o vídeo sem baixar o arquivo inteiro de novo: o
 * Drive responde com 206 Partial Content + Content-Range quando honra o
 * range pedido (arquivos de vídeo normalmente honram). Sem Range nenhum
 * (primeira carga, dependendo do navegador), devolve o arquivo completo
 * com 200 — o vídeo ainda toca normalmente nesse caso, só sem o ganho de
 * já anunciar o tamanho total via Content-Range de cara.
 *
 * responseType: 'stream' é o que evita carregar o arquivo inteiro na
 * memória do servidor antes de repassar pro navegador — os bytes vão
 * sendo lidos e reenviados conforme chegam do Drive (streaming de
 * verdade), importante pra não estourar memória/tempo de execução da
 * function serverless em vídeos grandes.
 *
 * Accept-Encoding: identity — ESSENCIAL, era a causa do vídeo chegar
 * corrompido (faixa branca/artefatos): sem isso, se o Drive (ou o CDN dele)
 * decidisse comprimir a resposta (gzip/br), `responseType: 'stream'` NÃO
 * descomprime automaticamente — o stream repassado continuaria com os
 * bytes comprimidos, mas o Content-Type devolvido pro navegador seguiria
 * "video/mp4". O navegador tentava decodificar bytes gzip como se fossem
 * H.264 cru, produzindo exatamente esse tipo de corrupção visual — e o
 * Content-Length que a gente repassava (calculado sobre os bytes
 * comprimidos) não batia com o tamanho real depois de qualquer
 * decodificação, então mesmo pedidos sem Range (carga completa, não só
 * seek) já vinham quebrados. Forçando identity, o Drive nunca comprime a
 * resposta — os bytes do stream são sempre o vídeo cru, e Content-Length/
 * Content-Range (abaixo) sempre correspondem exatamente a eles.
 */
export async function streamDriveFile(fileId: string, range?: string | null) {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    {
      responseType: 'stream',
      headers: {
        'Accept-Encoding': 'identity',
        ...(range ? { Range: range } : {}),
      },
    }
  );
  return {
    stream: res.data as unknown as NodeJS.ReadableStream,
    status: res.status,
    headers: res.headers as Record<string, string>,
  };
}
