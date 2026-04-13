import { createClient } from "@/lib/supabase/server";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { HistoricoAlugueis } from "@/components/historico-alugueis";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";
import { ImovelDetailClient } from "@/components/imovel-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ImovelPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch imovel
  const { data: imovel } = await supabase
    .from("imoveis")
    .select("*")
    .eq("id", id)
    .single();

  if (!imovel) {
    notFound();
  }

  const typedImovel = imovel as Imovel;

  // Fetch ALL active alugueis with inquilino
  const { data: alugueisAtivosData } = await supabase
    .from("alugueis")
    .select("*, inquilino:inquilinos(*)")
    .eq("imovel_id", id)
    .eq("status", "ativo")
    .order("data_inicio");

  const alugueisAtivos = (alugueisAtivosData as AluguelComInquilino[]) ?? [];

  // Fetch pagamentos for all active alugueis
  const aluguelIds = alugueisAtivos.map((a) => a.id);
  let pagamentos: Pagamento[] = [];
  if (aluguelIds.length > 0) {
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("*")
      .in("aluguel_id", aluguelIds)
      .order("mes_referencia");

    pagamentos = (pagData as Pagamento[]) ?? [];
  }

  // Group pagamentos by aluguel
  const pagamentosPorAluguel = new Map<string, Pagamento[]>();
  pagamentos.forEach((p) => {
    const list = pagamentosPorAluguel.get(p.aluguel_id) ?? [];
    list.push(p);
    pagamentosPorAluguel.set(p.aluguel_id, list);
  });

  // Fetch historical alugueis
  const { data: historicoData } = await supabase
    .from("alugueis")
    .select("*, inquilino:inquilinos(*)")
    .eq("imovel_id", id)
    .neq("status", "ativo")
    .order("data_inicio", { ascending: false });

  const historico = (historicoData as AluguelComInquilino[]) ?? [];

  // Build alugueis data for calendar
  const calendarAlugueis = alugueisAtivos.map((a) => ({
    data_inicio: a.data_inicio,
    data_fim: a.data_fim,
    tipo: a.tipo,
    inquilino_nome: a.inquilino.nome_completo,
    pagamentos: (pagamentosPorAluguel.get(a.id) ?? []).map((p) => ({
      mes_referencia: p.mes_referencia,
      pago: p.pago,
    })),
  }));

  // Serialize pagamentosPorAluguel for client component (Map can't be serialized)
  const pagamentosSerializado: Record<string, Pagamento[]> = {};
  pagamentosPorAluguel.forEach((pags, aluguelId) => {
    pagamentosSerializado[aluguelId] = pags;
  });

  const isSitio = typedImovel.tipo === "sitio";
  const temAluguelAtivo = alugueisAtivos.length > 0;
  const mostrarNovoAluguelTopo = isSitio;

  return (
    <div className="space-y-6">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">&larr; Voltar</Button>
      </Link>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{typedImovel.nome}</h2>
        {mostrarNovoAluguelTopo && (
          <Link href={`/imoveis/${id}/novo-aluguel`}>
            <Button>Novo Aluguel</Button>
          </Link>
        )}
      </div>

      <ImovelDetailClient
        imovel={typedImovel}
        alugueisAtivos={alugueisAtivos}
        calendarAlugueis={calendarAlugueis}
        pagamentosSerializado={pagamentosSerializado}
      />

      <Separator />

      <HistoricoAlugueis alugueis={historico} imovelId={id} />
    </div>
  );
}
