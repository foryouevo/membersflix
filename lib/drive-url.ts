/**
 * Utilitários puros (sem dependências server-only) para detectar e normalizar
 * URLs do Google Drive. Vídeos hospedados no Drive só reproduzem dentro de um
 * <iframe> apontando para .../file/d/FILE_ID/preview — não é possível usar uma
 * tag <video> comum (nem mesmo com o link "uc?export=download"), pois o Drive
 * exige o player embutido dele mesmo (autenticação/streaming por trás do preview).
 *
 * Este arquivo é seguro para import em componentes client — não importa
 * 'googleapis' nem nada que dependa de Node.
 */

const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com'];

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return DRIVE_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Extrai o FILE_ID de qualquer formato comum de link do Drive. */
export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // .../file/d/FILE_ID/(preview|view|edit)
    /[?&]id=([a-zA-Z0-9_-]+)/, // ...?id=FILE_ID (open?id=, uc?id=)
    /\/d\/([a-zA-Z0-9_-]+)/, // fallback genérico
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Monta a URL de embed (.../file/d/FILE_ID/preview) a partir de um FILE_ID. */
export function driveEmbedUrlFromId(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** Converte qualquer link do Drive (view, uc?id=, open?id=, já em preview...) para o formato de embed. */
export function toDriveEmbedUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return driveEmbedUrlFromId(fileId);
}
