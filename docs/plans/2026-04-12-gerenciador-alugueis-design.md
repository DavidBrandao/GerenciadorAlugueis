# Gerenciador de Alugueis - Design

## Visao Geral

Aplicacao web para gestao de alugueis de 4 imoveis fixos (1 sitio, 2 casas, 1 ponto comercial). Uso pessoal para ate 4 usuarios. Foco em controle de pagamentos, agendamentos e visualizacao via calendario.

## Stack

| Camada | Tecnologia | Plano |
|---|---|---|
| Framework | Next.js 14+ (App Router) | - |
| UI | Tailwind CSS + shadcn/ui | - |
| Calendario | react-day-picker (via shadcn) | - |
| Auth | Supabase Auth | Free (50k MAU) |
| Banco | Supabase PostgreSQL | Free (500MB) |
| Hospedagem | Vercel | Free |
| PDF (futuro) | @react-pdf/renderer | - |

## Arquitetura

```
Usuario (Browser - PC/Mobile)
    |
Next.js (Vercel) - paginas + API routes
    |
Supabase (Auth + PostgreSQL)
```

- Next.js App Router com Server Components
- Supabase Client para auth e queries com Row Level Security
- Tailwind CSS mobile-first para responsividade
- shadcn/ui para componentes prontos

### Estrutura de Pastas

```
src/
  app/
    (auth)/         -> login
    dashboard/      -> menu principal
    imoveis/[id]/   -> detalhe do imovel + calendario
    contratos/      -> gestao de contratos (fase futura)
  components/       -> componentes reutilizaveis
  lib/              -> supabase client, utils, helpers
  templates/        -> templates de contrato (fase futura)
```

## Modelo de Dados

### profiles
- id (FK -> auth.users)
- nome
- created_at

### imoveis (seed fixo, sem CRUD)
- id
- nome ("Sitio", "Casa 1", "Casa 2", "Ponto Comercial")
- tipo (enum: "sitio" | "casa" | "ponto_comercial")
- descricao (opcional)

### inquilinos
- id
- nome_completo
- cpf
- rg
- endereco
- telefone
- email (opcional)
- created_at

### alugueis
- id
- imovel_id (FK -> imoveis)
- inquilino_id (FK -> inquilinos)
- tipo (enum: "mensal" | "temporada")
- data_inicio
- data_fim
- valor_total
- valor_sinal (nullable)
- sinal_pago (boolean)
- status (enum: "ativo" | "finalizado" | "cancelado")
- observacoes (opcional)
- created_at

### pagamentos
- id
- aluguel_id (FK -> alugueis)
- mes_referencia (date)
- valor
- pago (boolean)
- data_pagamento (nullable)
- created_at

### Logica de Pagamentos
- **Temporada (sitio):** 1 aluguel = 1 periodo. Pagamentos: sinal (se houver) + restante.
- **Mensal (casas/ponto):** 1 aluguel = 1 contrato com duracao. 1 registro de pagamento por mes.

## Telas e Fluxos

### Login
- Email + senha, sem cadastro publico
- Usuarios criados direto no Supabase

### Dashboard (Menu Principal)
- 4 cards (1 por imovel): nome, tipo, status (ocupado/livre), inquilino atual
- Grid 2x2 desktop, 1 coluna mobile
- Clique no card -> pagina do imovel

### Pagina do Imovel
- Calendario com 3 camadas visuais e toggle mensal/anual
- Info do aluguel ativo: inquilino, periodo, valores, status pagamento
- Lista de pagamentos: tabela com mes, valor, status, botao marcar como pago
- Historico de alugueis anteriores (colapsado)
- Botao "Novo Aluguel"

### Formulario Novo Aluguel
- Selecionar ou cadastrar inquilino (nome, CPF, RG, endereco, telefone, email opcional)
- Tipo: mensal ou temporada
- Periodo (data inicio e fim)
- Valor total
- Tem sinal? Se sim: valor do sinal
- Ao salvar: gera automaticamente registros de pagamento

### Contratos (fase futura)
- Estrutura de pastas pronta, tela placeholder
- Template editavel dentro do app
- Geracao de PDF final
- Dois tipos: mensal e temporada

## Calendario - Detalhes Visuais

### Legenda de Cores
- Azul: periodo do contrato (dias/meses alugados)
- Verde: pago
- Amarelo: feriado/data comemorativa
- Sobreposicao: feriado mostra indicador sobre cor do contrato

### Visao Mensal
- Grade de dias do mes
- Dias pintados conforme legenda
- Hover/tap -> tooltip com detalhes

### Visao Anual
- 12 blocos (1 por mes)
- Mensal: mes inteiro pintado se dentro do contrato
- Temporada: dias especificos pintados
- Clique no mes -> abre visao mensal

### Feriados Nacionais Incluidos
Ano Novo, Carnaval, Sexta-feira Santa, Tiradentes, Dia do Trabalho, Corpus Christi, Independencia, Nossa Sra. Aparecida, Finados, Proclamacao da Republica, Natal, Reveillon

## Seguranca

- Row Level Security (RLS) no Supabase
- Policy simples: `auth.uid() IS NOT NULL` (todos usuarios autenticados veem tudo)
- Sem cadastro publico de usuarios

## Decisoes

- Imoveis fixos no sistema (sem CRUD)
- Sem notificacoes (consulta manual)
- Login simples email/senha
- UI responsiva mobile-first
- Contratos para fase futura
