# Interactive Calendar on Novo-Aluguel Page - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace date inputs on the novo-aluguel page with an interactive CalendarioMensal that shows existing rentals and supports range selection with conflict blocking.

**Architecture:** Extend CalendarioMensal with optional props (`selectedRange`, `onDayClick`, `disabledDates`) so it remains read-only when those props are absent. The novo-aluguel page fetches existing rentals client-side and renders the interactive calendar instead of `<input type="date">`.

**Tech Stack:** Next.js (app router), React, Supabase (browser client), TypeScript, Tailwind CSS

---

### Task 1: Add interactive props to CalendarioMensal

**Files:**
- Modify: `src/components/calendario/calendario-mensal.tsx`

**Step 1: Add new optional props to the interface**

In `src/components/calendario/calendario-mensal.tsx`, add three optional props to `CalendarioMensalProps` (line 26-33):

```tsx
export interface CalendarioMensalProps {
  mes: number; // 0-11
  ano: number;
  alugueis: Aluguel[];
  feriados: Feriado[];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  // New interactive props
  selectedRange?: { start: Date | null; end: Date | null };
  onDayClick?: (date: Date) => void;
  disabledDates?: (date: Date) => boolean;
}
```

Destructure them in the component function signature (line 78-85):

```tsx
export function CalendarioMensal({
  mes,
  ano,
  alugueis,
  feriados,
  onPrevMonth,
  onNextMonth,
  selectedRange,
  onDayClick,
  disabledDates,
}: CalendarioMensalProps) {
```

**Step 2: Add helper to check if a day is in the selected range**

Add this function inside the component, before the `return`:

```tsx
function isDayInSelectedRange(day: number): "start" | "end" | "middle" | null {
  if (!selectedRange?.start) return null;
  const date = new Date(ano, mes, day);
  const start = selectedRange.start;
  const end = selectedRange.end;

  if (start && date.getTime() === start.getTime()) return "start";
  if (end && date.getTime() === end.getTime()) return "end";
  if (start && end && date > start && date < end) return "middle";
  if (start && !end && date.getTime() === start.getTime()) return "start";
  return null;
}
```

**Step 3: Update day cell rendering to support interactivity**

Replace the day cell rendering block (the `cells.map` inside the `<TooltipProvider>`, lines 166-203) with logic that adds:
- Selection highlight classes based on `isDayInSelectedRange(day)`
- Disabled visual when `disabledDates?.(date)` returns true
- `onClick` handler when `onDayClick` is present

Replace the full `cells.map` callback:

```tsx
{cells.map((day, i) => {
  if (day === null) {
    return <div key={`empty-${i}`} className="aspect-square" />;
  }

  const info = dayInfoMap.get(day)!;
  const hasTooltip = info.tooltipLines.length > 0;
  const date = new Date(ano, mes, day);
  const isDisabled = disabledDates?.(date) ?? false;
  const rangePos = isDayInSelectedRange(day);
  const isInteractive = !!onDayClick && !isDisabled;

  // Build classes
  let selectionClasses = "";
  if (rangePos === "start" || rangePos === "end") {
    selectionClasses = "bg-primary text-primary-foreground";
  } else if (rangePos === "middle") {
    selectionClasses = "bg-primary/20";
  }

  const disabledClasses = isDisabled
    ? "opacity-40 cursor-not-allowed"
    : "";

  const interactiveClasses = isInteractive
    ? "cursor-pointer hover:ring-2 hover:ring-primary/50"
    : "cursor-default hover:ring-1 hover:ring-border";

  const cellContent = (
    <div
      className={`relative aspect-square flex items-center justify-center text-sm rounded-md transition-colors ${info.bg} ${selectionClasses} ${disabledClasses} ${interactiveClasses}`}
      onClick={isInteractive ? () => onDayClick(date) : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDayClick(date);
              }
            }
          : undefined
      }
    >
      {day}
      {info.feriado && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
      )}
    </div>
  );

  if (!hasTooltip) {
    return <div key={day}>{cellContent}</div>;
  }

  return (
    <Tooltip key={day}>
      <TooltipTrigger asChild>
        {cellContent}
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5">
          {info.tooltipLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
})}
```

**Step 4: Verify existing usage is unaffected**

Run: `npx next build` or start dev server and check `/imoveis/[id]` page — the calendar should look and behave exactly as before since no new props are passed.

**Step 5: Commit**

```bash
git add src/components/calendario/calendario-mensal.tsx
git commit -m "feat: add optional interactive props to CalendarioMensal"
```

---

### Task 2: Update novo-aluguel page with interactive calendar

**Files:**
- Modify: `src/app/(app)/imoveis/[id]/novo-aluguel/page.tsx`

**Step 1: Add imports and state for calendar**

Add these imports at the top of the file:

```tsx
import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarioMensal } from "@/components/calendario/calendario-mensal";
import { getFeriados } from "@/lib/feriados";
```

Update the existing `useState` import to also include `useEffect` and `useMemo` (remove duplicate if `useState` is already imported from react).

Add state variables inside the component, after the existing state declarations:

```tsx
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
```

**Step 2: Add useEffect to fetch existing rentals**

Add this effect after the state declarations:

```tsx
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
```

**Step 3: Add disabledDates callback and day click handler**

```tsx
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
```

**Step 4: Add month navigation functions**

```tsx
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
```

**Step 5: Helper to format date as YYYY-MM-DD**

```tsx
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
```

**Step 6: Replace the date inputs in the JSX**

Remove the two `<div className="space-y-2">` blocks for `data_inicio` and `data_fim` (lines 160-173 in the current file). Replace them with:

```tsx
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
```

**Step 7: Add validation in handleSubmit**

At the top of `handleSubmit`, before `setIsSubmitting(true)`, add:

```tsx
if (!rangeStart || !rangeEnd) {
  setError("Selecione o periodo do aluguel no calendario.");
  return;
}
```

**Step 8: Verify in browser**

Run dev server, navigate to `/imoveis/[id]/novo-aluguel`:
- Calendar should display with existing rentals painted
- Clicking a free day selects it as start (highlighted with primary color)
- Clicking a second free day selects it as end (range painted)
- Clicking a disabled day does nothing
- Selecting a range that spans over an existing rental shows error message
- Clicking again resets the selection
- Form submission works with the hidden inputs

**Step 9: Commit**

```bash
git add src/app/\(app\)/imoveis/\[id\]/novo-aluguel/page.tsx
git commit -m "feat: replace date inputs with interactive calendar on novo-aluguel page"
```

---

### Task 3: Manual testing and polish

**Step 1: Test read-only calendar is unchanged**

Navigate to `/imoveis/[id]` — verify the existing CalendarioMensal looks and behaves exactly as before (no visual regressions).

**Step 2: Test interactive calendar on novo-aluguel**

1. Navigate to `/imoveis/[id]/novo-aluguel`
2. Verify existing rentals are painted (blue for contract, green for paid)
3. Click a free day — verify it highlights as start
4. Click a second free day after start — verify range is painted
5. Try to select a range that overlaps an existing rental — verify error message appears
6. Click again to reset — verify selection clears
7. Fill in the rest of the form and submit — verify aluguel is created correctly with the right dates

**Step 3: Test edge cases**

1. Navigate months forward/back — verify selection persists across month navigation
2. Select start in one month and end in another — verify it works
3. Submit without selecting dates — verify validation error appears

**Step 4: Fix any issues found, then commit**

```bash
git add -u
git commit -m "fix: polish interactive calendar after manual testing"
```
