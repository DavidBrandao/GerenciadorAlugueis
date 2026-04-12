# Design: Calendario interativo na pagina de novo-aluguel

**Data:** 2026-04-12

## Objetivo

Substituir os inputs de data (`<input type="date">`) na pagina de novo-aluguel pelo mesmo componente de calendario usado na pagina do imovel (`CalendarioMensal`), com marcacoes visuais dos dias ja alugados e selecao interativa de range.

## Decisoes

- **Abordagem:** Adaptar o `CalendarioMensal` existente com props opcionais para modo interativo
- **Selecao:** Um unico calendario com selecao de range (clica inicio, clica fim)
- **Bloqueio:** Dias com aluguel ativo sao bloqueados. Datas no passado NAO sao bloqueadas
- **Escopo:** Apenas visao mensal, sem legenda, sem visao anual

## Alteracoes

### 1. `CalendarioMensal` - Props opcionais novos

```ts
selectedRange?: { start: Date | null; end: Date | null }
onDayClick?: (date: Date) => void
disabledDates?: (date: Date) => boolean
```

- Quando ausentes: comportamento read-only atual (sem mudanca)
- Quando presentes: dias ficam clicaveis, com visual de selecao de range e bloqueio

### 2. `novo-aluguel/page.tsx`

- Busca alugueis existentes do imovel via Supabase client em `useEffect`
- Substitui `<input type="date">` pelo `CalendarioMensal` interativo
- Mantém `<input type="hidden">` para data_inicio e data_fim (form submission)
- Mostra texto com range selecionado abaixo do calendario

### Visual

| Estado | Cor |
|--------|-----|
| Contrato existente (pendente) | `bg-blue-100` |
| Contrato existente (pago) | `bg-green-100` |
| Feriado | bolinha amarela |
| Range selecionado | `bg-primary/20` |
| Inicio/fim do range | `bg-primary text-primary-foreground` |
| Dia bloqueado | opacidade reduzida + cursor not-allowed |

### Fluxo do usuario

1. Abre novo-aluguel - calendario carrega com dias ocupados pintados
2. Clica num dia livre - marca como data_inicio
3. Clica num segundo dia livre - valida que nao ha conflito entre as datas - marca como data_fim, pinta o range
4. Se houver conflito no meio - rejeita com feedback visual
5. Clica de novo - reseta selecao

## Fora do escopo

- Visao anual no novo-aluguel
- Legenda
- Bloqueio de datas passadas
