'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { registrarLoginIntro, desregistrarLoginIntro } from '@/lib/loginIntro';

const VIDEO_SRC = '/videos/loading.mp4';
// Trava de segurança: se o vídeo demorar pra carregar, falhar ou por algum
// motivo nunca disparar "ended", segue pra Home mesmo assim depois desse
// tempo — nunca deixa o aluno preso numa tela preta.
const TIMEOUT_MS = 4500;
const FADE_MS = 300;

/**
 * Tela de intro em vídeo exibida entre "login confirmado" e "Home revelada".
 *
 * Renderizado uma vez só, no layout raiz (app/layout.tsx) — NÃO dentro da
 * página de login — de propósito: a navegação de /login pra /membros
 * desmonta a árvore inteira de /login (é uma troca de rota de verdade, não
 * um estado local), então se esse overlay morasse dentro do
 * LoginPageClient, ele seria desmontado JUNTO com a página de login no meio
 * do fade-out — e como o fade só deixa o overlay TRANSPARENTE (não
 * remove ele do layout até o fim da transição), a página de login, ainda
 * montada por trás, ficava visível por um instante através do overlay
 * ficando transparente. É o "flash" da tela de login que foi reportado.
 *
 * A correção tem duas partes:
 * 1) Este componente vive no layout raiz, comum a /login e /membros — não
 *    desmonta na troca de rota entre as duas.
 * 2) `finish()` dispara a navegação (`onDone`) IMEDIATAMENTE, mas só começa
 *    a esmaecer (fade) depois que o `pathname` realmente mudar (confirmando
 *    que a Home já assumiu por trás) — o overlay fica 100% opaco cobrindo
 *    a transição inteira, e só então revela o que tiver por trás (a Home,
 *    nunca mais a tela de login).
 *
 * Comunicação com o formulário de login: como as duas pontas não estão mais
 * na mesma árvore, usa o módulo-singleton lib/loginIntro.ts (preload/play)
 * em vez de um ref repassado por prop.
 */
export default function LoginIntroOverlay() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const videoRef = useRef<HTMLVideoElement>(null);
  const onDoneRef = useRef<() => void>(() => {});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  const startPathnameRef = useRef<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [aguardandoRota, setAguardandoRota] = useState(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Dispara a navegação já — mas o overlay continua 100% opaco (fading
    // ainda false): só passa a esmaecer no useEffect abaixo, quando o
    // pathname realmente tiver mudado.
    onDoneRef.current();
    setAguardandoRota(true);
  }, []);

  // Só começa o fade depois que a rota de fato mudou (Home já montada por
  // trás) — nunca antes, senão volta a expor a página antiga por trás do
  // overlay ficando transparente.
  useEffect(() => {
    if (!aguardandoRota) return;
    if (pathname === startPathnameRef.current) return;

    setAguardandoRota(false);
    setFading(true);
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [pathname, aguardandoRota]);

  useEffect(() => {
    registrarLoginIntro({
      preload: () => setMounted(true),
      play: (onDone) => {
        onDoneRef.current = onDone;
        finishedRef.current = false;
        setAguardandoRota(false);
        setFading(false);
        setMounted(true);
        setVisible(true);
        startPathnameRef.current = pathnameRef.current;
        timeoutRef.current = setTimeout(finish, TIMEOUT_MS);
        // requestAnimationFrame: dá um tick pro <video> existir no DOM (só
        // renderiza quando `mounted` vira true) antes de chamar .play().
        requestAnimationFrame(() => {
          videoRef.current?.play().catch(finish);
        });
      },
    });
    return () => desregistrarLoginIntro();
  }, [finish]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-300 ${
        visible && !fading ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {/* Fundo continua 100% da viewport (div acima) — só o vídeo em si
          fica menor e centralizado. max-w-3xl (~768px, 50% maior que o
          max-w-lg/512px de antes): ajuste esse valor (ex: max-w-2xl pra
          ~672px, max-w-4xl pra ~896px) se quiser afinar o tamanho de novo.
          h-auto (não h-full/object-cover) + w-full dentro do max-w: a
          largura fica limitada pelo container, e a altura segue a
          proporção natural do vídeo sozinha, sem esticar/cortar. */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="h-auto w-full max-w-3xl"
      />
    </div>
  );
}
