# Design: Sitio temporada - multiplos alugueis e melhorias

**Data:** 2026-04-12

## Objetivo

Corrigir bug que impede criacao de multiplos alugueis de temporada no sitio e implementar melhorias na dashboard e pagina do imovel para suportar multiplos alugueis simultaneos.

## Decisoes

- Sitio permite multiplos alugueis de temporada ativos (sem sobreposicao de datas)
- Casa/ponto_comercial mantém limite de 1 aluguel ativo
- Cancelamento de aluguel via soft delete (status -> "cancelado")
- Pagamentos parciais para temporada via novo registro de pagamento

## Alteracoes

### 1. Bug fix - novo-aluguel/actions.ts

Para imoveis do tipo `sitio`:
- Permitir criacao se tipo for `temporada`, desde que nao haja sobreposicao de datas
- Verificacao: `novo.data_inicio <= existente.data_fim AND novo.data_fim >= existente.data_inicio`
- Buscar tipo do imovel na action para decidir logica

Para casa/ponto_comercial: manter bloqueio atual (1 aluguel ativo).

### 2. Dashboard - ImovelCard

**dashboard/page.tsx:**
- Buscar TODOS os alugueis ativos (nao apenas 1 por imovel)
- Buscar pagamentos dos alugueis ativos
- Passar `alugueisAtivos[]` + `pagamentos[]` + `tipoImovel` ao ImovelCard

**imovel-card.tsx - Sitio:**
- Badge: "Livre" (0), "X alugueis" (parcial), "Ocupado" (mes todo coberto)
- Logica "Ocupado": todos os dias do mes corrente cobertos por algum aluguel
- Lista inquilinos do mes corrente:
  - Nome, dias do mes (ex: "Dias 01, 03, 04")
  - Valor pago (soma pagamentos pago=true) e valor pendente (valor_total - soma pago)

**imovel-card.tsx - Casa/ponto_comercial:**
- Badge "Ocupado"/"Livre" (como hoje)
- Nome do inquilino, valor do mes, status pago/pendente daquele mes

### 3. Pagina do imovel - multiplos alugueis (sitio)

**imoveis/[id]/page.tsx:**
- Buscar todos os alugueis ativos (sem .single())
- Buscar pagamentos de todos os alugueis ativos

**Calendario - callback onMonthChange:**
- `Calendario` expoe mes/ano atual via `onMonthChange?: (mes: number, ano: number) => void`
- Pagina usa esse estado para filtrar alugueis mostrados

**Novo componente: AlugueisMes (client component):**
- Recebe todos os alugueis ativos com pagamentos + mes/ano selecionado
- Filtra alugueis que intersectam o mes selecionado
- Cards expansiveis: clica no nome do inquilino para expandir/colapsar
- Colapsado: nome, periodo, badge pago/pendente
- Expandido: valor, sinal, lista de pagamentos, valor pendente calculado
- Input para adicionar pagamento parcial (campo valor + botao)
- Botao "Cancelar Aluguel" (vermelho, com dialog de confirmacao)

### 4. Pagina do imovel - casa/ponto_comercial

- Comportamento atual mantido (AluguelInfo + PagamentosTable)
- Adicionar botao "Cancelar Aluguel" com confirmacao

### 5. Cancelar aluguel (server action)

- Nova action: `cancelarAluguel(aluguelId, imovelId)`
- Muda status de "ativo" para "cancelado"
- Revalida pagina, aluguel vai pro historico, datas liberadas

### 6. Adicionar pagamento parcial (server action)

- Nova action: `adicionarPagamento(aluguelId, valor, imovelId)`
- Cria novo registro em `pagamentos` com pago=true e data_pagamento=hoje
- Valor pendente recalculado: valor_total - soma de todos pagamentos pago=true

## Fora do escopo

- Mudancas na visao anual do calendario
- Edicao de alugueis existentes (apenas cancelar)
