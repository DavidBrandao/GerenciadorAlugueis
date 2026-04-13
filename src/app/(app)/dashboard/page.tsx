import { createClient } from "@/lib/supabase/server";
import { ImovelCard } from "@/components/imovel-card";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: imoveis } = await supabase
    .from("imoveis")
    .select("*")
    .order("nome");

  const { data: alugueis } = await supabase
    .from("alugueis")
    .select("*, inquilino:inquilinos(*)")
    .eq("status", "ativo");

  // Fetch pagamentos for all active rentals
  const aluguelIds = (alugueis as AluguelComInquilino[])?.map((a) => a.id) ?? [];
  let pagamentos: Pagamento[] = [];
  if (aluguelIds.length > 0) {
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("*")
      .in("aluguel_id", aluguelIds);
    pagamentos = (pagData as Pagamento[]) ?? [];
  }

  // Group alugueis by imovel
  const alugueisPorImovel = new Map<string, AluguelComInquilino[]>();
  (alugueis as AluguelComInquilino[])?.forEach((a) => {
    const list = alugueisPorImovel.get(a.imovel_id) ?? [];
    list.push(a);
    alugueisPorImovel.set(a.imovel_id, list);
  });

  // Group pagamentos by aluguel
  const pagamentosPorAluguel = new Map<string, Pagamento[]>();
  pagamentos.forEach((p) => {
    const list = pagamentosPorAluguel.get(p.aluguel_id) ?? [];
    list.push(p);
    pagamentosPorAluguel.set(p.aluguel_id, list);
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(imoveis as Imovel[])?.map((imovel) => (
          <ImovelCard
            key={imovel.id}
            imovel={imovel}
            alugueisAtivos={alugueisPorImovel.get(imovel.id) ?? []}
            pagamentosPorAluguel={pagamentosPorAluguel}
          />
        ))}
      </div>
    </div>
  );
}
