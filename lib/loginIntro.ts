// Ponte entre o formulário de login (dentro de /login) e o overlay de vídeo
// de intro, que agora vive no layout raiz (fora da árvore de /login) pra
// sobreviver à troca de rota — ver o comentário grande em
// components/LoginIntroOverlay.tsx pro porquê disso. Um módulo-singleton
// simples (sem Context/prop-drilling) porque os dois lados nunca estão na
// mesma árvore React ao mesmo tempo de forma previsível: é só um
// registrar/chamar dentro do mesmo runtime JS da SPA (a navegação client-side
// do Next não recarrega a página, então esse módulo continua vivo).
type Handlers = {
  preload: () => void;
  play: (onDone: () => void) => void;
};

let handlers: Handlers | null = null;

export function registrarLoginIntro(h: Handlers) {
  handlers = h;
}

export function desregistrarLoginIntro() {
  handlers = null;
}

export function preloadLoginIntro() {
  handlers?.preload();
}

/** Se o overlay não estiver registrado por algum motivo, chama onDone direto — nunca trava o login por causa disso. */
export function playLoginIntro(onDone: () => void) {
  if (!handlers) {
    onDone();
    return;
  }
  handlers.play(onDone);
}
