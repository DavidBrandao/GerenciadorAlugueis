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
  cpf TEXT NOT NULL UNIQUE,
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
