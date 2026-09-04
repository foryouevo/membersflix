import { google } from 'googleapis';
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

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      'Credenciais do Google Drive não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).'
    );
  }

  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
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
 */
export async function streamDriveFile(fileId: string, range?: string | null) {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream', headers: range ? { Range: range } : undefined }
  );
  return {
    stream: res.data as unknown as NodeJS.ReadableStream,
    status: res.status,
    headers: res.headers as Record<string, string>,
  };
}
