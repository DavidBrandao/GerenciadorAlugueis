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
  nomeCompleto: string,
  valorTotal: number,
  imovelId: string
) {
  const supabase = await createClient();

  await supabase
    .from("inquilinos")
    .update({ nome_completo: nomeCompleto })
    .eq("id", inquilinoId);

  // Get old valor to identify which pagamentos are mensalidades
  const { data: aluguel } = await supabase
    .from("alugueis")
    .select("valor_total, valor_sinal")
    .eq("id", aluguelId)
    .single();

  await supabase
    .from("alugueis")
    .update({ valor_total: valorTotal })
    .eq("id", aluguelId);

  // Update pending mensalidades (not fiança/sinal) to the new value
  if (aluguel) {
    const oldValor = aluguel.valor_total;
    // Get pending pagamentos with the old mensal value
    const { data: pendentes } = await supabase
      .from("pagamentos")
      .select("id, valor")
      .eq("aluguel_id", aluguelId)
      .eq("pago", false)
      .eq("valor", oldValor);

    if (pendentes && pendentes.length > 0) {
      const ids = pendentes.map((p) => p.id);
      await supabase
        .from("pagamentos")
        .update({ valor: valorTotal })
        .in("id", ids);
    }
  }

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function pagarFianca(aluguelId: string, imovelId: string) {
  const supabase = await createClient();
  const hoje = new Date().toISOString().split("T")[0];

  // Get all unpaid pagamentos for this aluguel, ordered by mes_referencia
  const { data: pendentes } = await supabase
    .from("pagamentos")
    .select("id, mes_referencia, valor")
    .eq("aluguel_id", aluguelId)
    .eq("pago", false)
    .order("mes_referencia")
    .order("valor"); // sinal (lower valor) first

  if (!pendentes || pendentes.length === 0) return;

  // Pay the first two unpaid records (fiança + first mensalidade)
  const toPay = pendentes.slice(0, 2).map((p) => p.id);

  await supabase
    .from("pagamentos")
    .update({ pago: true, data_pagamento: hoje })
    .in("id", toPay);

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
