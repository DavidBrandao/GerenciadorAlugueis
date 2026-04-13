"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Imovel, Pagamento } from "@/lib/types";

interface PagamentoComImovel extends Pagamento {
  imovel_id: string;
}

interface DashboardClientProps {
  imoveis: Imovel[];
  pagamentos: PagamentoComImovel[];
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getYM(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function DashboardClient({ imoveis, pagamentos }: DashboardClientProps) {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  // Seção 2: date range state
  const [dataInicio, setDataInicio] = useState(`${anoAtual}-01-01`);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split("T")[0]);
  const [filtroImovel, setFiltroImovel] = useState<string>("todos");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // ===== SEÇÃO 1: Previsão de Receita - próximos 6 meses =====
  const previsao = useMemo(() => {
    const meses: { mes: number; ano: number; label: string; pago: number; pendente: number; total: number }[] = [];

    for (let i = 0; i < 6; i++) {
      let m = mesAtual + i;
      let a = anoAtual;
      if (m > 11) {
        m -= 12;
        a += 1;
      }
      const ym = `${a}-${String(m + 1).padStart(2, "0")}`;
      const doMes = pagamentos.filter((p) => getYM(p.mes_referencia) === ym);
      const pago = doMes.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0);
      const pendente = doMes.filter((p) => !p.pago).reduce((s, p) => s + p.valor, 0);
      const total = pago + pendente;

      meses.push({
        mes: m,
        ano: a,
        label: `${MESES[m].slice(0, 3)}/${a}`,
        pago,
        pendente,
        total,
      });
    }
    return meses;
  }, [pagamentos, mesAtual, anoAtual]);

  // ===== SEÇÃO 2: Receita Recebida + Detalhamento =====
  const receitaData = useMemo(() => {
    const filtradas = pagamentos.filter((p) => {
      if (!p.pago || !p.data_pagamento) return false;
      if (p.data_pagamento < dataInicio || p.data_pagamento > dataFim) return false;
      if (filtroImovel !== "todos" && p.imovel_id !== filtroImovel) return false;
      return true;
    });

    const totalRecebido = filtradas.reduce((s, p) => s + p.valor, 0);

    // Agrupar por imóvel
    const porImovel = new Map<string, PagamentoComImovel[]>();
    filtradas.forEach((p) => {
      const list = porImovel.get(p.imovel_id) ?? [];
      list.push(p);
      porImovel.set(p.imovel_id, list);
    });

    const imoveisComReceita = imoveis
      .map((imovel) => {
        const pags = porImovel.get(imovel.id) ?? [];
        const total = pags.reduce((s, p) => s + p.valor, 0);
        return { imovel, pagamentos: pags, total };
      })
      .filter((i) => i.total > 0);

    return { totalRecebido, imoveisComReceita };
  }, [pagamentos, dataInicio, dataFim, filtroImovel, imoveis]);

  function toggleExpandido(imovelId: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(imovelId)) {
        next.delete(imovelId);
      } else {
        next.add(imovelId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* ===== SEÇÃO 1: Previsão de Receita ===== */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Previsão de Receita</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {previsao.map((item) => {
            const percent = item.total > 0 ? (item.pago / item.total) * 100 : 0;
            const isAtual = item.mes === mesAtual && item.ano === anoAtual;
            return (
              <Card
                key={`${item.ano}-${item.mes}`}
                className={isAtual ? "ring-2 ring-primary" : ""}
              >
                <CardContent className="p-3 space-y-2">
                  <p className={`text-xs font-medium text-center ${isAtual ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label}
                  </p>
                  <p className="text-center font-bold text-sm">
                    {formatCurrency(item.total)}
                  </p>
                  {/* Barra de progresso */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="space-y-0.5 text-[10px]">
                    <p className="text-green-600">Recebido: {formatCurrency(item.pago)}</p>
                    <p className="text-yellow-600">Falta Receber: {formatCurrency(item.pendente)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ===== SEÇÃO 2: Receita Recebida ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Receita Recebida</h3>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Imóvel</label>
            <select
              value={filtroImovel}
              onChange={(e) => setFiltroImovel(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
            >
              <option value="todos">Todos Imóveis</option>
              {imoveis.map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Recebido no Período</span>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(receitaData.totalRecebido)}
            </span>
          </CardContent>
        </Card>

        {/* Detalhamento por imóvel */}
        <div className="space-y-2">
          {receitaData.imoveisComReceita.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum pagamento encontrado no período selecionado.
            </p>
          ) : (
            receitaData.imoveisComReceita.map(({ imovel, pagamentos: pags, total }) => {
              const aberto = expandidos.has(imovel.id);
              return (
                <Card key={imovel.id}>
                  <button
                    type="button"
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                    onClick={() => toggleExpandido(imovel.id)}
                  >
                    <div className="flex items-center gap-2">
                      {aberto ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{imovel.nome}</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatCurrency(total)}
                    </span>
                  </button>
                  {aberto && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="border-t pt-3 space-y-1.5">
                        {pags
                          .sort((a, b) => (a.data_pagamento ?? "").localeCompare(b.data_pagamento ?? ""))
                          .map((p) => {
                            const [year, month] = p.mes_referencia.split("-");
                            const monthIdx = parseInt(month, 10) - 1;
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/30"
                              >
                                <span className="text-muted-foreground">
                                  {MESES[monthIdx]} {year}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className="text-xs text-muted-foreground">
                                    pago em {formatDate(p.data_pagamento!)}
                                  </span>
                                  <span className="font-medium w-24 text-right">
                                    {formatCurrency(p.valor)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
