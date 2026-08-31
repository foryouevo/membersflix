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

/**
 * Remove o prefixo numérico de ordenação (ex: "05 - ", "12- ") do início de
 * títulos de curso/módulo/aula antes de exibir — só na camada visual. Os
 * dados no banco continuam com o prefixo (nome_original, ordem etc.), usados
 * normalmente para ordenação e navegação; isso afeta apenas o texto exibido.
 *
 * Também remove qualquer emoji/símbolo decorativo que sobre logo no início
 * depois do prefixo (ex: "03 - 🔸Exercicios e Desafios" → "Exercicios e
 * Desafios") — alguns módulos tinham isso salvo direto no título no banco
 * (já corrigido lá também), mas essa é uma rede de segurança pra não
 * depender só da limpeza manual se algo parecido acontecer de novo.
 */
export function formatTitulo(titulo: string) {
  return titulo
    .replace(/^\d+\s*-\s*/, '')
    .replace(/^\p{Extended_Pictographic}+\s*/u, '');
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
