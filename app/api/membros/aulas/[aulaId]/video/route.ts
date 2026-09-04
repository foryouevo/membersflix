import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Serve a URL do vídeo de uma aula sob demanda (chamado pelo player no
 * client, não pelo carregamento inicial da página) — assim ela não fica
 * presente no HTML/RSC payload inicial da tela do player, só aparece depois
 * de um fetch feito pelo próprio player.
 *
 * DIFICULTADOR, NÃO SEGURANÇA REAL: o navegador precisa da URL de verdade
 * pra tocar o vídeo, então ela sempre vai aparecer na aba Network do
 * DevTools assim que o player carregar — isso é inerente a rodar vídeo no
 * navegador, não tem como evitar sem um proxy de streaming próprio (fora do
 * escopo aqui: envolve custo de infraestrutura e suporte a range requests
 * pra permitir avançar o vídeo, não compensa pelo ganho real de proteção).
 * O que isto evita é só a URL aparecer de graça no "ver código-fonte" ou
 * antes do usuário sequer dar play.
 *
 * A checagem de acesso é a mesma de sempre: o client Supabase aqui usa a
 * sessão do usuário (cookies), então a RLS de `aulas` (só libera se o aluno
 * tiver acessos_curso.bloqueado = false pro curso daquela aula, ou for
 * admin) decide sozinha se a linha volta ou não — não reimplementamos essa
 * regra aqui, só reaproveitamos a mesma política do banco.
 */
export async function GET(request: NextRequest, { params }: { params: { aulaId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

   const { data: aula, error } = await supabase.from('aulas').select('video_url').eq('id', params.aulaId).maybeSingle() as { data: { video_url: string } | null, error: any };

  if (error || !aula || !aula.video_url) {
    return NextResponse.json({ error: 'Vídeo não encontrado ou sem acesso.' }, { status: 404 });
  }

  // Só o campo estritamente necessário pro player funcionar — nada de
  // devolver a linha inteira da aula (título, descrição, ids de outras
  // aulas, etc.) num endpoint que não precisa disso.
  return NextResponse.json({ url: aula.video_url });
}
