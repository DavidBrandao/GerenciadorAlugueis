"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { editarAluguel } from "@/app/(app)/imoveis/[id]/actions";
import type { AluguelComInquilino, Pagamento } from "@/lib/types";

interface AluguelInfoProps {
  aluguel: AluguelComInquilino;
  imovelId: string;
  pagamentos: Pagamento[];
}

export function AluguelInfo({ aluguel, imovelId, pagamentos }: AluguelInfoProps) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(aluguel.inquilino.nome_completo);
  const [valor, setValor] = useState(String(aluguel.valor_total));
  const [isPending, startTransition] = useTransition();

  const remaining =
    aluguel.valor_sinal != null
      ? aluguel.valor_total - aluguel.valor_sinal
      : null;

  function handleSalvar() {
    const valorNum = parseFloat(valor);
    if (!nome.trim() || isNaN(valorNum) || valorNum <= 0) return;

    startTransition(async () => {
      await editarAluguel(
        aluguel.id,
        aluguel.inquilino.id,
        nome.trim(),
        valorNum,
        imovelId
      );
      setEditando(false);
    });
  }

  function handleCancelar() {
    setNome(aluguel.inquilino.nome_completo);
    setValor(String(aluguel.valor_total));
    setEditando(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Aluguel Ativo</span>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">
              {aluguel.tipo === "mensal" ? "Mensal" : "Temporada"}
            </Badge>
            {!editando && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditando(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className="text-sm text-muted-foreground">Inquilino</span>
          {editando ? (
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={isPending}
            />
          ) : (
            <p className="font-medium">{aluguel.inquilino.nome_completo}</p>
          )}
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Periodo</span>
          <p className="font-medium">
            {formatDate(aluguel.data_inicio)} a {formatDate(aluguel.data_fim)}
          </p>
        </div>

        <Separator />

        <div>
          <span className="text-sm text-muted-foreground">Valor Mensal</span>
          {editando ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={isPending}
            />
          ) : (
            <p className="font-medium text-lg">
              {formatCurrency(aluguel.valor_total)}
            </p>
          )}
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Valor Pago Contrato</span>
          <p className="font-medium text-lg text-green-600">
            {formatCurrency(
              pagamentos
                .filter((p) => p.pago)
                .reduce((sum, p) => sum + p.valor, 0)
            )}
          </p>
        </div>

        {editando && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSalvar}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelar}
              disabled={isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        )}

        {aluguel.valor_sinal != null && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">
                  Valor Sinal
                </span>
                <p className="font-medium">
                  {formatCurrency(aluguel.valor_sinal)}
                </p>
              </div>
              <Badge
                variant={aluguel.sinal_pago ? "default" : "secondary"}
                className={
                  aluguel.sinal_pago
                    ? "bg-green-600"
                    : "bg-yellow-500 text-yellow-900"
                }
              >
                {aluguel.sinal_pago ? "Sinal Pago" : "Sinal Pendente"}
              </Badge>
            </div>

            {remaining != null && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Valor Restante
                </span>
                <p className="font-medium">{formatCurrency(remaining)}</p>
              </div>
            )}
          </>
        )}

        {aluguel.observacoes && (
          <>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground">Observacoes</span>
              <p className="text-sm">{aluguel.observacoes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
