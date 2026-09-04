import { NextResponse, type NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { createClient } from '@/lib/supabase/server';
import { extractDriveFileId, streamDriveFile } from '@/lib/google-drive';

// Precisa do runtime Node (não Edge): usa `googleapis` (client HTTP próprio,
// não roda no Edge) e `node:stream` pra converter o stream do Drive num
// ReadableStream que a Response entende. 'nodejs' já é o padrão do App
// Router, mas deixado explícito porque essa rota depende disso pra existir.
export const runtime = 'nodejs';

/**
 * Proxy de streaming pro conteúdo REAL do vídeo (bytes, não metadado) —
 * é esta URL que a tag <video> (dentro do CustomVideoPlayer, via
 * react-player) busca diretamente, não um fetch() do componente. Só existe
 * pra aulas de origem Drive: os arquivos do Drive voltaram a ficar com
 * permissão RESTRITA (compartilhados só com o e-mail da Service Account —
 * ver lib/google-drive.ts) — sem esse proxy, o navegador do aluno não
 * teria como buscar o arquivo em lugar nenhum, já que ele mesmo não tem
 * (nem deve ter) acesso direto ao Drive.
 *
 * A mesma checagem de acesso do endpoint de metadado (../route.ts) é
 * repetida aqui — não dá pra confiar que quem chegou até aqui já passou
 * por lá: a tag <video> faz suas PRÓPRIAS requisições HTTP direto pra essa
 * URL (inclusive as requisições de Range subsequentes, ao avançar o
 * vídeo), sem reexecutar o fetch() inicial do componente — então cada uma
 * delas precisa validar sessão + RLS de novo. O cookie de sessão do
 * Supabase vai junto automaticamente (mesma origem), então isso não exige
 * nada especial no <video>/react-player.
 */
export async function GET(request: NextRequest, { params }: { params: { aulaId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  // Mesma RLS de sempre (ver ../route.ts) — só volta a linha se o aluno
  // tiver acesso liberado ao curso dessa aula, ou for admin.
  const { data: aula, error } = (await supabase
    .from('aulas')
    .select('video_url, video_origem')
    .eq('id', params.aulaId)
    .maybeSingle()) as { data: { video_url: string | null; video_origem: string } | null; error: any };

  if (error || !aula || !aula.video_url) {
    return NextResponse.json({ error: 'Vídeo não encontrado ou sem acesso.' }, { status: 404 });
  }

  if (aula.video_origem !== 'drive') {
    // Upload/URL externa não passam por aqui — o player usa a URL direta
    // (ver ../route.ts). Chegar aqui com outra origem só acontece com uso
    // indevido da rota (ex.: alguém colando essa URL manualmente).
    return NextResponse.json({ error: 'Esta aula não usa streaming via Drive.' }, { status: 400 });
  }

  const fileId = extractDriveFileId(aula.video_url);
  if (!fileId) {
    return NextResponse.json({ error: 'Não foi possível identificar o arquivo do Drive.' }, { status: 500 });
  }

  try {
    const range = request.headers.get('range');
    const { stream, status, headers } = await streamDriveFile(fileId, range);

    // Node stream → Web ReadableStream: é o formato que o corpo de uma
    // Response (App Router) espera — sem essa conversão, não dá pra
    // encaminhar os bytes conforme chegam (ia exigir juntar tudo num
    // buffer antes de responder, exatamente o que queremos evitar em
    // vídeos grandes/streaming).
    const webStream = Readable.toWeb(stream as Readable) as unknown as ReadableStream;

    const respHeaders = new Headers();
    respHeaders.set('Content-Type', headers['content-type'] ?? 'video/mp4');
    respHeaders.set('Accept-Ranges', 'bytes');
    if (headers['content-length']) respHeaders.set('Content-Length', headers['content-length']);
    if (headers['content-range']) respHeaders.set('Content-Range', headers['content-range']);
    // Vídeo de aula: nunca cacheável por proxy/CDN compartilhado — ficaria
    // servindo o mesmo arquivo pra qualquer aluno que batesse nessa URL,
    // sem checar acesso de novo. Cache só no navegador de quem já passou
    // pela checagem de acesso acima.
    respHeaders.set('Cache-Control', 'private, no-store');

    return new NextResponse(webStream, { status, headers: respHeaders });
  } catch (err: any) {
    // Erro mais comum aqui: arquivo não compartilhado com o e-mail da
    // Service Account (ver GOOGLE_SERVICE_ACCOUNT_EMAIL) — o Drive responde
    // 403/404 nesse caso, não um erro de rede genérico.
    console.error(`[video/stream] Falha ao buscar arquivo do Drive (aula ${params.aulaId}):`, err?.message ?? err);
    return NextResponse.json({ error: 'Não foi possível carregar o vídeo.' }, { status: 502 });
  }
}
