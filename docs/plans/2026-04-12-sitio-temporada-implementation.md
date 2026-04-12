# Sitio Temporada Multi-Rental Support - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the bug blocking multiple temporada rentals on sitio properties and implement dashboard/property page improvements to display multiple active rentals with filtering, partial payments, and cancellation.

**Architecture:** Modify the server action to allow overlapping-free temporada rentals for sitio type. Update dashboard to aggregate multiple rentals per property. Refactor property detail page to show expandable per-rental cards filtered by the calendar's selected month. Add server actions for cancellation (soft delete) and partial payment registration.

**Tech Stack:** Next.js 16 (app router), React, Supabase (server + browser client), TypeScript, Tailwind CSS, @base-ui/react (Dialog, Collapsible)

---

### Task 1: Bug fix - allow multiple temporada rentals for sitio

**Files:**
- Modify: `src/app/(app)/imoveis/[id]/novo-aluguel/actions.ts`

**Step 1: Update the rental creation validation**

The current code at lines 32-38 blocks creation if ANY active rental exists. Replace with logic that:
1. Fetches the imovel type
2. For `sitio`: checks for date overlap against existing active rentals (allows multiple if no overlap)
3. For `casa`/`ponto_comercial`: keeps the current single-rental block

Replace lines 26-39 (from `// Validate dates` through the `aluguelExistente` check) with:

```tsx
  // Validate dates
  if (dataFim <= dataInicio) {
    return { error: "Data fim deve ser posterior a data inicio" };
  }

  // Fetch imovel type to determine rental rules
  const { data: imovel } = await supabase
    .from("imoveis")
    .select("tipo")
    .eq("id", imovelId)
    .single();

  if (!imovel) {
    return { error: "Imovel nao encontrado" };
  }

  if (imovel.tipo === "sitio") {
    // Sitio allows multiple temporada rentals if no date overlap
    const { data: alugueisAtivos } = await supabase
      .from("alugueis")
      .select("id, data_inicio, data_fim")
      .eq("imovel_id", imovelId)
      .eq("status", "ativo");

    if (alugueisAtivos) {
      for (const existente of alugueisAtivos) {
        const overlap =
          dataInicio <= existente.data_fim && dataFim >= existente.data_inicio;
        if (overlap) {
          return {
            error: `Conflito de datas com aluguel existente (${existente.data_inicio} a ${existente.data_fim})`,
          };
        }
      }
    }
  } else {
    // Casa/ponto_comercial: only one active rental allowed
    const { data: aluguelExistente } = await supabase
      .from("alugueis")
      .select("id")
      .eq("imovel_id", imovelId)
      .eq("status", "ativo")
      .single();

    if (aluguelExistente) {
      return { error: "Este imovel ja possui um aluguel ativo" };
    }
  }
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test in browser**

1. Go to a sitio property's novo-aluguel page
2. Create a temporada rental for days 1-3
3. Create another temporada rental for days 10-12 (should succeed now)
4. Try creating one for days 2-5 (should fail with overlap error)

**Step 4: Commit**

```bash
git add src/app/\(app\)/imoveis/\[id\]/novo-aluguel/actions.ts
git commit -m "fix: allow multiple temporada rentals for sitio without date overlap"
```

---

### Task 2: Server actions - cancelar aluguel and adicionar pagamento

**Files:**
- Modify: `src/app/(app)/imoveis/[id]/actions.ts`

**Step 1: Add cancelarAluguel action**

Append to the existing file:

```tsx
export async function cancelarAluguel(aluguelId: string, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("alugueis")
    .update({ status: "cancelado" })
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}
```

**Step 2: Add adicionarPagamento action**

Append to the same file:

```tsx
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
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/\(app\)/imoveis/\[id\]/actions.ts
git commit -m "feat: add cancelarAluguel and adicionarPagamento server actions"
```

---

### Task 3: Dashboard - update queries and ImovelCard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/imovel-card.tsx`

**Step 1: Update dashboard page to fetch all active rentals with pagamentos**

Replace the full content of `src/app/(app)/dashboard/page.tsx` with:

```tsx
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
      <h2 className="text-2xl font-bold mb-6">Imoveis</h2>
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
```

**Step 2: Rewrite ImovelCard to support sitio vs other types**

Replace the full content of `src/components/imovel-card.tsx` with:

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";

const tipoLabels: Record<string, string> = {
  sitio: "Sitio",
  casa: "Casa",
  ponto_comercial: "Ponto Comercial",
};

interface ImovelCardProps {
  imovel: Imovel;
  alugueisAtivos: AluguelComInquilino[];
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isMesOcupadoCompleto(
  alugueis: AluguelComInquilino[],
  year: number,
  month: number
): boolean {
  if (alugueis.length === 0) return false;
  const totalDays = getDaysInMonth(year, month);

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const coberto = alugueis.some((a) => {
      const start = new Date(a.data_inicio + "T00:00:00");
      const end = new Date(a.data_fim + "T00:00:00");
      return d >= start && d <= end;
    });
    if (!coberto) return false;
  }
  return true;
}

function getAlugueisDoMes(
  alugueis: AluguelComInquilino[],
  year: number,
  month: number
): AluguelComInquilino[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return alugueis.filter((a) => {
    const start = new Date(a.data_inicio + "T00:00:00");
    const end = new Date(a.data_fim + "T00:00:00");
    return start <= lastDay && end >= firstDay;
  });
}

function getDiasDoMes(
  aluguel: AluguelComInquilino,
  year: number,
  month: number
): number[] {
  const dias: number[] = [];
  const start = new Date(aluguel.data_inicio + "T00:00:00");
  const end = new Date(aluguel.data_fim + "T00:00:00");
  const totalDays = getDaysInMonth(year, month);

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    if (d >= start && d <= end) {
      dias.push(day);
    }
  }
  return dias;
}

function SitioContent({
  alugueisAtivos,
  pagamentosPorAluguel,
}: {
  alugueisAtivos: AluguelComInquilino[];
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}) {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = hoje.getMonth();

  const alugueisDoMes = getAlugueisDoMes(alugueisAtivos, year, month);

  if (alugueisDoMes.length === 0) return null;

  return (
    <CardContent className="space-y-2">
      {alugueisDoMes.map((aluguel) => {
        const dias = getDiasDoMes(aluguel, year, month);
        const pags = pagamentosPorAluguel.get(aluguel.id) ?? [];
        const totalPago = pags
          .filter((p) => p.pago)
          .reduce((sum, p) => sum + p.valor, 0);
        const pendente = aluguel.valor_total - totalPago;

        return (
          <div key={aluguel.id} className="text-sm space-y-0.5">
            <p>
              <span className="font-medium">
                {aluguel.inquilino.nome_completo}
              </span>
              {" — Dias "}
              {dias.map((d) => String(d).padStart(2, "0")).join(", ")}
            </p>
            <p className="text-muted-foreground">
              {formatCurrency(totalPago)} pago
              {pendente > 0 && (
                <> · {formatCurrency(pendente)} pendente</>
              )}
            </p>
          </div>
        );
      })}
    </CardContent>
  );
}

function CasaContent({
  aluguel,
  pagamentosPorAluguel,
}: {
  aluguel: AluguelComInquilino;
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}) {
  const hoje = new Date();
  const pags = pagamentosPorAluguel.get(aluguel.id) ?? [];

  // For mensal: find pagamento for current month
  // For temporada: use all pagamentos
  let valorMes = 0;
  let pagoMes = false;

  if (aluguel.tipo === "mensal") {
    const ym = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const pagMes = pags.find((p) => p.mes_referencia.startsWith(ym));
    if (pagMes) {
      valorMes = pagMes.valor;
      pagoMes = pagMes.pago;
    }
  } else {
    valorMes = aluguel.valor_total;
    const totalPago = pags.filter((p) => p.pago).reduce((sum, p) => sum + p.valor, 0);
    pagoMes = totalPago >= aluguel.valor_total;
  }

  return (
    <CardContent className="space-y-1">
      <p className="text-sm">
        <span className="font-medium">Inquilino:</span>{" "}
        {aluguel.inquilino.nome_completo}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(valorMes)} —{" "}
        <span className={pagoMes ? "text-green-600" : "text-yellow-600"}>
          {pagoMes ? "Pago" : "Pendente"}
        </span>
      </p>
    </CardContent>
  );
}

export function ImovelCard({
  imovel,
  alugueisAtivos,
  pagamentosPorAluguel,
}: ImovelCardProps) {
  const hoje = new Date();
  const isSitio = imovel.tipo === "sitio";

  // Determine badge
  let badgeVariant: "default" | "secondary" = "secondary";
  let badgeText = "Livre";

  if (isSitio) {
    const alugueisDoMes = getAlugueisDoMes(
      alugueisAtivos,
      hoje.getFullYear(),
      hoje.getMonth()
    );
    if (alugueisDoMes.length > 0) {
      const ocupadoCompleto = isMesOcupadoCompleto(
        alugueisAtivos,
        hoje.getFullYear(),
        hoje.getMonth()
      );
      if (ocupadoCompleto) {
        badgeVariant = "default";
        badgeText = "Ocupado";
      } else {
        badgeVariant = "default";
        badgeText = `${alugueisDoMes.length} ${alugueisDoMes.length === 1 ? "aluguel" : "alugueis"}`;
      }
    }
  } else {
    if (alugueisAtivos.length > 0) {
      badgeVariant = "default";
      badgeText = "Ocupado";
    }
  }

  return (
    <Link href={`/imoveis/${imovel.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{imovel.nome}</CardTitle>
            <Badge variant={badgeVariant}>{badgeText}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {tipoLabels[imovel.tipo]}
          </p>
        </CardHeader>
        {isSitio ? (
          <SitioContent
            alugueisAtivos={alugueisAtivos}
            pagamentosPorAluguel={pagamentosPorAluguel}
          />
        ) : (
          alugueisAtivos.length > 0 && (
            <CasaContent
              aluguel={alugueisAtivos[0]}
              pagamentosPorAluguel={pagamentosPorAluguel}
            />
          )
        )}
      </Card>
    </Link>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 4: Test in browser**

Navigate to `/dashboard`:
- Sitio with 0 rentals: shows "Livre"
- Sitio with some rentals: shows "X alugueis" with inquilino details
- Casa/ponto_comercial with rental: shows "Ocupado" with name + valor + pago/pendente
- Casa/ponto_comercial without rental: shows "Livre"

**Step 5: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx src/components/imovel-card.tsx
git commit -m "feat: update dashboard to show multiple rentals for sitio with payment details"
```

---

### Task 4: Calendario onMonthChange callback

**Files:**
- Modify: `src/components/calendario/calendario.tsx`

**Step 1: Add onMonthChange prop**

Add the optional callback to `CalendarioProps` and call it whenever the month/year changes.

Replace the full content of `src/components/calendario/calendario.tsx` with:

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarioMensal } from "./calendario-mensal";
import { CalendarioAnual } from "./calendario-anual";
import { Legenda } from "./legenda";
import { getFeriados, type Feriado } from "@/lib/feriados";

interface Pagamento {
  mes_referencia: string;
  pago: boolean;
}

interface Aluguel {
  data_inicio: string;
  data_fim: string;
  tipo: "mensal" | "temporada";
  pagamentos: Pagamento[];
}

export interface CalendarioProps {
  alugueis: Aluguel[];
  feriados?: Feriado[];
  onMonthChange?: (mes: number, ano: number) => void;
}

type Visao = "mensal" | "anual";

export function Calendario({ alugueis, feriados: feriadosProp, onMonthChange }: CalendarioProps) {
  const hoje = new Date();
  const [visao, setVisao] = useState<Visao>("mensal");
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const feriados = useMemo(() => {
    if (feriadosProp) return feriadosProp;
    return getFeriados(ano);
  }, [feriadosProp, ano]);

  useEffect(() => {
    onMonthChange?.(mes, ano);
  }, [mes, ano, onMonthChange]);

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

  function selecionarMes(m: number) {
    setMes(m);
    setVisao("mensal");
  }

  return (
    <div className="space-y-4">
      {/* Toggle and year navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setVisao("mensal")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              visao === "mensal"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setVisao("anual")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              visao === "anual"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Anual
          </button>
        </div>

        {/* Year navigation (shown in annual view) */}
        {visao === "anual" && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">{ano}</span>
            <Button variant="ghost" size="icon" onClick={() => setAno((a) => a + 1)} aria-label="Próximo ano">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Legenda />

      {/* Calendar content */}
      {visao === "mensal" ? (
        <CalendarioMensal
          mes={mes}
          ano={ano}
          alugueis={alugueis}
          feriados={feriados}
          onPrevMonth={irMesAnterior}
          onNextMonth={irProximoMes}
        />
      ) : (
        <CalendarioAnual
          ano={ano}
          alugueis={alugueis}
          feriados={feriados}
          onSelectMonth={selecionarMes}
        />
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/calendario/calendario.tsx
git commit -m "feat: add onMonthChange callback to Calendario component"
```

---

### Task 5: AlugueisMes component (expandable rental cards for sitio)

**Files:**
- Create: `src/components/alugueis-mes.tsx`

**Step 1: Create the AlugueisMes component**

This client component shows expandable cards for each rental in the selected month, with pagamento details, partial payment input, and cancel button.

Create `src/components/alugueis-mes.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cancelarAluguel, adicionarPagamento } from "@/app/(app)/imoveis/[id]/actions";
import type { AluguelComInquilino, Pagamento } from "@/lib/types";

interface AlugueisMesProps {
  alugueis: AluguelComInquilino[];
  pagamentosPorAluguel: Map<string, Pagamento[]>;
  mes: number;
  ano: number;
  imovelId: string;
}

function getAlugueisDoMes(
  alugueis: AluguelComInquilino[],
  year: number,
  month: number
): AluguelComInquilino[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return alugueis.filter((a) => {
    const start = new Date(a.data_inicio + "T00:00:00");
    const end = new Date(a.data_fim + "T00:00:00");
    return start <= lastDay && end >= firstDay;
  });
}

function AluguelCard({
  aluguel,
  pagamentos,
  imovelId,
}: {
  aluguel: AluguelComInquilino;
  pagamentos: Pagamento[];
  imovelId: string;
}) {
  const [open, setOpen] = useState(false);
  const [valorPagamento, setValorPagamento] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  const totalPago = pagamentos
    .filter((p) => p.pago)
    .reduce((sum, p) => sum + p.valor, 0);
  const pendente = aluguel.valor_total - totalPago;
  const estaPago = pendente <= 0;

  function handleAdicionarPagamento() {
    const valor = parseFloat(valorPagamento);
    if (isNaN(valor) || valor <= 0) return;

    startTransition(async () => {
      await adicionarPagamento(aluguel.id, valor, imovelId);
      setValorPagamento("");
    });
  }

  function handleCancelar() {
    startCancelTransition(async () => {
      await cancelarAluguel(aluguel.id, imovelId);
    });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
        <div className="flex items-center gap-3 text-left">
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <div>
            <p className="font-medium">{aluguel.inquilino.nome_completo}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(aluguel.data_inicio)} a {formatDate(aluguel.data_fim)}
            </p>
          </div>
        </div>
        <Badge
          className={
            estaPago
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-yellow-900"
          }
        >
          {estaPago ? "Pago" : "Pendente"}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent className="border border-t-0 rounded-b-lg p-4 space-y-4">
        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo</span>
            <p className="font-medium">
              {aluguel.tipo === "mensal" ? "Mensal" : "Temporada"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Valor Total</span>
            <p className="font-medium">{formatCurrency(aluguel.valor_total)}</p>
          </div>
          {aluguel.valor_sinal != null && (
            <div>
              <span className="text-muted-foreground">Sinal</span>
              <p className="font-medium">
                {formatCurrency(aluguel.valor_sinal)}
              </p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Pendente</span>
            <p className="font-medium">
              {pendente > 0 ? formatCurrency(pendente) : "R$ 0,00"}
            </p>
          </div>
        </div>

        {/* Pagamentos list */}
        {pagamentos.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Pagamentos</p>
            {pagamentos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-1 border-b last:border-0"
              >
                <span>
                  {p.data_pagamento
                    ? formatDate(p.data_pagamento)
                    : formatDate(p.mes_referencia)}
                </span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(p.valor)}</span>
                  <Badge
                    variant="secondary"
                    className={
                      p.pago
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {p.pago ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add payment (only if there's still a pending amount) */}
        {pendente > 0 && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">
                Adicionar Pagamento (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAdicionarPagamento}
              disabled={isPending || !valorPagamento}
            >
              {isPending ? "..." : "Adicionar"}
            </Button>
          </div>
        )}

        {/* Cancel button */}
        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={isCancelling}
              />
            }
          >
            {isCancelling ? "Cancelando..." : "Cancelar Aluguel"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Aluguel</DialogTitle>
              <DialogDescription>
                Tem certeza? O aluguel sera cancelado e as datas liberadas. Esta
                acao nao pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Voltar
              </DialogClose>
              <Button variant="destructive" onClick={handleCancelar}>
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AlugueisMes({
  alugueis,
  pagamentosPorAluguel,
  mes,
  ano,
  imovelId,
}: AlugueisMesProps) {
  const alugueisDoMes = getAlugueisDoMes(alugueis, ano, mes);

  if (alugueisDoMes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Nenhum aluguel neste mes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        Alugueis ({alugueisDoMes.length})
      </h3>
      {alugueisDoMes.map((aluguel) => (
        <AluguelCard
          key={aluguel.id}
          aluguel={aluguel}
          pagamentos={pagamentosPorAluguel.get(aluguel.id) ?? []}
          imovelId={imovelId}
        />
      ))}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/alugueis-mes.tsx
git commit -m "feat: add AlugueisMes component with expandable cards, payments, and cancellation"
```

---

### Task 6: Refactor property detail page to use new components

**Files:**
- Modify: `src/app/(app)/imoveis/[id]/page.tsx`

**Step 1: Rewrite the property detail page**

The page needs to:
1. Fetch ALL active rentals (not just one)
2. Fetch pagamentos for all active rentals
3. For sitio: use Calendario with onMonthChange + AlugueisMes
4. For casa/ponto_comercial: keep AluguelInfo + PagamentosTable + add cancel button

Replace the full content of `src/app/(app)/imoveis/[id]/page.tsx` with:

```tsx
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
    pagamentos: (pagamentosPorAluguel.get(a.id) ?? []).map((p) => ({
      mes_referencia: p.mes_referencia,
      pago: p.pago,
    })),
  }));

  // Serialize pagamentosPorAluguel for client component
  const pagamentosSerializado: Record<string, Pagamento[]> = {};
  pagamentosPorAluguel.forEach((pags, aluguelId) => {
    pagamentosSerializado[aluguelId] = pags;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{typedImovel.nome}</h2>
        <Link href={`/imoveis/${id}/novo-aluguel`}>
          <Button>Novo Aluguel</Button>
        </Link>
      </div>

      {typedImovel.descricao && (
        <p className="text-muted-foreground">{typedImovel.descricao}</p>
      )}

      <ImovelDetailClient
        imovel={typedImovel}
        alugueisAtivos={alugueisAtivos}
        calendarAlugueis={calendarAlugueis}
        pagamentosSerializado={pagamentosSerializado}
      />

      <Separator />

      <HistoricoAlugueis alugueis={historico} />
    </div>
  );
}
```

**Step 2: Create the ImovelDetailClient component**

This client component handles the month state and renders different content based on imovel type.

Create `src/components/imovel-detail-client.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Calendario } from "@/components/calendario/calendario";
import { AlugueisMes } from "@/components/alugueis-mes";
import { AluguelInfo } from "@/components/aluguel-info";
import { PagamentosTable } from "@/components/pagamentos-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { cancelarAluguel } from "@/app/(app)/imoveis/[id]/actions";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";
import Link from "next/link";

interface ImovelDetailClientProps {
  imovel: Imovel;
  alugueisAtivos: AluguelComInquilino[];
  calendarAlugueis: Array<{
    data_inicio: string;
    data_fim: string;
    tipo: "mensal" | "temporada";
    pagamentos: Array<{ mes_referencia: string; pago: boolean }>;
  }>;
  pagamentosSerializado: Record<string, Pagamento[]>;
}

export function ImovelDetailClient({
  imovel,
  alugueisAtivos,
  calendarAlugueis,
  pagamentosSerializado,
}: ImovelDetailClientProps) {
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [isCancelling, startCancelTransition] = useTransition();

  const pagamentosPorAluguel = new Map<string, Pagamento[]>(
    Object.entries(pagamentosSerializado)
  );

  const isSitio = imovel.tipo === "sitio";

  function handleMonthChange(mes: number, ano: number) {
    setMesSelecionado(mes);
    setAnoSelecionado(ano);
  }

  if (isSitio) {
    return (
      <>
        <Calendario
          alugueis={calendarAlugueis}
          onMonthChange={handleMonthChange}
        />

        <Separator />

        <AlugueisMes
          alugueis={alugueisAtivos}
          pagamentosPorAluguel={pagamentosPorAluguel}
          mes={mesSelecionado}
          ano={anoSelecionado}
          imovelId={imovel.id}
        />
      </>
    );
  }

  // Casa / ponto_comercial
  const aluguelAtivo = alugueisAtivos[0] ?? null;
  const pagamentos = aluguelAtivo
    ? pagamentosPorAluguel.get(aluguelAtivo.id) ?? []
    : [];

  function handleCancelar() {
    if (!aluguelAtivo) return;
    startCancelTransition(async () => {
      await cancelarAluguel(aluguelAtivo.id, imovel.id);
    });
  }

  return (
    <>
      <Calendario alugueis={calendarAlugueis} />

      <Separator />

      {aluguelAtivo ? (
        <div className="space-y-6">
          <AluguelInfo aluguel={aluguelAtivo} />
          <PagamentosTable
            pagamentos={pagamentos}
            aluguelTipo={aluguelAtivo.tipo}
            aluguelValorSinal={aluguelAtivo.valor_sinal}
            imovelId={imovel.id}
          />
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isCancelling}
                />
              }
            >
              {isCancelling ? "Cancelando..." : "Cancelar Aluguel"}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar Aluguel</DialogTitle>
                <DialogDescription>
                  Tem certeza? O aluguel sera cancelado e as datas liberadas.
                  Esta acao nao pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Voltar
                </DialogClose>
                <Button variant="destructive" onClick={handleCancelar}>
                  Confirmar Cancelamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground text-lg">Nenhum aluguel ativo</p>
          <Link href={`/imoveis/${imovel.id}/novo-aluguel`}>
            <Button size="lg">Novo Aluguel</Button>
          </Link>
        </div>
      )}
    </>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/\(app\)/imoveis/\[id\]/page.tsx src/components/imovel-detail-client.tsx
git commit -m "feat: refactor property page for multiple rentals with month filtering"
```

---

### Task 7: End-to-end testing

**Step 1: Test sitio flow**

1. Dashboard: sitio shows correct badge ("Livre", "X alugueis", "Ocupado") and inquilino list with payment details
2. Sitio detail page: calendar shows all active rentals painted, month navigation filters the rental list below
3. Expand a rental: shows details, pagamentos, pending amount
4. Add partial payment: enter value, click "Adicionar", pending amount decreases
5. Cancel a rental: click "Cancelar Aluguel", confirm dialog, rental disappears and dates freed
6. Create new rental: novo-aluguel page allows creating on freed dates

**Step 2: Test casa/ponto_comercial flow**

1. Dashboard: shows "Ocupado"/"Livre" with inquilino name, valor, pago/pendente
2. Detail page: shows AluguelInfo + PagamentosTable as before + "Cancelar Aluguel" button
3. Cancel works correctly

**Step 3: Fix any issues found, then commit**

```bash
git add -u
git commit -m "fix: polish after end-to-end testing"
```
