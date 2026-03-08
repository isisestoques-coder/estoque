-- ==========================================
-- SCRIPT SUPABASE - SEGURANÇA E AUTENTICAÇÃO
-- ==========================================
-- Este script ativa o Row Level Security (RLS) nas tabelas existentes.
-- Isso significa que ninguém conseguirá ler ou alterar dados a menos
-- que esteja logado com sucesso no sistema.

-- 1. Ativar RLS em todas as tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas "anon_*" antigas (que deixavam aberto)
-- (O IF EXISTS garante que não dê erro se as políticas já não existirem mais)
DROP POLICY IF EXISTS "anon_select_products" ON products;
DROP POLICY IF EXISTS "anon_insert_products" ON products;
DROP POLICY IF EXISTS "anon_update_products" ON products;
DROP POLICY IF EXISTS "anon_delete_products" ON products;

DROP POLICY IF EXISTS "anon_select_settings" ON category_settings;
DROP POLICY IF EXISTS "anon_insert_settings" ON category_settings;
DROP POLICY IF EXISTS "anon_update_settings" ON category_settings;

DROP POLICY IF EXISTS "anon_select_sales" ON sales;
DROP POLICY IF EXISTS "anon_insert_sales" ON sales;

-- 3. Criar políticas seguras exigindo autenticação (auth.uid() IS NOT NULL)

-- Tabela: products
CREATE POLICY "authenticated_select_products" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert_products" ON products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update_products" ON products FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_delete_products" ON products FOR DELETE USING (auth.uid() IS NOT NULL);

-- Tabela: category_settings
CREATE POLICY "authenticated_select_settings" ON category_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert_settings" ON category_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update_settings" ON category_settings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Tabela: sales
CREATE POLICY "authenticated_select_sales" ON sales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert_sales" ON sales FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
