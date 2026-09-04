import { NextResponse, type NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { createClient } from '@/lib/supabase/server';
import { extractDriveFileId, streamDriveFile } from '@/lib/google-drive';

// Precisa do runtime Node (não Edge): usa `googleapis` (client HTTP próprio,
// não roda no Edge) e `node:stream` pra converter o stream do Drive num
// ReadableStream que a Response entende. 'nodejs' já é o padrão do App
// Router, mas deixado explícito porque essa rota depende disso pra existir.
export const runtime = 'nodejs';

// Busca um header devolvido pelo axios/gaxios (client HTTP usado por
// `googleapis`) sem depender de qual variação de maiúsculas/minúsculas ele
// normalizou a chave — na prática vem sempre em minúsculas, mas ler com
// segurança aqui custa nada e elimina de vez essa dúvida como suspeita de
// bug (Content-Length/Content-Range "incorretos" por causa da chave errada).
function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const chaveAlvo = name.toLowerCase();
  for (const chave in headers) {
    if (chave.toLowerCase() === chaveAlvo) return headers[chave];
  }
  return undefined;
}

/**
 * Faz o parse manual de um header Range (formatos que navegadores mandam:
 * "bytes=START-END", "bytes=START-" e "bytes=-SUFFIXLENGTH") — usado só
 * quando o Drive NÃO honrou o Range que a gente pediu (ver comentário mais
 * abaixo, no bloco que decide entre repassar o corte do Drive ou fazer o
 * nosso próprio). Quando o Drive já responde 206 corretamente, o
 * Content-Range que ELE calculou é usado direto, sem reinventar essa conta.
 */
function parseRangeHeader(range: string, totalSize: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  if (startStr === '' && endStr === '') return null;

  let start: number;
  let end: number;

  if (startStr === '') {
    // "bytes=-N" = últimos N bytes do arquivo.
    const suffixLength = Number(endStr);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    start = Number(startStr);
    end = endStr === '' ? totalSize - 1 : Number(endStr);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= totalSize) return null;
  return { start, end: Math.min(end, totalSize - 1) };
}

/**
 * Recorta um stream Node pra só emitir os bytes entre `start` e `end`
 * (índices absolutos no arquivo, inclusive nas duas pontas) — é o que
 * garante o Range request pro navegador quando o Drive devolveu o arquivo
 * inteiro (200) em vez do pedaço certo (206) que a gente pediu: em vez de
 * confiar cegamente que o Drive honra Range (nem sempre honra — foi essa
 * suposição que quebrava o avanço/pulo do vídeo antes), a gente mesmo
 * descarta os bytes antes de `start`, repassa só até `end`, e para de ler
 * (destruindo a conexão com o Drive) assim que os bytes pedidos terminam —
 * não continua baixando o resto do arquivo à toa quando o navegador só
 * queria um pedaço do meio.
 */
async function* recortarBytes(source: NodeJS.ReadableStream, start: number, end: number) {
  let lido = 0;
  for await (const chunkAny of source as AsyncIterable<Buffer | string>) {
    const chunk = Buffer.isBuffer(chunkAny) ? chunkAny : Buffer.from(chunkAny);
    const inicioChunk = lido;
    const fimChunk = lido + chunk.length - 1;
    lido += chunk.length;

    if (fimChunk < start) continue; // chunk inteiro antes do range pedido — descarta
    if (inicioChunk > end) break; // já passou do range pedido — para de ler

    const recorteInicio = Math.max(0, start - inicioChunk);
    const recorteFim = Math.min(chunk.length, end - inicioChunk + 1);
    yield chunk.subarray(recorteInicio, recorteFim);

    if (fimChunk >= end) break; // terminou de emitir o range pedido
  }
  // Sem isso, sair do loop mais cedo (break) deixaria o download do
  // restante do arquivo continuando em segundo plano até o fim, gastando
  // tempo/banda à toa com bytes que o navegador nem pediu.
  const destruivel = source as unknown as { destroy?: () => void };
  destruivel.destroy?.();
}

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
    const rangeSolicitado = request.headers.get('range');
    const { stream, status, headers } = await streamDriveFile(fileId, rangeSolicitado);

    const contentType = getHeader(headers, 'content-type') ?? 'video/mp4';
    const contentEncoding = getHeader(headers, 'content-encoding');
    const contentLengthDrive = getHeader(headers, 'content-length');
    const contentRangeDrive = getHeader(headers, 'content-range');

    let bodyStream: NodeJS.ReadableStream = stream;
    let statusFinal = 200;
    let contentRangeFinal: string | undefined;
    let contentLengthFinal = contentLengthDrive;

    if (rangeSolicitado && status === 206 && contentRangeDrive) {
      // Caminho feliz: o Drive honrou o Range e já devolveu 206 + o pedaço
      // certo — só repassa o que ele calculou, sem reinventar nada.
      statusFinal = 206;
      contentRangeFinal = contentRangeDrive;
      // contentLengthFinal já é o do Drive, que pra uma 206 já é o tamanho
      // do pedaço (não do arquivo inteiro).
    } else if (rangeSolicitado && contentLengthDrive) {
      // O navegador pediu um Range, mas o Drive NÃO honrou (devolveu o
      // arquivo inteiro, 200) — em vez de repassar isso como um 200 (o que
      // diz pro navegador "este servidor não suporta partes", e é
      // exatamente o que travava o avanço/pulo do vídeo antes), a gente
      // mesmo corta o stream pro pedaço pedido e monta um 206 de verdade.
      // contentLengthDrive numa resposta 200 é o TAMANHO TOTAL do arquivo —
      // é o que `parseRangeHeader` precisa pra resolver ranges abertos
      // ("bytes=1000-", sem fim explícito) e o formato de sufixo.
      const total = Number(contentLengthDrive);
      const parsed = Number.isFinite(total) ? parseRangeHeader(rangeSolicitado, total) : null;

      if (parsed) {
        const { start, end } = parsed;
        bodyStream = Readable.from(recortarBytes(stream, start, end));
        statusFinal = 206;
        contentRangeFinal = `bytes ${start}-${end}/${total}`;
        contentLengthFinal = String(end - start + 1);
      }
      // Se o Range não deu pra interpretar (formato inesperado), cai no
      // fallback abaixo: serve o arquivo inteiro como 200 — mesmo
      // comportamento padrão de HTTP quando um servidor não consegue
      // honrar um Range específico.
    }

    // Node stream → Web ReadableStream: é o formato que o corpo de uma
    // Response (App Router) espera — sem essa conversão, não dá pra
    // encaminhar os bytes conforme chegam (ia exigir juntar tudo num
    // buffer antes de responder, exatamente o que queremos evitar em
    // vídeos grandes/streaming).
    const webStream = Readable.toWeb(bodyStream as Readable) as unknown as ReadableStream;

    const respHeaders = new Headers();
    respHeaders.set('Content-Type', contentType);
    // Sempre presente, com ou sem Range pedido — é isso que avisa o
    // navegador, já na PRIMEIRA resposta (antes de qualquer seek), que
    // pode pedir pedaços específicos depois.
    respHeaders.set('Accept-Ranges', 'bytes');
    if (contentEncoding) respHeaders.set('Content-Encoding', contentEncoding);
    if (contentLengthFinal) respHeaders.set('Content-Length', contentLengthFinal);
    if (statusFinal === 206 && contentRangeFinal) respHeaders.set('Content-Range', contentRangeFinal);
    // Vídeo de aula: nunca cacheável por proxy/CDN compartilhado — ficaria
    // servindo o mesmo arquivo pra qualquer aluno que batesse nessa URL,
    // sem checar acesso de novo. Cache só no navegador de quem já passou
    // pela checagem de acesso acima.
    respHeaders.set('Cache-Control', 'private, no-store');

    return new NextResponse(webStream, { status: statusFinal, headers: respHeaders });
  } catch (err: any) {
    // Erro mais comum aqui: arquivo não compartilhado com o e-mail da
    // Service Account (ver GOOGLE_SERVICE_ACCOUNT_EMAIL) — o Drive responde
    // 403/404 nesse caso, não um erro de rede genérico.
    console.error(`[video/stream] Falha ao buscar arquivo do Drive (aula ${params.aulaId}):`, err?.message ?? err);
    return NextResponse.json({ error: 'Não foi possível carregar o vídeo.' }, { status: 502 });
  }
}
