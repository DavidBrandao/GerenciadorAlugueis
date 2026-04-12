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
import { formatCurrency } from "@/lib/format";
import type { Pagamento } from "@/lib/types";
import { togglePagamento, pagarFianca } from "@/app/(app)/imoveis/[id]/actions";
import { useTransition } from "react";

interface PagamentosTableProps {
  pagamentos: Pagamento[];
  aluguelTipo: "mensal" | "temporada";
  aluguelValorSinal: number | null;
  imovelId: string;
  tipoImovel?: string;
  aluguelId?: string;
}

function formatMesReferencia(
  mesRef: string,
  tipo: "mensal" | "temporada",
  valorSinal: number | null,
  index: number,
  total: number,
  tipoImovel?: string
): string {
  if (tipo === "mensal") {
    // First entry with sinal is fiança/sinal
    if (valorSinal != null && index === 0) {
      return tipoImovel && tipoImovel !== "sitio" ? "Fiança" : "Sinal";
    }
    const [year, month] = mesRef.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
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

function FiancaRow({
  aluguelId,
  imovelId,
  fiancaPaga,
  fiancaValor,
}: {
  aluguelId: string;
  imovelId: string;
  fiancaPaga: boolean;
  fiancaValor: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handlePagarFianca() {
    startTransition(async () => {
      await pagarFianca(aluguelId, imovelId);
    });
  }

  if (fiancaPaga) return null;

  return (
    <TableRow className="bg-amber-50">
      <TableCell colSpan={3} className="font-medium">
        Pagar Fiança ({formatCurrency(fiancaValor)}) + 1ª Mensalidade
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={handlePagarFianca}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {isPending ? "..." : "Pagar"}
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
  tipoImovel,
  aluguelId,
}: PagamentosTableProps) {
  const sorted = [...pagamentos].sort(
    (a, b) => a.mes_referencia.localeCompare(b.mes_referencia) || a.valor - b.valor
  );

  const isCasaBox = tipoImovel && tipoImovel !== "sitio";
  const temFianca = isCasaBox && aluguelValorSinal != null;
  const fiancaPaga = temFianca
    ? sorted.length > 0 && sorted[0].pago
    : false;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês/Período</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {temFianca && aluguelId && !fiancaPaga && (
            <FiancaRow
              aluguelId={aluguelId}
              imovelId={imovelId}
              fiancaPaga={fiancaPaga}
              fiancaValor={aluguelValorSinal!}
            />
          )}
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
                  sorted.length,
                  tipoImovel
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
