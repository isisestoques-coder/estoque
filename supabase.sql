-- Estoque ISIS - Supabase SQL Schema
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Criação da tabela de Categorias/Configurações (category_settings)
CREATE TABLE IF NOT EXISTS public.category_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    min_quantity_warning INTEGER DEFAULT 5,
    min_quantity_critical INTEGER DEFAULT 0,
    color_warning TEXT DEFAULT '#F59E0B',
    color_critical TEXT DEFAULT '#EF4444'
);

-- 2. Criação da tabela de Produtos (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL,
    description TEXT,
    size TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criação da tabela de Vendas (sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_code TEXT,
    product_description TEXT,
    product_size TEXT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    sold_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Desabilitar Row Level Security (RLS) temporariamente ou adicionar políticas permissivas para ANON
ALTER TABLE public.category_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- Opcionalmente, se quiser manter RLS ativado mas com acesso total para anon (para testes):
-- ALTER TABLE public.category_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON public.category_settings FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON public.products FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON public.sales FOR ALL USING (true) WITH CHECK (true);
