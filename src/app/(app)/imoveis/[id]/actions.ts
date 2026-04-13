"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function togglePagamento(pagamentoId: string, pago: boolean, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("pagamentos")
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split("T")[0] : null,
    })
    .eq("id", pagamentoId);

  revalidatePath(`/imoveis/${imovelId}`);
}

export async function toggleSinal(aluguelId: string, sinalPago: boolean, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("alugueis")
    .update({ sinal_pago: sinalPago })
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
}

export async function cancelarAluguel(aluguelId: string, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("alugueis")
    .update({ status: "cancelado" })
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function excluirAluguel(
  aluguelId: string,
  senha: string,
  imovelId: string
): Promise<{ error?: string }> {
  if (senha !== "admin") {
    return { error: "Senha incorreta" };
  }

  const supabase = await createClient();

  // Delete pagamentos first (foreign key)
  await supabase
    .from("pagamentos")
    .delete()
    .eq("aluguel_id", aluguelId);

  await supabase
    .from("alugueis")
    .delete()
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function editarAluguel(
  aluguelId: string,
  inquilinoId: string,
  imovelId: string,
  dados: {
    nomeCompleto: string;
    cpf: string;
    rg: string;
    endereco: string;
    telefone: string;
    email: string | null;
    dataInicio: string;
    dataFim: string;
    valorTotal: number;
    observacoes: string | null;
  }
) {
  const supabase = await createClient();

  // Update inquilino
  await supabase
    .from("inquilinos")
    .update({
      nome_completo: dados.nomeCompleto,
      cpf: dados.cpf,
      rg: dados.rg,
      endereco: dados.endereco,
      telefone: dados.telefone,
      email: dados.email,
    })
    .eq("id", inquilinoId);

  // Get old aluguel data to check if dates or valor changed
  const { data: oldAluguel } = await supabase
    .from("alugueis")
    .select("data_inicio, data_fim, valor_total")
    .eq("id", aluguelId)
    .single();

  // Update aluguel
  await supabase
    .from("alugueis")
    .update({
      data_inicio: dados.dataInicio,
      data_fim: dados.dataFim,
      valor_total: dados.valorTotal,
      observacoes: dados.observacoes,
    })
    .eq("id", aluguelId);

  if (!oldAluguel) {
    revalidatePath(`/imoveis/${imovelId}`);
    revalidatePath("/dashboard");
    return;
  }

  const datesChanged =
    oldAluguel.data_inicio !== dados.dataInicio ||
    oldAluguel.data_fim !== dados.dataFim;
  const valorChanged = oldAluguel.valor_total !== dados.valorTotal;

  if (datesChanged) {
    // Recalculate parcelas: keep paid ones, regenerate unpaid
    // Delete all unpaid parcelas
    await supabase
      .from("pagamentos")
      .delete()
      .eq("aluguel_id", aluguelId)
      .eq("pago", false);

    // Get paid parcelas to know which months are already paid
    const { data: pagas } = await supabase
      .from("pagamentos")
      .select("mes_referencia")
      .eq("aluguel_id", aluguelId)
      .eq("pago", true);

    const mesesPagos = new Set((pagas ?? []).map((p) => p.mes_referencia.slice(0, 7)));

    // Generate new monthly records for the new date range
    const start = new Date(dados.dataInicio + "T00:00:00");
    const end = new Date(dados.dataFim + "T00:00:00");
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const novos: Array<{
      aluguel_id: string;
      mes_referencia: string;
      valor: number;
      pago: boolean;
    }> = [];

    while (current <= end) {
      const ym = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      if (!mesesPagos.has(ym)) {
        novos.push({
          aluguel_id: aluguelId,
          mes_referencia: current.toISOString().split("T")[0],
          valor: dados.valorTotal,
          pago: false,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }

    if (novos.length > 0) {
      await supabase.from("pagamentos").insert(novos);
    }
  } else if (valorChanged) {
    // Only valor changed: update all pending parcelas
    await supabase
      .from("pagamentos")
      .update({ valor: dados.valorTotal })
      .eq("aluguel_id", aluguelId)
      .eq("pago", false);
  }

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function pagarFianca(aluguelId: string, imovelId: string) {
  const supabase = await createClient();
  const hoje = new Date().toISOString().split("T")[0];

  // Pay the first unpaid mensalidade (which is the fiança month)
  const { data: pendentes } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("aluguel_id", aluguelId)
    .eq("pago", false)
    .order("mes_referencia")
    .limit(1);

  if (!pendentes || pendentes.length === 0) return;

  await supabase
    .from("pagamentos")
    .update({ pago: true, data_pagamento: hoje })
    .eq("id", pendentes[0].id);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function quitarAluguel(aluguelId: string, imovelId: string) {
  const supabase = await createClient();
  const hoje = new Date().toISOString().split("T")[0];

  await supabase
    .from("pagamentos")
    .update({ pago: true, data_pagamento: hoje })
    .eq("aluguel_id", aluguelId)
    .eq("pago", false);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function adicionarPagamento(
  aluguelId: string,
  valor: number,
  imovelId: string
) {
  const supabase = await createClient();

  await supabase.from("pagamentos").insert({
    aluguel_id: aluguelId,
    mes_referencia: new Date().toISOString().split("T")[0],
    valor,
    pago: true,
    data_pagamento: new Date().toISOString().split("T")[0],
  });

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}
