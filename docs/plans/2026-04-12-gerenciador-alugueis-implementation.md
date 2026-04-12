# Gerenciador de Alugueis - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a responsive web app for managing rentals of 4 fixed properties with calendar visualization, payment tracking, and scheduling.

**Architecture:** Next.js App Router fullstack app with Supabase for auth and PostgreSQL. Server Components for data fetching, Client Components for interactivity (calendar, forms). Mobile-first responsive UI with Tailwind + shadcn/ui.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + PostgreSQL), react-day-picker

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.local.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

**Step 1: Create Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Project scaffolded with App Router, TypeScript, Tailwind.

**Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 3: Create .env.local.example**

Create ``.env.local.example``:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Supabase deps"
```

---

### Task 2: Initialize shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/lib/utils.ts`
- Create: `components.json`

**Step 1: Initialize shadcn**

Run:
```bash
npx shadcn@latest init -d
```

**Step 2: Add required components**

Run:
```bash
npx shadcn@latest add button card input label table dialog form select calendar badge tooltip separator collapsible
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize shadcn/ui with required components"
```

---

### Task 3: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

**Step 1: Create browser client**

Create ``src/lib/supabase/client.ts``:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server client**

Create ``src/lib/supabase/server.ts``:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

**Step 3: Create middleware for session refresh**

Create ``src/lib/supabase/middleware.ts``:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

Create ``src/middleware.ts``:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 4: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: add Supabase client setup with auth middleware"
```

---

### Task 4: Database Schema (Supabase SQL)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed.sql`

**Step 1: Create migration directory**

Run:
```bash
mkdir -p supabase/migrations
```

**Step 2: Write initial schema**

Create ``supabase/migrations/001_initial_schema.sql``:
```sql
-- Enum types
CREATE TYPE tipo_imovel AS ENUM ('sitio', 'casa', 'ponto_comercial');
CREATE TYPE tipo_aluguel AS ENUM ('mensal', 'temporada');
CREATE TYPE status_aluguel AS ENUM ('ativo', 'finalizado', 'cancelado');

-- Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imoveis (fixed, no CRUD)
CREATE TABLE imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo tipo_imovel NOT NULL,
  descricao TEXT
);

-- Inquilinos
CREATE TABLE inquilinos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT NOT NULL,
  endereco TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alugueis
CREATE TABLE alugueis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID REFERENCES imoveis(id) NOT NULL,
  inquilino_id UUID REFERENCES inquilinos(id) NOT NULL,
  tipo tipo_aluguel NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  valor_sinal NUMERIC(10,2),
  sinal_pago BOOLEAN DEFAULT FALSE,
  status status_aluguel DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluguel_id UUID REFERENCES alugueis(id) ON DELETE CASCADE NOT NULL,
  mes_referencia DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alugueis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything
CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated users can insert profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users full access imoveis" ON imoveis FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access inquilinos" ON inquilinos FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access alugueis" ON alugueis FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access pagamentos" ON pagamentos FOR ALL USING (auth.uid() IS NOT NULL);
```

**Step 3: Write seed data**

Create ``supabase/seed.sql``:
```sql
INSERT INTO imoveis (nome, tipo, descricao) VALUES
  ('Sitio', 'sitio', 'Sitio para aluguel por temporada'),
  ('Casa 1', 'casa', 'Casa para aluguel mensal'),
  ('Casa 2', 'casa', 'Casa para aluguel mensal'),
  ('Ponto Comercial', 'ponto_comercial', 'Ponto comercial para aluguel mensal');
```

**Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema and seed data"
```

> **Note for executor:** These SQL files must be run manually in the Supabase SQL Editor (Dashboard > SQL Editor). First run the migration, then the seed.

---

### Task 5: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Define database types**

Create ``src/lib/types.ts``:
```typescript
export type TipoImovel = "sitio" | "casa" | "ponto_comercial";
export type TipoAluguel = "mensal" | "temporada";
export type StatusAluguel = "ativo" | "finalizado" | "cancelado";

export interface Imovel {
  id: string;
  nome: string;
  tipo: TipoImovel;
  descricao: string | null;
}

export interface Inquilino {
  id: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  endereco: string;
  telefone: string;
  email: string | null;
  created_at: string;
}

export interface Aluguel {
  id: string;
  imovel_id: string;
  inquilino_id: string;
  tipo: TipoAluguel;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  valor_sinal: number | null;
  sinal_pago: boolean;
  status: StatusAluguel;
  observacoes: string | null;
  created_at: string;
}

export interface AluguelComInquilino extends Aluguel {
  inquilino: Inquilino;
}

export interface Pagamento {
  id: string;
  aluguel_id: string;
  mes_referencia: string;
  valor: number;
  pago: boolean;
  data_pagamento: string | null;
  created_at: string;
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 6: Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`

**Step 1: Create login server action**

Create ``src/app/login/actions.ts``:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: "Email ou senha incorretos" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
```

**Step 2: Create login page**

Create ``src/app/login/page.tsx``:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Gerenciador de Alugueis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Update root page to redirect**

Modify ``src/app/page.tsx`` to redirect to dashboard:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

**Step 4: Commit**

```bash
git add src/app/login/ src/app/page.tsx
git commit -m "feat: add login page with Supabase auth"
```

---

### Task 7: App Layout with Logout

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/header.tsx`

**Step 1: Create header component**

Create ``src/components/header.tsx``:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Gerenciador de Alugueis</h1>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          Sair
        </Button>
      </div>
    </header>
  );
}
```

**Step 2: Create app layout**

Create ``src/app/(app)/layout.tsx``:
```tsx
import { Header } from "@/components/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/\(app\)/ src/components/header.tsx
git commit -m "feat: add app layout with header and logout"
```

---

### Task 8: Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/imovel-card.tsx`

**Step 1: Create imovel card component**

Create ``src/components/imovel-card.tsx``:
```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Imovel, AluguelComInquilino } from "@/lib/types";

const tipoLabels: Record<string, string> = {
  sitio: "Sitio",
  casa: "Casa",
  ponto_comercial: "Ponto Comercial",
};

interface ImovelCardProps {
  imovel: Imovel;
  aluguelAtivo: AluguelComInquilino | null;
}

export function ImovelCard({ imovel, aluguelAtivo }: ImovelCardProps) {
  return (
    <Link href={`/imoveis/${imovel.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{imovel.nome}</CardTitle>
            <Badge variant={aluguelAtivo ? "default" : "secondary"}>
              {aluguelAtivo ? "Ocupado" : "Livre"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {tipoLabels[imovel.tipo]}
          </p>
        </CardHeader>
        {aluguelAtivo && (
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">Inquilino:</span>{" "}
              {aluguelAtivo.inquilino.nome_completo}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
```

**Step 2: Create dashboard page**

Create ``src/app/(app)/dashboard/page.tsx``:
```tsx
import { createClient } from "@/lib/supabase/server";
import { ImovelCard } from "@/components/imovel-card";
import type { Imovel, AluguelComInquilino } from "@/lib/types";

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

  const aluguelPorImovel = new Map<string, AluguelComInquilino>();
  alugueis?.forEach((a: AluguelComInquilino) => {
    aluguelPorImovel.set(a.imovel_id, a);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Imoveis</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(imoveis as Imovel[])?.map((imovel) => (
          <ImovelCard
            key={imovel.id}
            imovel={imovel}
            aluguelAtivo={aluguelPorImovel.get(imovel.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/ src/components/imovel-card.tsx
git commit -m "feat: add dashboard with property cards"
```

---

### Task 9: Brazilian Holidays Utility

**Files:**
- Create: `src/lib/feriados.ts`

**Step 1: Create holidays utility**

Create ``src/lib/feriados.ts``:
```typescript
// Calculates Easter using the Anonymous Gregorian algorithm
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function adicionarDias(date: Date, dias: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + dias);
  return result;
}

export interface Feriado {
  data: Date;
  nome: string;
}

export function getFeriados(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano);

  return [
    { data: new Date(ano, 0, 1), nome: "Ano Novo" },
    { data: adicionarDias(pascoa, -47), nome: "Carnaval" },
    { data: adicionarDias(pascoa, -46), nome: "Carnaval" },
    { data: adicionarDias(pascoa, -2), nome: "Sexta-feira Santa" },
    { data: new Date(ano, 3, 21), nome: "Tiradentes" },
    { data: new Date(ano, 4, 1), nome: "Dia do Trabalho" },
    { data: adicionarDias(pascoa, 60), nome: "Corpus Christi" },
    { data: new Date(ano, 8, 7), nome: "Independencia" },
    { data: new Date(ano, 9, 12), nome: "Nossa Sra. Aparecida" },
    { data: new Date(ano, 10, 2), nome: "Finados" },
    { data: new Date(ano, 10, 15), nome: "Proclamacao da Republica" },
    { data: new Date(ano, 11, 25), nome: "Natal" },
    { data: new Date(ano, 11, 31), nome: "Reveillon" },
  ];
}

export function isFeriado(date: Date, feriados: Feriado[]): Feriado | undefined {
  return feriados.find(
    (f) =>
      f.data.getDate() === date.getDate() &&
      f.data.getMonth() === date.getMonth() &&
      f.data.getFullYear() === date.getFullYear()
  );
}
```

**Step 2: Commit**

```bash
git add src/lib/feriados.ts
git commit -m "feat: add Brazilian holidays calculator"
```

---

### Task 10: Calendar Component

**Files:**
- Create: `src/components/calendario/calendario-mensal.tsx`
- Create: `src/components/calendario/calendario-anual.tsx`
- Create: `src/components/calendario/calendario.tsx`
- Create: `src/components/calendario/legenda.tsx`

**Step 1: Create calendar legend**

Create ``src/components/calendario/legenda.tsx``:
```tsx
export function Legenda() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-blue-400" />
        <span>Contrato</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-green-400" />
        <span>Pago</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-yellow-400" />
        <span>Feriado</span>
      </div>
    </div>
  );
}
```

**Step 2: Create monthly calendar**

Create ``src/components/calendario/calendario-mensal.tsx`` — a grid of days for a single month. Each day cell is colored based on whether it falls within a rental period, is paid, or is a holiday. Uses Tooltip for hover/tap details.

Key behaviors:
- Days within the rental period → blue background
- Days within a paid month → green background (overrides blue)
- Holidays → yellow dot indicator
- Tap/hover → tooltip with details

**Step 3: Create annual calendar**

Create ``src/components/calendario/calendario-anual.tsx`` — 12 month blocks in a 3x4 grid (desktop) / 2x6 (tablet) / 1x12 (mobile). Each month block shows a mini preview with colored indicators. Clicking a month switches to monthly view.

**Step 4: Create wrapper component**

Create ``src/components/calendario/calendario.tsx`` — toggle between monthly and annual views using a button group. Manages current month/year state.

**Step 5: Commit**

```bash
git add src/components/calendario/
git commit -m "feat: add calendar component with monthly/annual views"
```

---

### Task 11: Property Detail Page

**Files:**
- Create: `src/app/(app)/imoveis/[id]/page.tsx`
- Create: `src/components/aluguel-info.tsx`
- Create: `src/components/pagamentos-table.tsx`
- Create: `src/components/historico-alugueis.tsx`

**Step 1: Create rental info component**

Create ``src/components/aluguel-info.tsx`` — displays: inquilino name, period (data_inicio - data_fim), valor_total, valor_sinal (if any), sinal_pago status, remaining value, overall payment status.

**Step 2: Create payments table**

Create ``src/components/pagamentos-table.tsx`` — table with columns: Mes/Periodo, Valor, Status (badge pago/pendente), Action (button to toggle paid). Uses server action to update payment status.

**Step 3: Create rental history**

Create ``src/components/historico-alugueis.tsx`` — collapsible section showing previous rentals (status != 'ativo') with basic info.

**Step 4: Create property page**

Create ``src/app/(app)/imoveis/[id]/page.tsx`` — Server Component that:
1. Fetches imovel by id
2. Fetches active aluguel with inquilino
3. Fetches pagamentos for active aluguel
4. Fetches feriados for current year
5. Renders: Calendar, AluguelInfo, PagamentosTable, HistoricoAlugueis, "Novo Aluguel" button

**Step 5: Commit**

```bash
git add src/app/\(app\)/imoveis/ src/components/aluguel-info.tsx src/components/pagamentos-table.tsx src/components/historico-alugueis.tsx
git commit -m "feat: add property detail page with payments and calendar"
```

---

### Task 12: Payment Actions (Server Actions)

**Files:**
- Create: `src/app/(app)/imoveis/[id]/actions.ts`

**Step 1: Create server actions for payments**

Create ``src/app/(app)/imoveis/[id]/actions.ts``:
```typescript
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
```

**Step 2: Commit**

```bash
git add src/app/\(app\)/imoveis/\[id\]/actions.ts
git commit -m "feat: add server actions for payment toggling"
```

---

### Task 13: New Rental Form

**Files:**
- Create: `src/app/(app)/imoveis/[id]/novo-aluguel/page.tsx`
- Create: `src/app/(app)/imoveis/[id]/novo-aluguel/actions.ts`

**Step 1: Create server action for new rental**

Create ``src/app/(app)/imoveis/[id]/novo-aluguel/actions.ts`` — server action that:
1. Receives form data (inquilino fields + rental fields)
2. Creates or selects existing inquilino (by CPF)
3. Creates aluguel record
4. Auto-generates pagamento records:
   - For "temporada": if has sinal → 2 records (sinal + restante); else → 1 record (total)
   - For "mensal": 1 record per month in the contract period
5. Redirects to property page

**Step 2: Create form page**

Create ``src/app/(app)/imoveis/[id]/novo-aluguel/page.tsx`` — client component form with:
- Inquilino fields: nome_completo, cpf, rg, endereco, telefone, email (optional)
- Tipo: select mensal/temporada
- Data inicio + data fim (date pickers)
- Valor total
- Checkbox "Tem sinal?" → conditional valor_sinal field
- Submit button

Mobile-friendly: single column layout, large touch targets.

**Step 3: Commit**

```bash
git add src/app/\(app\)/imoveis/\[id\]/novo-aluguel/
git commit -m "feat: add new rental form with auto payment generation"
```

---

### Task 14: Contracts Placeholder (Future Phase)

**Files:**
- Create: `src/app/(app)/contratos/page.tsx`
- Create: `src/templates/.gitkeep`

**Step 1: Create placeholder page**

Create ``src/app/(app)/contratos/page.tsx``:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContratosPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Contratos</h2>
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A geracao de contratos estara disponivel em uma atualizacao futura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create templates directory**

Run:
```bash
mkdir -p src/templates && touch src/templates/.gitkeep
```

**Step 3: Commit**

```bash
git add src/app/\(app\)/contratos/ src/templates/
git commit -m "feat: add contracts placeholder and templates directory"
```

---

### Task 15: Final Integration and Testing

**Step 1: Update root layout with fonts and metadata**

Modify ``src/app/layout.tsx`` — set metadata title to "Gerenciador de Alugueis", configure Inter font from next/font/google.

**Step 2: Add navigation to header**

Modify ``src/components/header.tsx`` — add nav links: Dashboard, Contratos. Highlight active link.

**Step 3: Run build to verify no errors**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Manual testing checklist**

1. Login page renders, invalid creds show error
2. Successful login redirects to dashboard
3. Dashboard shows 4 property cards
4. Property page shows calendar with monthly/annual toggle
5. Holidays appear in yellow on calendar
6. "Novo Aluguel" form works, creates rental + payments
7. Payment toggle works (mark as paid/unpaid)
8. Signal toggle works
9. Calendar reflects rental periods and payments
10. All pages responsive on mobile viewport
11. Logout works

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: final integration - layout, navigation, and polish"
```

---

## Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Project scaffolding | - |
| 2 | shadcn/ui setup | 1 |
| 3 | Supabase client setup | 1 |
| 4 | Database schema + seed | - |
| 5 | TypeScript types | 1 |
| 6 | Login page | 2, 3 |
| 7 | App layout with logout | 6 |
| 8 | Dashboard page | 5, 7 |
| 9 | Brazilian holidays utility | 1 |
| 10 | Calendar component | 2, 9 |
| 11 | Property detail page | 8, 10 |
| 12 | Payment actions | 3 |
| 13 | New rental form | 11, 12 |
| 14 | Contracts placeholder | 7 |
| 15 | Final integration + testing | All |

**Pre-requisite:** User must create a Supabase project and add the URL + anon key to `.env.local` before running the app. Run the SQL migration and seed via the Supabase Dashboard SQL Editor.
