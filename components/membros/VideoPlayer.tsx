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
import { isGoogleDriveUrl, toDriveEmbedUrl } from '@/lib/drive-url';
import { useDificultarInspecao } from '@/hooks/useDificultarInspecao';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Altura (em px) reservada, além do vídeo em si, pra UI própria do player
// embutido do Google Drive (.../file/d/FILE_ID/preview) — a barra de título
// do arquivo no topo + a barra de controles dele embaixo. É medida às cegas
// (a UI do Drive é cross-origin, não dá pra medir por JS) — 88px é o valor
// atual, embutido direto na classe `pb-[calc(49.6%_+_88px)]` de
// DriveIframePlayer, abaixo (antes vinha desta constante, via `style`
// inline — trocado por pedido explícito pra virar uma classe Tailwind, o
// que exige um valor literal, sem variável). Se algum dia cortar de novo,
// é lá que se ajusta o "+88px".

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

  // w-full h-[78vh]: mesmo tamanho fixo do CustomVideoPlayer (ver lá) — só
  // pra esses estados (erro/carregando) não ocuparem uma altura diferente
  // e "pularem" de tamanho assim que o player real montar. Vale só
  // enquanto o player real acaba sendo o CustomVideoPlayer (upload/URL
  // externa) — se for um vídeo do Drive, o DriveIframePlayer continua com
  // o tamanho antigo (aspect-ratio + teto proporcional), então nesse caso
  // ainda existe um pulo residual entre este placeholder e o player real.
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
function DriveIframePlayer({ videoUrl, voltarHref, voltarLabel }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedUrl = toDriveEmbedUrl(videoUrl) ?? videoUrl;

  useDificultarInspecao();

  return (
    // O iframe /preview do Drive não é um player "cru": ele desenha a
    // própria UI (barra de título do arquivo em cima, barra de controles
    // embaixo) DENTRO do espaço que a gente dá pra ele. Com aspect-video
    // puro (16/9 exato), essa UI comia altura do vídeo — o vídeo em si
    // encolhia pra caber, e a barra de baixo ainda ficava cortada. Por
    // isso a caixa deixou de ser aspect-ratio puro (não dá pra trocar por
    // `aspect-video` puro aqui, mesmo tendo sido pedido de forma geral pro
    // "wrapper do player" — reintroduziria exatamente esse corte já
    // corrigido): é 16/9 + 88px fixos extra, espaço reservado só pra UI do
    // Drive, sem comprimir o vídeo. Técnica do "padding-bottom vira altura"
    // (funciona em qualquer navegador, sem depender de aspect-ratio nem de
    // JS/ResizeObserver): um spacer com width:100% e uma classe
    // `pb-[calc(56.25%_+_88px)]` — como padding percentual é sempre
    // relativo à LARGURA do próprio elemento, isso dá a altura final direto
    // em função da largura. A caixa visual de verdade (fundo preto, cantos
    // arredondados, overflow-hidden, o iframe) fica ABSOLUTAMENTE
    // posicionada preenchendo esse spacer (inset-0) — senão o padding-bottom
    // sobraria como espaço vazio dentro do próprio fluxo, sem nada desenhado
    // ali.
    //
    // pb-[calc(56.25%_+_88px)] (mobile, sem prefixo — 56.25% = 9/16, a
    // proporção matematicamente correta de 16:9) / lg:pb-[calc(49.6%_+_88px)]
    // (desktop, valor pedido explicitamente numa tarefa anterior — na hora,
    // apliquei ele SEM o prefixo lg:, então também passou a valer no
    // mobile por engano). Bug relatado: no mobile, esse 49.6% (menor que os
    // 56.25% corretos) produzia uma caixa mais BAIXA do que o vídeo+UI do
    // Drive realmente precisam numa tela estreita — o conteúdo do iframe
    // (cross-origin, renderizado pelo próprio Google) ficava cortado por
    // este container ter overflow-hidden, e o botão de play do Drive podia
    // acabar fora da área realmente clicável/visível. Com o valor correto
    // de volta no mobile (e o 49.6% preservado só a partir de lg:, onde já
    // estava calibrado e funcionando), os dois sintomas relatados — corte/
    // barra preta E o play não clicável — têm a mesma causa raiz e devem
    // resolver juntos; não há nenhum overlay/z-index/pointer-events
    // concorrente neste componente (só BotaoVoltar, canto sup. esquerdo, e
    // a marca d'água, canto sup. direito — nenhum dos dois cobre o centro
    // do vídeo, onde fica o play).
    //
    // mx-auto + lg:max-h-[calc(100vh-10rem)]/lg:max-w-[...] (já eram lg:,
    // sem mudança agora): mesmo limite de altura em telas largas do
    // CustomVideoPlayer (ver lá), calculado pra um 16:9 puro — como este
    // spacer é 16:9 + 88px extra, no pior caso (largura no limite) a caixa
    // final fica até ~88px mais baixa que o teto, nunca mais alta — não
    // estoura a viewport, só não usa o teto inteiro à risca; mantém as duas
    // caixas (Drive/upload) com o mesmo tamanho aproximado numa mesma tela,
    // em vez de duas fórmulas divergentes. Só valem a partir de lg mesmo —
    // abaixo disso o spacer já usa 100% da largura da tela (mx-auto sem
    // max-w correspondente), então esse teto de altura não faria sentido
    // aplicado sozinho no mobile.
    <div className="relative mx-auto w-full pb-[calc(56.25%_+_88px)] lg:pb-[calc(49.6%_+_88px)] lg:max-h-[calc(100vh_-_10rem)] lg:max-w-[calc((100vh_-_10rem)*16/9)]">
      {/* Botão de voltar por cima de tudo (z-20) — mesmo elemento
          `position:relative` que já reserva a altura do spacer é a
          referência de posicionamento aqui (inset-0 do preenchimento
          visual, abaixo, cobre exatamente essa mesma área). */}
      <BotaoVoltar href={voltarHref} label={voltarLabel} />

      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 overflow-hidden rounded-lg bg-black"
      >
        {/* h-full w-full: preenche a caixa (16/9 + 88px, ver
            pb-[calc(49.6%_+_88px)] no spacer acima) inteira — o offset
            extra é exatamente o "respiro" que sobra pra
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
    // h-0 + pb-[calc(46.9%+88px)] (era h-[78vh]/h-[80vh] fixo antes disso,
    // e aspect-video antes ainda): volta pra altura derivada da LARGURA do
    // próprio elemento — mesma técnica de "padding-bottom vira altura" já
    // usada no DriveIframePlayer (ver comentário lá): como padding
    // percentual é sempre relativo à largura, h-0 (zera a altura "de
    // conteúdo") + esse padding-bottom dão a altura final em função da
    // largura, sem depender de aspect-ratio nem JS/ResizeObserver. Os
    // "+88px" replicam literalmente o valor pedido — não têm o mesmo
    // motivo de existir aqui que no Drive (lá reservam espaço pra UI do
    // player embutido do Google, que não existe neste player customizado);
    // aplicados do jeito que foram pedidos mesmo assim.
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
        // objectFit: 'contain' vai direto pro <video> interno (via
        // config.file.attributes — o `style` no nível de cima do
        // <ReactPlayer/>, abaixo, estiliza só o WRAPPER dele, não o <video>
        // em si). Sem isso o <video> usa o default do navegador (object-fit:
        // fill), que estica/distorce quando a proporção real do arquivo não
        // bate 16:9 exato — contain garante que ele sempre cabe inteiro,
        // sem cortar nem esticar, sobrando tarja (preenchida pelo bg-black
        // do container) em vez de cortar borda.
        config={{
          file: {
            attributes: {
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
