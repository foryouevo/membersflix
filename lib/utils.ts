import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

/** Monta o link wa.me com mensagem pré-preenchida (Regra 3). */
export function buildWhatsappLink(numeroWhatsapp: string, mensagemTemplate: string, cursoTitulo: string) {
  const numero = onlyDigits(numeroWhatsapp);
  const mensagem = mensagemTemplate.replace(/\{curso\}/g, cursoTitulo);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Link wa.me simples, sem placeholder — usado no item "Suporte" do menu. */
export function buildSupportWhatsappLink(numeroWhatsapp: string, mensagem = 'Olá, preciso de suporte') {
  return `https://wa.me/${onlyDigits(numeroWhatsapp)}?text=${encodeURIComponent(mensagem)}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** Formata bytes em B/KB/MB/GB (ex: 1536 -> "1.5 KB"). */
export function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 B';
  const unidades = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  const valor = bytes / Math.pow(1024, i);
  return `${i === 0 ? valor : valor.toFixed(1)} ${unidades[i]}`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
