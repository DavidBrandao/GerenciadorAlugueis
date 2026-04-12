"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Pagamento } from "@/lib/types";
import { togglePagamento } from "@/app/(app)/imoveis/[id]/actions";
import { useTransition } from "react";

interface PagamentosTableProps {
  pagamentos: Pagamento[];
  aluguelTipo: "mensal" | "temporada";
  aluguelValorSinal: number | null;
  imovelId: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatMesReferencia(
  mesRef: string,
  tipo: "mensal" | "temporada",
  valorSinal: number | null,
  index: number,
  total: number
): string {
  if (tipo === "mensal") {
    const [year, month] = mesRef.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }

  // temporada
  if (valorSinal != null && index === 0) {
    return "Sinal";
  }
  if (valorSinal != null && index === total - 1) {
    return "Restante";
  }
  // fallback for temporada without sinal
  const [year, month] = mesRef.split("-");
  return `${month}/${year}`;
}

function PagamentoRow({
  pagamento,
  label,
  imovelId,
}: {
  pagamento: Pagamento;
  label: string;
  imovelId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await togglePagamento(pagamento.id, !pagamento.pago, imovelId);
    });
  }

  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell>{formatCurrency(pagamento.valor)}</TableCell>
      <TableCell>
        <Badge
          className={
            pagamento.pago
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-yellow-900"
          }
        >
          {pagamento.pago ? "Pago" : "Pendente"}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={isPending}
        >
          {isPending
            ? "..."
            : pagamento.pago
              ? "Marcar Pendente"
              : "Marcar Pago"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function PagamentosTable({
  pagamentos,
  aluguelTipo,
  aluguelValorSinal,
  imovelId,
}: PagamentosTableProps) {
  const sorted = [...pagamentos].sort(
    (a, b) => a.mes_referencia.localeCompare(b.mes_referencia)
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes/Periodo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum pagamento registrado
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((pag, index) => (
              <PagamentoRow
                key={pag.id}
                pagamento={pag}
                label={formatMesReferencia(
                  pag.mes_referencia,
                  aluguelTipo,
                  aluguelValorSinal,
                  index,
                  sorted.length
                )}
                imovelId={imovelId}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
