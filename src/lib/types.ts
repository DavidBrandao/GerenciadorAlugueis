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
