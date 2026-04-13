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
  tipoImovel?: string;
}

function maskCurrency(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrency(v: string): number {
  if (!v) return 0;
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
}

export function AluguelInfo({ aluguel, imovelId, pagamentos, tipoImovel }: AluguelInfoProps) {
  const [editando, setEditando] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Inquilino fields
  const [nome, setNome] = useState(aluguel.inquilino.nome_completo);
  const [cpf, setCpf] = useState(aluguel.inquilino.cpf);
  const [rg, setRg] = useState(aluguel.inquilino.rg);
  const [endereco, setEndereco] = useState(aluguel.inquilino.endereco);
  const [telefone, setTelefone] = useState(aluguel.inquilino.telefone);
  const [email, setEmail] = useState(aluguel.inquilino.email ?? "");

  // Aluguel fields
  const [dataInicio, setDataInicio] = useState(aluguel.data_inicio);
  const [dataFim, setDataFim] = useState(aluguel.data_fim);
  const [valorDisplay, setValorDisplay] = useState(
    aluguel.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
  const [observacoes, setObservacoes] = useState(aluguel.observacoes ?? "");

  const remaining =
    aluguel.valor_sinal != null
      ? aluguel.valor_total - aluguel.valor_sinal
      : null;

  function handleSalvar() {
    const valorNum = parseCurrency(valorDisplay);
    if (!nome.trim() || !cpf.trim() || !rg.trim() || !endereco.trim() || !telefone.trim()) return;
    if (isNaN(valorNum) || valorNum <= 0) return;
    if (!dataInicio || !dataFim || dataFim <= dataInicio) return;

    startTransition(async () => {
      await editarAluguel(
        aluguel.id,
        aluguel.inquilino.id,
        imovelId,
        {
          nomeCompleto: nome.trim(),
          cpf: cpf.trim(),
          rg: rg.trim(),
          endereco: endereco.trim(),
          telefone: telefone.trim(),
          email: email.trim() || null,
          dataInicio,
          dataFim,
          valorTotal: valorNum,
          observacoes: observacoes.trim() || null,
        }
      );
      setEditando(false);
    });
  }

  function handleCancelar() {
    setNome(aluguel.inquilino.nome_completo);
    setCpf(aluguel.inquilino.cpf);
    setRg(aluguel.inquilino.rg);
    setEndereco(aluguel.inquilino.endereco);
    setTelefone(aluguel.inquilino.telefone);
    setEmail(aluguel.inquilino.email ?? "");
    setDataInicio(aluguel.data_inicio);
    setDataFim(aluguel.data_fim);
    setValorDisplay(
      aluguel.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    setObservacoes(aluguel.observacoes ?? "");
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
        {/* Inquilino */}
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

        {editando ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">CPF</span>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={isPending} />
            </div>
            <div>
              <span className="text-muted-foreground">RG</span>
              <Input value={rg} onChange={(e) => setRg(e.target.value)} disabled={isPending} />
            </div>
            <div>
              <span className="text-muted-foreground">Telefone</span>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={isPending} />
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={isPending} />
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Endereço</span>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} disabled={isPending} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">CPF</span>
              <p className="font-medium">{aluguel.inquilino.cpf}</p>
            </div>
            <div>
              <span className="text-muted-foreground">RG</span>
              <p className="font-medium">{aluguel.inquilino.rg}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Telefone</span>
              <p className="font-medium">{aluguel.inquilino.telefone}</p>
            </div>
            {aluguel.inquilino.email && (
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{aluguel.inquilino.email}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-muted-foreground">Endereço</span>
              <p className="font-medium">{aluguel.inquilino.endereco}</p>
            </div>
          </div>
        )}

        {/* Período */}
        <div>
          <span className="text-sm text-muted-foreground">Período</span>
          {editando ? (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-xs text-muted-foreground">Início</span>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Fim</span>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          ) : (
            <p className="font-medium">
              {formatDate(aluguel.data_inicio)} a {formatDate(aluguel.data_fim)}
            </p>
          )}
        </div>

        <Separator />

        {/* Valor Mensal */}
        <div>
          <span className="text-sm text-muted-foreground">Valor Mensal</span>
          {editando ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                className="pl-9"
                inputMode="numeric"
                value={valorDisplay}
                onChange={(e) => setValorDisplay(maskCurrency(e.target.value))}
                disabled={isPending}
              />
            </div>
          ) : (
            <p className="font-medium text-lg">
              {formatCurrency(aluguel.valor_total)}
            </p>
          )}
        </div>

        {/* Valor Pago */}
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

        {/* Observações */}
        {editando ? (
          <div>
            <span className="text-sm text-muted-foreground">Observações</span>
            <Input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações (opcional)"
              disabled={isPending}
            />
          </div>
        ) : (
          aluguel.observacoes && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Observações</span>
                <p className="text-sm">{aluguel.observacoes}</p>
              </div>
            </>
          )
        )}

        {/* Save/Cancel buttons */}
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

        {/* Sinal info for sitio */}
        {aluguel.valor_sinal != null && tipoImovel === "sitio" && (
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

        {/* Fiança info for casa/box */}
        {aluguel.valor_sinal != null && tipoImovel && tipoImovel !== "sitio" && (() => {
          const sorted = [...pagamentos].sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));
          const firstPago = sorted.length > 0 && sorted[0].pago;
          return (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fiança</span>
              <Badge
                className={
                  firstPago
                    ? "bg-green-600 text-white"
                    : "bg-yellow-500 text-yellow-900"
                }
              >
                {firstPago ? "Fiança Paga" : "Fiança Pendente"}
              </Badge>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
