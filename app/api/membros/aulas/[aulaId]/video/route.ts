import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Serve a URL que o player deve usar pra tocar o vídeo — chamado pelo
 * client (VideoPlayer.tsx) sob demanda, não no carregamento inicial da
 * página, então a URL não fica no HTML/RSC payload de largada.
 *
 * Upload/URL externa: devolve a video_url tal como está salva (já é uma
 * URL que o navegador consegue buscar direto — Supabase Storage público ou
 * link externo).
 *
 * Drive: NÃO devolve mais a URL real do Drive. Os arquivos do Drive
 * voltaram a ficar com permissão RESTRITA (compartilhados só com o e-mail
 * da Service Account — GOOGLE_SERVICE_ACCOUNT_EMAIL/_PRIVATE_KEY, as
 * mesmas credenciais já usadas pelo import do admin em
 * app/admin/cursos/[id]/aulas/actions.ts), então o navegador do aluno não
 * teria como buscar essa URL de qualquer forma. Em vez dela, devolve o
 * caminho do proxy de streaming (./stream/route.ts, mesma pasta) — é ele
 * quem de fato busca os bytes do vídeo no Drive (via Service Account,
 * server-side) e repassa pro navegador, sem o arquivo nunca precisar ficar
 * público. Isso fecha a brecha que existia antes: um aluno não consegue
 * mais inspecionar o HTML/aba Network e pegar um link do Drive
 * compartilhável livremente — a URL que aparece ali agora é só o proxy da
 * própria plataforma, que exige login + acesso liberado ao curso pra
 * responder qualquer coisa.
 *
 * A checagem de acesso é a mesma de sempre: o client Supabase aqui usa a
 * sessão do usuário (cookies), então a RLS de `aulas` (só libera se o
 * aluno tiver acessos_curso.bloqueado = false pro curso daquela aula, ou
 * for admin) decide sozinha se a linha volta ou não — não reimplementamos
 * essa regra aqui, só reaproveitamos a mesma política do banco. O proxy de
 * streaming (./stream/route.ts) repete essa MESMA checagem outra vez,
 * porque a tag <video> faz suas próprias requisições direto pra lá, sem
 * passar de novo por este endpoint.
 */
export async function GET(request: NextRequest, { params }: { params: { aulaId: string } }) {
  // DIAGNÓSTICO TEMPORÁRIO (investigação de travamento na tela da aula,
  // remover depois de identificar a causa).
  const inicio = Date.now();
  console.log(`[video/route] GET recebido (aula ${params.aulaId})`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { data: aula, error } = (await supabase
    .from('aulas')
    .select('video_url, video_origem')
    .eq('id', params.aulaId)
    .maybeSingle()) as { data: { video_url: string | null; video_origem: string } | null; error: any };

  console.log(`[video/route] resolvido em ${Date.now() - inicio}ms (aula ${params.aulaId}, origem=${aula?.video_origem ?? '(sem aula)'})`);

  if (error || !aula || !aula.video_url) {
    return NextResponse.json({ error: 'Vídeo não encontrado ou sem acesso.' }, { status: 404 });
  }

  if (aula.video_origem === 'drive') {
    return NextResponse.json({ url: `/api/membros/aulas/${params.aulaId}/video/stream` });
  }

  return NextResponse.json({ url: aula.video_url });
}
