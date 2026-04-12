"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { criarAluguel } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { CalendarioMensal } from "@/components/calendario/calendario-mensal";
import { getFeriados } from "@/lib/feriados";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NovoAluguelPage() {
  const params = useParams();
  const router = useRouter();
  const imovelId = params.id as string;

  const [tipo, setTipo] = useState<"mensal" | "temporada">("mensal");
  const [temSinal, setTemSinal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [alugueis, setAlugueis] = useState<Array<{
    data_inicio: string;
    data_fim: string;
    tipo: "mensal" | "temporada";
    pagamentos: Array<{ mes_referencia: string; pago: boolean }>;
  }>>([]);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const feriados = useMemo(() => getFeriados(ano), [ano]);

  useEffect(() => {
    async function fetchAlugueis() {
      const supabase = createClient();
      const { data: alugueisData } = await supabase
        .from("alugueis")
        .select("data_inicio, data_fim, tipo, pagamentos(mes_referencia, pago)")
        .eq("imovel_id", imovelId)
        .eq("status", "ativo");

      if (alugueisData) {
        setAlugueis(
          alugueisData.map((a: Record<string, unknown>) => ({
            data_inicio: a.data_inicio as string,
            data_fim: a.data_fim as string,
            tipo: a.tipo as "mensal" | "temporada",
            pagamentos: (a.pagamentos as Array<{ mes_referencia: string; pago: boolean }>) ?? [],
          }))
        );
      }
    }
    fetchAlugueis();
  }, [imovelId]);

  const disabledDates = useMemo(() => {
    return (date: Date) => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      for (const aluguel of alugueis) {
        const start = new Date(aluguel.data_inicio + "T00:00:00");
        const end = new Date(aluguel.data_fim + "T00:00:00");
        if (d >= start && d <= end) return true;
      }
      return false;
    };
  }, [alugueis]);

  function hasConflictInRange(start: Date, end: Date): boolean {
    const current = new Date(start);
    while (current <= end) {
      if (disabledDates(current)) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  }

  function handleDayClick(date: Date) {
    setRangeError(null);

    // If no start selected, set start
    if (!rangeStart) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    // If start selected but no end
    if (rangeStart && !rangeEnd) {
      // If clicked same day or before start, reset to new start
      if (date <= rangeStart) {
        setRangeStart(date);
        setRangeEnd(null);
        return;
      }

      // Check for conflicts between start and end
      if (hasConflictInRange(rangeStart, date)) {
        setRangeError("Existe um aluguel ativo no periodo selecionado.");
        return;
      }

      setRangeEnd(date);
      return;
    }

    // If both selected, reset and start new selection
    setRangeStart(date);
    setRangeEnd(null);
  }

  function irMesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function irProximoMes() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDateBR(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!rangeStart || !rangeEnd) {
      setError("Selecione o periodo do aluguel no calendario.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("tipo", tipo);
      formData.set("tem_sinal", temSinal ? "true" : "false");
      const result = await criarAluguel(imovelId, formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      // redirect() throws a NEXT_REDIRECT error, which is expected
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return;
      }
      setError("Erro ao criar aluguel. Verifique os dados e tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/imoveis/${imovelId}`}>
          <Button variant="outline" size="sm">
            ← Voltar
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">Novo Aluguel</h2>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Inquilino Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Inquilino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo</Label>
              <Input
                id="nome_completo"
                name="nome_completo"
                required
                placeholder="Nome completo do inquilino"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                required
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" name="rg" required placeholder="RG do inquilino" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                name="endereco"
                required
                placeholder="Endereço do inquilino"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                required
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@exemplo.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rental Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Aluguel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value) => {
                  if (value) setTipo(value as "mensal" | "temporada");
                }}
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="temporada">Temporada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Periodo do Aluguel</Label>
              <CalendarioMensal
                mes={mes}
                ano={ano}
                alugueis={alugueis}
                feriados={feriados}
                onPrevMonth={irMesAnterior}
                onNextMonth={irProximoMes}
                selectedRange={{ start: rangeStart, end: rangeEnd }}
                onDayClick={handleDayClick}
                disabledDates={disabledDates}
              />

              {rangeError && (
                <p className="text-sm text-destructive">{rangeError}</p>
              )}

              {rangeStart && (
                <p className="text-sm text-muted-foreground">
                  {rangeEnd
                    ? `${formatDateBR(rangeStart)} a ${formatDateBR(rangeEnd)}`
                    : `Inicio: ${formatDateBR(rangeStart)} — clique na data de fim`}
                </p>
              )}

              {/* Hidden inputs for form submission */}
              <input
                type="hidden"
                name="data_inicio"
                value={rangeStart ? formatDate(rangeStart) : ""}
              />
              <input
                type="hidden"
                name="data_fim"
                value={rangeEnd ? formatDate(rangeEnd) : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_total">
                {tipo === "mensal"
                  ? "Valor Mensal (R$)"
                  : "Valor Total (R$)"}
              </Label>
              <Input
                id="valor_total"
                name="valor_total"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="tem_sinal"
                type="checkbox"
                checked={temSinal}
                onChange={(e) => setTemSinal(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300"
              />
              <Label htmlFor="tem_sinal" className="cursor-pointer">
                Tem sinal?
              </Label>
            </div>

            {temSinal && (
              <div className="space-y-2">
                <Label htmlFor="valor_sinal">Valor do Sinal (R$)</Label>
                <Input
                  id="valor_sinal"
                  name="valor_sinal"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Aluguel"}
        </Button>
      </form>
    </div>
  );
}
