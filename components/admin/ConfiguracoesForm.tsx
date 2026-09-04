'use client';

import { useRef, useState } from 'react';
import { MessageCircle, Save, Image as ImageIcon, Upload, LayoutTemplate, Sparkles, Trash2, LogIn } from 'lucide-react';
import {
  salvarNumeroWhatsapp,
  salvarRodapeLogin,
  salvarBannerHomeTexto,
  uploadBannerPlataforma,
  uploadBannerHomeCapa,
  uploadHeroDestaque,
  removerHeroDestaque,
  uploadLoginBackground,
  removerLoginBackground,
} from '@/app/admin/configuracoes/actions';

export default function ConfiguracoesForm({
  numeroAtual,
  bannerAtual,
  rodapeLoginAtual,
  bannerHomeAtual,
  heroDestaqueAtual,
  loginBackgroundAtual,
}: {
  numeroAtual: string;
  bannerAtual: string | null;
  rodapeLoginAtual: {
    desenvolvido_por: string;
    email_contato: string;
    telefone_contato: string;
    termos_uso_url: string;
  };
  bannerHomeAtual: {
    banner_capa_url: string | null;
    banner_badge: string;
    banner_resumo: string;
  };
  heroDestaqueAtual: string | null;
  loginBackgroundAtual: string | null;
}) {
  const [numero, setNumero] = useState(numeroAtual);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await salvarNumeroWhatsapp(numero);
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <MessageCircle size={18} />
          <h2 className="font-semibold text-white">Integração com WhatsApp</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block text-xs font-medium text-primary">Número de Suporte</label>
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="+55 (11) 99999-9999"
            className="input-field"
          />
          <p className="text-xs text-on-variant">
            Este número será usado em todos os links de liberação de acesso enviados aos alunos.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={salvando} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            {salvo && <span className="text-sm text-primary">Configuração salva.</span>}
          </div>
        </form>
      </div>

      <HeroDestaqueCard heroDestaqueAtual={heroDestaqueAtual} />
      <BannerHomeCard bannerHomeAtual={bannerHomeAtual} />
      <BannerPlataformaCard bannerAtual={bannerAtual} />
      <LoginBackgroundCard loginBackgroundAtual={loginBackgroundAtual} />
      <RodapeLoginCard rodapeAtual={rodapeLoginAtual} />
    </div>
  );
}

function RodapeLoginCard({
  rodapeAtual,
}: {
  rodapeAtual: { desenvolvido_por: string; email_contato: string; telefone_contato: string; termos_uso_url: string };
}) {
  const [desenvolvidoPor, setDesenvolvidoPor] = useState(rodapeAtual.desenvolvido_por);
  const [emailContato, setEmailContato] = useState(rodapeAtual.email_contato);
  const [telefoneContato, setTelefoneContato] = useState(rodapeAtual.telefone_contato);
  const [termosUsoUrl, setTermosUsoUrl] = useState(rodapeAtual.termos_uso_url);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await salvarRodapeLogin({
      desenvolvido_por: desenvolvidoPor,
      email_contato: emailContato,
      telefone_contato: telefoneContato,
      termos_uso_url: termosUsoUrl,
    });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <LayoutTemplate size={18} />
        <h2 className="font-semibold text-white">Rodapé da Tela de Login</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Exibido fora do card de login, na base da tela. Qualquer campo vazio simplesmente não aparece — não precisa
        preencher todos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Texto "desenvolvido por"</label>
          <input
            value={desenvolvidoPor}
            onChange={(e) => setDesenvolvidoPor(e.target.value)}
            placeholder="membersflix.com"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Email de contato</label>
          <input
            value={emailContato}
            onChange={(e) => setEmailContato(e.target.value)}
            placeholder="contato@membersflix.com"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Telefone de contato</label>
          <input
            value={telefoneContato}
            onChange={(e) => setTelefoneContato(e.target.value)}
            placeholder="(28) 99966-2113"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Link dos Termos de Uso</label>
          <input
            value={termosUsoUrl}
            onChange={(e) => setTermosUsoUrl(e.target.value)}
            placeholder="https://membersflix.com/termos"
            className="input-field"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={salvando} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Rodapé'}
          </button>
          {salvo && <span className="text-sm text-primary">Configuração salva.</span>}
        </div>
      </form>
    </div>
  );
}

function BannerPlataformaCard({ bannerAtual }: { bannerAtual: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(bannerAtual);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setArquivoSelecionado(arquivo);
    setErro(null);
    setEnviado(false);
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  async function handleUpload() {
    if (!arquivoSelecionado) return;
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.set('arquivo', arquivoSelecionado);
      const url = await uploadBannerPlataforma(formData);
      setPreview(url);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
      setEnviado(true);
      setTimeout(() => setEnviado(false), 2500);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <ImageIcon size={18} />
        <h2 className="font-semibold text-white">Banner Institucional</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Substituído pelo banner acima ("Banner da Página Inicial") — a Home não exibe mais essa imagem. Deixado aqui
        caso queira reaproveitar o campo/upload em outro lugar futuramente; não precisa preencher.
      </p>

      {preview && (
        <div className="mb-4 aspect-[16/6] w-full overflow-hidden rounded bg-surface-lowest">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia do banner institucional" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleSelecionarArquivo} className="hidden" id="banner-plataforma-input" />
        <label htmlFor="banner-plataforma-input" className="btn-secondary cursor-pointer">
          Escolher imagem
        </label>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!arquivoSelecionado || enviando}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} /> {enviando ? 'Enviando...' : 'Enviar Banner'}
        </button>
        {enviado && <span className="text-sm text-primary">Banner atualizado.</span>}
      </div>

      {erro && <p className="mt-2 text-sm text-error">{erro}</p>}
    </div>
  );
}

function BannerHomeCard({
  bannerHomeAtual,
}: {
  bannerHomeAtual: { banner_capa_url: string | null; banner_badge: string; banner_resumo: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(bannerHomeAtual.banner_capa_url);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [imagemEnviada, setImagemEnviada] = useState(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);

  const [badge, setBadge] = useState(bannerHomeAtual.banner_badge);
  const [resumo, setResumo] = useState(bannerHomeAtual.banner_resumo);
  const [salvandoTexto, setSalvandoTexto] = useState(false);
  const [textoSalvo, setTextoSalvo] = useState(false);

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setArquivoSelecionado(arquivo);
    setErroImagem(null);
    setImagemEnviada(false);
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  async function handleUploadImagem() {
    if (!arquivoSelecionado) return;
    setEnviandoImagem(true);
    setErroImagem(null);
    try {
      const formData = new FormData();
      formData.set('arquivo', arquivoSelecionado);
      const url = await uploadBannerHomeCapa(formData);
      setPreview(url);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
      setImagemEnviada(true);
      setTimeout(() => setImagemEnviada(false), 2500);
    } catch (err: any) {
      setErroImagem(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviandoImagem(false);
    }
  }

  async function handleSubmitTexto(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoTexto(true);
    setTextoSalvo(false);
    await salvarBannerHomeTexto({ banner_badge: badge, banner_resumo: resumo });
    setSalvandoTexto(false);
    setTextoSalvo(true);
    setTimeout(() => setTextoSalvo(false), 2500);
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <ImageIcon size={18} />
        <h2 className="font-semibold text-white">Banner da Página Inicial</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Banner exibido no topo da Home (/membros). O badge, a logo da plataforma e o resumo abaixo são renderizados
        por cima da imagem — envie uma foto de fundo <strong>sem texto embutido</strong>. Qualquer campo de texto
        vazio simplesmente não aparece.
      </p>

      <div className="mb-5">
        <label className="mb-1 block text-xs font-medium text-primary">Capa do banner (16:9)</label>
        {preview && (
          <div className="mb-2 aspect-video w-full overflow-hidden rounded bg-surface-lowest">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Prévia da capa do banner da Home" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleSelecionarArquivo}
            className="hidden"
            id="banner-home-capa-input"
          />
          <label htmlFor="banner-home-capa-input" className="btn-secondary cursor-pointer">
            Escolher imagem
          </label>
          <button
            type="button"
            onClick={handleUploadImagem}
            disabled={!arquivoSelecionado || enviandoImagem}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={16} /> {enviandoImagem ? 'Enviando...' : 'Enviar Capa'}
          </button>
          {imagemEnviada && <span className="text-sm text-primary">Capa atualizada.</span>}
        </div>
        {erroImagem && <p className="mt-2 text-sm text-error">{erroImagem}</p>}
      </div>

      <form onSubmit={handleSubmitTexto} className="space-y-3 border-t border-border/60 pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Badge</label>
          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="Plataforma de Cursos Online"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Resumo rápido</label>
          <textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Seus cursos, todos em um só lugar."
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={salvandoTexto} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {salvandoTexto ? 'Salvando...' : 'Salvar Textos'}
          </button>
          {textoSalvo && <span className="text-sm text-primary">Textos salvos.</span>}
        </div>
      </form>
    </div>
  );
}

// Fundo do card em destaque (hero) do topo da Home (CursoDestaque) — campo
// próprio (hero_destaque_url), isolado tanto de cursos.capa_url (capa de
// cada curso) quanto de banner_capa_url (o "Banner da Página Inicial" logo
// acima, uma camada visual separada). Único upload desta tela que restringe
// o formato do arquivo (jpg/png/webp) e tem botão de remover — os outros
// (Banner Institucional/Banner da Página Inicial) aceitam qualquer imagem e
// só substituem, nunca limpam.
function HeroDestaqueCard({ heroDestaqueAtual }: { heroDestaqueAtual: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(heroDestaqueAtual);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setArquivoSelecionado(arquivo);
    setErro(null);
    setEnviado(false);
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  async function handleUpload() {
    if (!arquivoSelecionado) return;
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.set('arquivo', arquivoSelecionado);
      const url = await uploadHeroDestaque(formData);
      setPreview(url);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
      setEnviado(true);
      setTimeout(() => setEnviado(false), 2500);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    setRemovendo(true);
    setErro(null);
    setEnviado(false);
    try {
      await removerHeroDestaque();
      setPreview(null);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao remover a imagem.');
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Sparkles size={18} />
        <h2 className="font-semibold text-white">Destaque da Home</h2>
      </div>

      <p className="mb-1 text-xs text-on-variant">
        Imagem de fundo do card em destaque (hero) da Home, dentro do feed — independente da capa de qualquer curso.
        Sem imagem cadastrada, o hero usa um fundo escuro sólido em vez de ficar quebrado.
      </p>
      <p className="mb-3 text-xs text-on-variant">
        Proporção recomendada: <strong className="text-on-surface">16:9</strong> (ex: 1920×1080px), sem texto
        embutido — a imagem é cortada (recorte central) pra preencher o card em qualquer largura de tela.
      </p>

      {preview ? (
        <div className="mb-3 aspect-video w-full overflow-hidden rounded bg-surface-lowest">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia do destaque da Home" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-3 flex aspect-video w-full items-center justify-center rounded border border-dashed border-border/60 bg-surface-lowest text-xs text-on-variant">
          Nenhuma imagem cadastrada — fundo escuro sólido em uso
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSelecionarArquivo}
          className="hidden"
          id="hero-destaque-input"
        />
        <label htmlFor="hero-destaque-input" className="btn-secondary cursor-pointer">
          {preview ? 'Trocar imagem' : 'Escolher imagem'}
        </label>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!arquivoSelecionado || enviando}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} /> {enviando ? 'Enviando...' : 'Enviar Imagem'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleRemover}
            disabled={removendo || enviando}
            className="flex items-center gap-1.5 text-sm text-error hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            <Trash2 size={14} /> {removendo ? 'Removendo...' : 'Remover'}
          </button>
        )}
        {enviado && <span className="text-sm text-primary">Imagem atualizada.</span>}
      </div>

      <p className="mt-2 text-[0.7rem] text-on-variant">Formatos aceitos: JPG, PNG ou WEBP — até 5MB.</p>

      {erro && <p className="mt-2 text-sm text-error">{erro}</p>}
    </div>
  );
}

// Fundo da tela de login (login_background_url) — mesmo padrão do
// HeroDestaqueCard acima (upload restrito a jpg/png/webp + botão de
// remover), campo próprio, isolado de qualquer outro fundo da plataforma.
// Sem imagem cadastrada, a tela de login cai no fallback estático
// /hero-destaque.png (ver app/login/page.tsx e components/LoginPageClient.tsx)
// — nunca fica sem fundo.
function LoginBackgroundCard({ loginBackgroundAtual }: { loginBackgroundAtual: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(loginBackgroundAtual);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setArquivoSelecionado(arquivo);
    setErro(null);
    setEnviado(false);
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  async function handleUpload() {
    if (!arquivoSelecionado) return;
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.set('arquivo', arquivoSelecionado);
      const url = await uploadLoginBackground(formData);
      setPreview(url);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
      setEnviado(true);
      setTimeout(() => setEnviado(false), 2500);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    setRemovendo(true);
    setErro(null);
    setEnviado(false);
    try {
      await removerLoginBackground();
      setPreview(null);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao remover a imagem.');
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <LogIn size={18} />
        <h2 className="font-semibold text-white">Fundo da Tela de Login</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Imagem de fundo em tela cheia atrás do card de login. Sem imagem cadastrada, a tela usa uma imagem padrão —
        nunca fica sem fundo.
      </p>

      {preview ? (
        <div className="mb-3 aspect-video w-full overflow-hidden rounded bg-surface-lowest">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia do fundo da tela de login" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-3 flex aspect-video w-full items-center justify-center rounded border border-dashed border-border/60 bg-surface-lowest text-xs text-on-variant">
          Nenhuma imagem cadastrada — usando a imagem padrão
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSelecionarArquivo}
          className="hidden"
          id="login-background-input"
        />
        <label htmlFor="login-background-input" className="btn-secondary cursor-pointer">
          {preview ? 'Trocar imagem' : 'Escolher imagem'}
        </label>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!arquivoSelecionado || enviando}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} /> {enviando ? 'Enviando...' : 'Enviar Imagem'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleRemover}
            disabled={removendo || enviando}
            className="flex items-center gap-1.5 text-sm text-error hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            <Trash2 size={14} /> {removendo ? 'Removendo...' : 'Remover'}
          </button>
        )}
        {enviado && <span className="text-sm text-primary">Imagem atualizada.</span>}
      </div>

      <p className="mt-2 text-[0.7rem] text-on-variant">Formatos aceitos: JPG, PNG ou WEBP — até 5MB.</p>

      {erro && <p className="mt-2 text-sm text-error">{erro}</p>}
    </div>
  );
}
