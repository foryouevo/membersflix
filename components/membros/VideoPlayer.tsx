'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  SkipBack,
  SkipForward,
  Settings,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';
import { useDificultarInspecao } from '@/hooks/useDificultarInspecao';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface VideoPlayerProps {
  aulaId: string;
  cursoId: string;
  videoUrl: string;
  posicaoInicial: number;
  aulaAnteriorId: string | null;
  proximaAulaId: string | null;
  voltarHref: string;
  voltarLabel: string;
}

// Botão de voltar (seta), sobreposto ao canto superior esquerdo do PRÓPRIO
// wrapper do player (não mais um elemento irmão fora dele, ancorado num
// `relative` à parte em PlayerPageClient.tsx) — motivo: o wrapper do player
// pode ficar mais estreito que a coluna ao redor dele (mx-auto + max-width
// proporcional, telas largas/baixas — ver os três wrappers abaixo), então um
// botão ancorado à COLUNA ficava fora do vídeo de verdade, flutuando sobre a
// margem esquerda vazia. Ancorado aqui dentro (cada wrapper já é
// `position: relative`), sempre alinha com a borda de verdade do vídeo,
// não importa a largura que ele acabar tendo. z-20: acima do vídeo/iframe e
// do overlay de play/pause do CustomVideoPlayer (que cobre a caixa
// inteira, `absolute inset-0`, sem z-index próprio).
function BotaoVoltar({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
    >
      <ChevronLeft size={22} />
    </Link>
  );
}

/**
 * Ponto de entrada: busca a URL do vídeo sob demanda (fetch no client, via
 * /api/membros/aulas/[aulaId]/video) em vez de recebê-la já pronta como prop
 * vinda do servidor — assim ela não fica presente no HTML/RSC payload
 * inicial da página, só aparece depois desse fetch.
 *
 * Essa URL nunca é mais a do Google Drive diretamente: pra aulas de origem
 * Drive, o endpoint devolve o caminho do proxy de streaming
 * (/api/membros/aulas/[aulaId]/video/stream — ver o comentário lá e em
 * app/api/membros/aulas/[aulaId]/video/route.ts), que serve os bytes reais
 * do vídeo via Service Account, sem o arquivo precisar estar público no
 * Drive. Do ponto de vista deste componente, essa URL se comporta como
 * qualquer outra URL de mídia direta (mesmo tratamento de upload/URL
 * externa) — por isso um único player, o CustomVideoPlayer abaixo, serve
 * as três origens (antes, Drive usava um <iframe> apontando pro player
 * embutido do Google — DriveIframePlayer, removido; não sobrou motivo pra
 * manter dois players quando os dois consomem URL de mídia direta agora).
 */
export default function VideoPlayer(props: Omit<VideoPlayerProps, 'videoUrl'>) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setVideoUrl(null);
    setErro(null);

    fetch(`/api/membros/aulas/${props.aulaId}/video`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Não foi possível carregar o vídeo.');
        return res.json();
      })
      .then((data) => {
        if (!cancelado) setVideoUrl(data.url);
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar o vídeo. Recarregue a página.');
      });

    return () => {
      cancelado = true;
    };
  }, [props.aulaId]);

  // w-full h-[78vh]: tamanho fixo só pra esses estados (erro/carregando) não
  // ocuparem uma altura diferente e "pularem" de tamanho assim que o player
  // real (CustomVideoPlayer, único agora — ver comentário acima) montar.
  const TAMANHO_PLAYER = 'w-full h-[78vh]';

  if (erro) {
    return (
      <div className={`relative flex items-center justify-center rounded-lg bg-black text-sm text-error ${TAMANHO_PLAYER}`}>
        <BotaoVoltar href={props.voltarHref} label={props.voltarLabel} />
        {erro}
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`relative animate-pulse rounded-lg bg-surface-high ${TAMANHO_PLAYER}`}>
        <BotaoVoltar href={props.voltarHref} label={props.voltarLabel} />
      </div>
    );
  }

  return <CustomVideoPlayer {...props} videoUrl={videoUrl} />;
}

// Avanço automático ao terminar o vídeo (marcar concluída + ir pra próxima
// aula): via `onEnded` do <ReactPlayer/>, abaixo. Antes, aulas de origem
// Drive usavam um <iframe> cross-origin apontando pro player embutido do
// Google (DriveIframePlayer, removido) — sem evento nenhum confiável de
// "ended" (era por isso que a conclusão de aulas do Drive dependia só do
// check manual na sidebar, ver PlayerPageClient.tsx). Agora que TODA
// origem — Drive incluído, via o proxy de streaming, ver o comentário no
// componente VideoPlayer acima — passa por um <video> de verdade, o
// onEnded abaixo funciona igual pras três origens; o check manual na
// sidebar continua existindo (não foi removido), só deixou de ser o ÚNICO
// jeito de concluir uma aula do Drive.
function CustomVideoPlayer({
  aulaId,
  cursoId,
  videoUrl,
  posicaoInicial,
  aulaAnteriorId,
  proximaAulaId,
  voltarHref,
  voltarLabel,
}: VideoPlayerProps) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Pega o <video> DE VERDADE renderizado pelo react-player, direto no DOM
  // — mesmo padrão já usado em togglePip() logo abaixo. NÃO existe mais um
  // ref pro componente <ReactPlayer/> em si (removido — ver comentário
  // dele mais abaixo): next/dynamic (usado pra importar o react-player só
  // no client, ver topo do arquivo) embrulha o componente carregado num
  // wrapper interno do Next ("LoadableComponent") que NÃO é forwardRef —
  // então um `ref` posto no <ReactPlayer/> nunca chega no player de
  // verdade (o React descarta e avisa no console: "Function components
  // cannot be given refs"). playerRef.current.seekTo() SEMPRE foi
  // silenciosamente um no-op por causa disso — inclusive o "retomar de
  // onde parou" no onReady, abaixo — era esse o motivo real de arrastar a
  // barra (e o seek em geral) não funcionar, em qualquer navegador/
  // dispositivo (não é algo específico de iOS/mobile, então não tem
  // relação com playsInline). Manipular o elemento <video> nativo direto
  // (currentTime) contorna o problema por completo, sem precisar mexer em
  // como o react-player é importado.
  function pegarVideo(): HTMLVideoElement | null {
    return containerRef.current?.querySelector('video') ?? null;
  }

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [played, setPlayed] = useState(0); // 0-1
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useDificultarInspecao();

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // webkitEnterFullscreen() (fallback do iOS, usado em toggleFullscreen
  // abaixo) é uma API própria da Apple — não faz parte da Fullscreen API
  // padrão, então não dispara 'fullscreenchange' nem atualiza
  // document.fullscreenElement (o listener acima não pega esse caso). Sem
  // isso, o ícone do botão (Maximize/Minimize) ficaria travado errado
  // depois de entrar/sair desse fullscreen nativo pelo iOS. Os eventos
  // certos pra esse caso são webkitbeginfullscreen/webkitendfullscreen,
  // disparados pelo próprio <video>. Preso a `ready` (não a um efeito vazio
  // no mount): o <video> interno do react-player só existe no DOM depois
  // que o player montou de verdade — antes disso o querySelector abaixo
  // sempre voltaria null.
  useEffect(() => {
    if (!ready) return;
    const video = containerRef.current?.querySelector('video');
    if (!video) return;
    const onBegin = () => setFullscreen(true);
    const onEnd = () => setFullscreen(false);
    video.addEventListener('webkitbeginfullscreen', onBegin);
    video.addEventListener('webkitendfullscreen', onEnd);
    return () => {
      video.removeEventListener('webkitbeginfullscreen', onBegin);
      video.removeEventListener('webkitendfullscreen', onEnd);
    };
  }, [ready]);

  const salvarProgresso = useCallback(
    async (segundoAtual: number, concluida: boolean) => {
      await supabase.from('progresso_aulas').upsert(
        {
          aluno_id: (await supabase.auth.getUser()).data.user?.id,
          aula_id: aulaId,
          curso_id: cursoId,
          segundo_atual: Math.floor(segundoAtual),
          concluida,
          atualizado_em: new Date().toISOString(),
        } as any,
        { onConflict: 'aluno_id,aula_id' }
      );
    },
    [aulaId, cursoId, supabase]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (playing && duration > 0) {
        salvarProgresso(played * duration, played > 0.95);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [playing, played, duration, salvarProgresso]);

  useEffect(() => {
    return () => {
      if (duration > 0) salvarProgresso(played * duration, played > 0.95);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS Safari no iPhone (antes do iOS 16.4) nunca implementou
  // Element.requestFullscreen() em elementos arbitrários — só existe pro
  // próprio <video>, via webkitEnterFullscreen() (API não-padrão da
  // Apple, sem Promise, sem document.fullscreenElement correspondente —
  // ver o efeito webkitbeginfullscreen/webkitendfullscreen acima, que é
  // quem sincroniza o ícone nesse caso). Chamar requestFullscreen() no
  // container nesses navegadores não dava erro nenhum, só não tinha
  // efeito algum (a função existe no protótipo, só nunca resolve/nunca
  // muda a tela) — por isso o botão "não fazia nada" depois do playsInline
  // (antes, o vídeo já entrava sozinho no fullscreen nativo do iOS ao dar
  // play, mascarando esse problema).
  //
  // Estratégia: tenta a API padrão primeiro (funciona em desktop, Android,
  // iPad e iPhone 16.4+, mantendo os controles CUSTOMIZADOS — nada de
  // controles nativos aparecendo). Só cai pro webkitEnterFullscreen() no
  // <video> se o container não tiver requestFullscreen (iPhone mais
  // antigo) ou se a chamada padrão for rejeitada. Ciente do trade-off: no
  // fallback, é o PRÓPRIO iOS quem assume a tela — os controles nativos
  // dele aparecem nessa hora, sem jeito de evitar (restrição da Apple, não
  // bug daqui); mas isso só acontece quando o usuário aperta o botão de
  // tela cheia de propósito, nunca mais sozinho ao só dar play (esse era o
  // bug antigo, já corrigido pelo playsInline) — não é a mesma sobreposição
  // de antes.
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    const container = containerRef.current;
    const video = pegarVideo() as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;

    if (container && typeof container.requestFullscreen === 'function') {
      container.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    } else {
      video?.webkitEnterFullscreen?.();
    }
  }

  function togglePip() {
    const video = pegarVideo();
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture();
    }
  }

  let hideTimeout: ReturnType<typeof setTimeout>;
  function handleMouseMove() {
    setControlsVisible(true);
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => playing && setControlsVisible(false), 2500);
  }

  return (
    // h-0 + pb-[calc(46.9%+88px)] (era h-[78vh]/h-[80vh] fixo antes disso,
    // e aspect-video antes ainda): volta pra altura derivada da LARGURA do
    // próprio elemento — técnica de "padding-bottom vira altura": como
    // padding percentual é sempre relativo à largura, h-0 (zera a altura
    // "de conteúdo") + esse padding-bottom dão a altura final em função da
    // largura, sem depender de aspect-ratio nem JS/ResizeObserver. Os
    // "+88px" replicam literalmente um valor pedido numa tarefa anterior,
    // de quando existia um player separado pro Drive (removido — ver
    // comentário no topo do arquivo) com uma UI própria que precisava desse
    // respiro extra; aqui não tem o mesmo motivo de existir, mas manteve-se
    // o valor tal como foi pedido, sem reverter por conta própria.
    // lg:max-h-[calc(100vh-10rem)]: teto de segurança em telas largas/
    // baixas — sem um lg:max-w correspondente desta vez (não foi pedido),
    // então quando esse teto entra em ação a caixa fica mais LARGA do que
    // um 16:9 puro pediria; o <video> por dentro (absolute inset-0 w-full
    // h-full + object-contain, abaixo) absorve essa diferença como tarja
    // (bg-black), sem cortar nem esticar.
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
      className="group relative mx-auto h-0 w-full select-none overflow-hidden rounded-lg bg-black pb-[calc(46.9%+88px)] lg:max-h-[calc(100vh_-_10rem)]"
    >
      <BotaoVoltar href={voltarHref} label={voltarLabel} />

      <ReactPlayer
        url={videoUrl}
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={speed}
        width="100%"
        height="100%"
        // controls={false} explícito (já era o padrão do react-player sem
        // esse prop — deixado escrito pra deixar a intenção clara e evitar
        // que uma mudança futura habilite sem querer os controles nativos
        // do <video>, que ficariam sobrepostos aos nossos, abaixo).
        controls={false}
        // playsinline: ESSENCIAL no mobile, principalmente iOS Safari — sem
        // isso, o Safari puxa o <video> pro PRÓPRIO player nativo em tela
        // cheia (webkitEnterFullscreen) automaticamente assim que o vídeo
        // começa a tocar, mesmo sem o usuário pedir fullscreen nenhum e sem
        // o atributo `controls` estar presente (é um comportamento à parte,
        // do sistema operacional, não do HTML/controls). Esse player nativo
        // do iOS desenha os PRÓPRIOS controles (pular 10s, barra de
        // progresso) por cima — como nosso overlay de controles customizado
        // continua montado por baixo (e fica sempre visível quando pausado,
        // via `controlsVisible || !playing` mais abaixo), o resultado eram
        // dois conjuntos de controles sobrepostos, mais visível justamente
        // ao pausar. playsinline mantém o vídeo SEMPRE inline na página —
        // "tela cheia" nesse player é só o requestFullscreen() do container
        // (toggleFullscreen, acima), nunca o modo nativo do <video>.
        playsinline
        onReady={() => {
          setReady(true);
          // posicaoInicial já vem em segundos — atribuir direto em
          // currentTime (ver pegarVideo(), acima) em vez do antigo
          // playerRef.current?.seekTo(), que nunca funcionou de verdade.
          if (posicaoInicial > 0) {
            const video = pegarVideo();
            if (video) video.currentTime = posicaoInicial;
          }
        }}
        onDuration={setDuration}
        onProgress={(state: any) => !seeking && setPlayed(state.played)}
        onEnded={() => {
          salvarProgresso(duration, true);
          if (proximaAulaId) window.location.href = `/membros/player/${proximaAulaId}`;
        }}
        onClickPreview={() => setPlaying(true)}
        // objectFit: 'contain' vai direto pro <video> interno (via
        // config.file.attributes — o `style` no nível de cima do
        // <ReactPlayer/>, abaixo, estiliza só o WRAPPER dele, não o <video>
        // em si). Sem isso o <video> usa o default do navegador (object-fit:
        // fill), que estica/distorce quando a proporção real do arquivo não
        // bate 16:9 exato — contain garante que ele sempre cabe inteiro,
        // sem cortar nem esticar, sobrando tarja (preenchida pelo bg-black
        // do container) em vez de cortar borda. controls: false e
        // playsInline repetidos aqui (redundante com os props de cima, que
        // já bastam) só como reforço defensivo — não custa nada e garante
        // que valem mesmo se algum dia o `config` for passado sem os props
        // de nível superior.
        config={{
          file: {
            attributes: {
              controls: false,
              playsInline: true,
              controlsList: 'nodownload',
              disablePictureInPicture: false,
              style: { width: '100%', height: '100%', objectFit: 'contain' },
            },
          },
        }}
        // absolute inset-0 w-full h-full (classe, não mais só o `style`
        // inline de antes) gruda o wrapper do react-player diretamente na
        // caixa do container (h-0 + padding-bottom, ver comentário acima) —
        // evita qualquer sobra/tarja preta que viria de o wrapper calcular
        // seu próprio tamanho em % a partir de um instante em que o
        // container ainda não tinha a altura final (ex.: hidratação/
        // primeira medição antes do padding-bottom "assentar"). pointer-
        // events-none: clique passa direto pro overlay de play/pause logo
        // abaixo (mesmo motivo de antes, só que via classe agora).
        className="absolute inset-0 h-full w-full pointer-events-none"
      />

      {/* overlay clicável para play/pause */}
      <button
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
        onClick={() => setPlaying((p) => !p)}
        className="absolute inset-0 flex items-center justify-center"
      >
        {!playing && ready && (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
            <Play size={30} className="ml-1" />
          </span>
        )}
      </button>

      {/* controles */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10 transition-opacity ${
          controlsVisible || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* seek bar */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.0001}
          value={played}
          onMouseDown={() => setSeeking(true)}
          onChange={(e) => setPlayed(Number(e.target.value))}
          onMouseUp={(e) => {
            setSeeking(false);
            // value é uma FRAÇÃO (0-1, ver min/max acima) — precisa
            // multiplicar pela duração pra virar segundos, que é o que
            // currentTime espera (playerRef.current?.seekTo() fazia essa
            // conversão sozinho internamente; currentTime não, é sempre em
            // segundos).
            const fracao = Number((e.target as HTMLInputElement).value);
            const video = pegarVideo();
            if (video && duration > 0) video.currentTime = fracao * duration;
          }}
          className="mb-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
        />

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={20} /> : <Play size={20} />}</button>

            {aulaAnteriorId ? (
              <Link href={`/membros/player/${aulaAnteriorId}`}>
                <SkipBack size={18} />
              </Link>
            ) : (
              <SkipBack size={18} className="opacity-30" />
            )}
            {proximaAulaId ? (
              <Link href={`/membros/player/${proximaAulaId}`}>
                <SkipForward size={18} />
              </Link>
            ) : (
              <SkipForward size={18} className="opacity-30" />
            )}

            <div className="flex items-center gap-1.5">
              <button onClick={() => setMuted((m) => !m)}>{muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
            </div>

            <span className="text-xs text-on-variant">
              {formatDuration(played * duration)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowSpeedMenu((s) => !s)} className="flex items-center gap-1 text-xs">
                <Settings size={16} /> {speed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 rounded bg-surface-high py-1 shadow-overlay">
                  {VELOCIDADES.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setSpeed(v);
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full px-4 py-1.5 text-left text-xs hover:bg-surface-container ${
                        v === speed ? 'text-primary' : 'text-white'
                      }`}
                    >
                      {v}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={togglePip} title="Janela flutuante">
              <PictureInPicture2 size={18} />
            </button>
            <button onClick={toggleFullscreen} title="Tela cheia">
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
