import { createClient } from "@/lib/supabase/server";
import type { Imovel, Pagamento } from "@/lib/types";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch all imoveis
  const { data: imoveisData } = await supabase
    .from("imoveis")
    .select("*")
    .order("nome");

  const imoveis = (imoveisData as Imovel[]) ?? [];

  // Fetch all alugueis (ativos + cancelados + finalizados)
  const { data: alugueisData } = await supabase
    .from("alugueis")
    .select("id, imovel_id, status");

  const aluguelIds = alugueisData?.map((a) => a.id) ?? [];
  const aluguelImovelMap: Record<string, string> = {};
  alugueisData?.forEach((a) => {
    aluguelImovelMap[a.id] = a.imovel_id;
  });

  let pagamentos: (Pagamento & { imovel_id: string })[] = [];
  if (aluguelIds.length > 0) {
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("*")
      .in("aluguel_id", aluguelIds)
      .order("mes_referencia");

    pagamentos = ((pagData as Pagamento[]) ?? []).map((p) => ({
      ...p,
      imovel_id: aluguelImovelMap[p.aluguel_id] ?? "",
    }));
  }

  return <DashboardClient imoveis={imoveis} pagamentos={pagamentos} />;
}
