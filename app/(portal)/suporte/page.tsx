import { createClient } from '@/lib/supabase/server';
import SuportePageClient from '@/components/membros/SuportePageClient';

// Rota NOVA (/suporte, pedido explícito) — antes o item "Suporte" do
// menu/bottom nav abria o WhatsApp direto (target="_blank"); agora navega
// pra esta página (contato + formulário + FAQ). numero_whatsapp: MESMA
// configuração que o botão de Suporte já usava em todo o resto da
// plataforma (Header.tsx, BottomNav.tsx, CursoDestaque.tsx, perfil,
// etc. — todas buscam essa mesma coluna de `configuracoes`) — reaproveitada
// aqui, não reinventada; buildSupportWhatsappLink (lib/utils.ts) é o mesmo
// helper que monta o link do wa.me em qualquer um desses lugares.
export default async function SuportePage() {
  const supabase = createClient();

  let numeroWhatsapp: string | null = null;
  try {
    const { data, error } = (await supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle()) as {
      data: { numero_whatsapp: string | null } | null;
      error: any;
    };
    if (error) console.error('[suporte] Falha ao buscar numero_whatsapp:', error.message);
    else numeroWhatsapp = data?.numero_whatsapp ?? null;
  } catch (err) {
    console.error('[suporte] Erro inesperado ao buscar numero_whatsapp:', err);
  }

  return <SuportePageClient numeroWhatsapp={numeroWhatsapp} />;
}
