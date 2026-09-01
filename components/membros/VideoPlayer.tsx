'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
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
import { isGoogleDriveUrl, toDriveEmbedUrl } from '@/lib/drive-url';
import { useDificultarInspecao } from '@/hooks/useDificultarInspecao';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Altura (em px) reservada, além dos 16:9 do vídeo em si, pra UI própria do
// player embutido do Google Drive (.../file/d/FILE_ID/preview) — a barra de
// título do arquivo no topo + a barra de controles dele embaixo. É medida às
// cegas (a UI do Drive é cross-origin, não dá pra medir por JS) — 48px não
// foi suficiente (controles ainda cortavam), 88px é a tentativa atual. Se
// ainda cortar, sobe esse número (ex.: 104px) — ver DriveIframePlayer,
// abaixo, onde é o único lugar que usa essa constante.
const DRIVE_UI_OFFSET_PX = 88;

interface VideoPlayerProps {
  aulaId: string;
  cursoId: string;
  videoUrl: string;
  posicaoInicial: number;
  aulaAnteriorId: string | null;
  proximaAulaId: string | null;
}

/**
 * Ponto de entrada: busca a URL do vídeo sob demanda (fetch no client, via
 * /api/membros/aulas/[aulaId]/video) em vez de recebê-la já pronta como prop
 * vinda do servidor — assim ela não fica presente no HTML/RSC payload
 * inicial da página, só aparece depois desse fetch. Uma vez com a URL em
 * mãos, escolhe o player certo pela origem dela.
 *
 * Vídeos do Google Drive só reproduzem dentro de um <iframe> apontando para
 * .../file/d/FILE_ID/preview — uma <video>/react-player fica com tela preta e
 * 0:00/0:00 porque o Drive não serve o arquivo como um stream direto.
 * URL Externa e Upload continuam usando o player customizado com controles próprios.
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

  if (erro) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black text-sm text-error">
        {erro}
      </div>
    );
  }

  if (!videoUrl) {
    return <div className="aspect-video w-full animate-pulse rounded-lg bg-surface-high" />;
  }

  if (isGoogleDriveUrl(videoUrl)) {
    return <DriveIframePlayer {...props} videoUrl={videoUrl} />;
  }
  return <CustomVideoPlayer {...props} videoUrl={videoUrl} />;
}

// Avanço automático ao terminar o vídeo (marcar concluída + ir pra próxima
// aula): implementado abaixo, via `onEnded`, só pra `CustomVideoPlayer`
// (origem 'upload'/'url_externa', que usa o <ReactPlayer/> e expõe esse
// evento de verdade). Para o Drive (`DriveIframePlayer`, embaixo) isso NÃO
// existe: é um <iframe> cross-origin de .../preview, sem nenhuma API
// postMessage documentada/pública pra "play", "pause" ou "ended" — só o que
// o próprio Google usa internamente entre os frames dele, sem contrato
// estável (pode mudar sem aviso, e não dá pra confiar nem verificar que
// veio de fato do player de vídeo). Também não dá pra simular isso com
// setTimeout(duracao_segundos): dispararia mesmo se o aluno pausar, voltar
// o vídeo, ou nem chegar a dar play — seria pior que não ter a funcionalidade.
// Por isso, pra aulas de origem Drive, a conclusão continua manual: o check
// clicável de cada aula na sidebar (PlayerPageClient.tsx).
function DriveIframePlayer({ videoUrl }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedUrl = toDriveEmbedUrl(videoUrl) ?? videoUrl;

  useDificultarInspecao();

  return (
    // O iframe /preview do Drive não é um player "cru": ele desenha a
    // própria UI (barra de título do arquivo em cima, barra de controles
    // embaixo) DENTRO do espaço que a gente dá pra ele. Com aspect-video
    // puro (16/9 exato), essa UI comia altura do vídeo — o vídeo em si
    // encolhia pra caber, e a barra de baixo ainda ficava cortada. Por
    // isso a caixa deixou de ser aspect-ratio puro: é 16/9 (56.25%) +
    // DRIVE_UI_OFFSET_PX fixos extra (ver constante no topo do arquivo),
    // espaço reservado só pra UI do Drive, sem comprimir o vídeo. Técnica
    // do "padding-bottom vira altura" (funciona em qualquer navegador, sem
    // depender de aspect-ratio nem de JS/ResizeObserver): um spacer com
    // width:100% e padding-bottom:calc(56.25% + Npx) — como padding
    // percentual é sempre relativo à LARGURA do próprio elemento, isso dá a
    // altura final direto em função da largura, sem CSS var. A caixa visual
    // de verdade (fundo preto, cantos arredondados, overflow-hidden, o
    // iframe) fica ABSOLUTAMENTE posicionada preenchendo esse spacer
    // (inset-0) — senão o padding-bottom sobraria como espaço vazio dentro
    // do próprio fluxo, sem nada desenhado ali.
    <div className="relative w-full" style={{ paddingBottom: `calc(56.25% + ${DRIVE_UI_OFFSET_PX}px)` }}>
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 overflow-hidden rounded-lg bg-black"
      >
        {/* h-full w-full: preenche a caixa (16/9 + DRIVE_UI_OFFSET_PX)
            inteira — o offset extra é exatamente o "respiro" que sobra pra
            UI do Drive não precisar espremer o vídeo nem cortar a barra
            debaixo. Sem transform/scale nem overlay tentando "esconder" a
            UI do Drive — isso quebraria os controles dela; a única correção
            aqui é dar altura de sobra o suficiente. overflow-hidden só
            arredonda os cantos do iframe (que é retangular reto) — não
            corta mais nada, já que a caixa agora é alta o bastante pro
            conteúdo do Drive inteiro (vídeo 16/9 + a UI dele) caber sem
            sobrar. */}
        <iframe
          src={embedUrl}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="h-full w-full"
          style={{ border: 0 }}
        />

        {/* O player embutido do Drive é cross-origin: não dá pra remover do DOM
            o ícone de "abrir em nova aba"/cast que ele desenha no canto superior
            direito, só mascará-lo. Este é o ÚNICO elemento de overlay do
            componente — cobre a área do ícone por completo e intercepta o
            clique (tanto por estar visualmente por cima quanto pelo
            preventDefault) para que o aluno não saia da plataforma. Não
            depende de play/pause: é um bloco estático, sempre presente, sem
            interferir nos controles do próprio player do Drive (que ficam
            embaixo, fora dessa área). Mesma posição/tamanho/z-index de antes —
            só o preenchimento mudou de preto sólido pra essa marca d'água
            (faviconmenor.png é quadrado, então cover e contain dão o mesmo
            resultado aqui: preenche o quadrado de ponta a ponta sem sobra). */}
        <div
          onClick={(e) => e.preventDefault()}
          style={{ backgroundImage: "url('/faviconmenor.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          className="absolute right-0 top-0 z-20 h-[60px] w-[60px] cursor-default"
          aria-hidden
        />
      </div>
    </div>
  );
}

function CustomVideoPlayer({ aulaId, cursoId, videoUrl, posicaoInicial, aulaAnteriorId, proximaAulaId }: VideoPlayerProps) {
  const supabase = createClient();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        },
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function togglePip() {
    const video = containerRef.current?.querySelector('video');
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
    // aspect-video + w-full, sem h-*/min-h-*: mesma garantia do
    // DriveIframePlayer (ver comentário lá) de que a caixa é sempre
    // exatamente 16:9, nunca mais alta que o vídeo. overflow-hidden só
    // arredonda os cantos do <video> (que ocupa a caixa inteira via o style
    // position:absolute+inset:0 do ReactPlayer, abaixo) — a barra de
    // controles logo mais abaixo é `absolute bottom-0` DENTRO desta mesma
    // caixa (nunca ultrapassa a altura dela), então overflow-hidden nunca
    // corta o rodapé dela.
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
      className="group relative aspect-video w-full select-none overflow-hidden rounded-lg bg-black"
    >
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={speed}
        width="100%"
        height="100%"
        onReady={() => {
          setReady(true);
          if (posicaoInicial > 0) playerRef.current?.seekTo(posicaoInicial, 'seconds');
        }}
        onDuration={setDuration}
        onProgress={(state: any) => !seeking && setPlayed(state.played)}
        onEnded={() => {
          salvarProgresso(duration, true);
          if (proximaAulaId) window.location.href = `/membros/player/${proximaAulaId}`;
        }}
        onClickPreview={() => setPlaying(true)}
        config={{ file: { attributes: { controlsList: 'nodownload', disablePictureInPicture: false } } }}
        // position:absolute + inset:0 (em vez de só width/height:"100%") gruda
        // o wrapper do react-player diretamente na caixa do container (que já
        // é aspect-video, sem altura fixa) — evita qualquer sobra/tarja preta
        // que viria de o wrapper calcular seu próprio tamanho em % a partir
        // de um instante em que o container ainda não tinha a altura final
        // (ex.: hidratação/primeira medição antes do aspect-ratio "assentar").
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
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
            playerRef.current?.seekTo(Number((e.target as HTMLInputElement).value));
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
