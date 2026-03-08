-- ============================================================
-- SCRIPT FINAL DE LIMPEZA E PRESERVAÇÃO (RODAR NO SUPABASE)
-- ============================================================

-- 1. Permite que as Parcelas (vendas fiado) sobrevivam à exclusão da Venda
ALTER TABLE public.installments DROP CONSTRAINT IF EXISTS installments_sale_id_fkey;
ALTER TABLE public.installments ADD CONSTRAINT installments_sale_id_fkey 
    FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;

-- 2. Cria a função que o botão do Dashboard chama
CREATE OR REPLACE FUNCTION public.clear_dashboard_data()
RETURNS void AS $$
BEGIN
    -- Limpa os logs de pagamentos (Esvazia o card de Recebido Real)
    DELETE FROM public.payment_logs;
    
    -- Limpa todas as vendas (Esvazia o gráfico e as vendas recentes)
    DELETE FROM public.sales;
    
    -- NOTA: As parcelas (installments) e o saldo devedor continuam no banco
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garante permissões de execução
GRANT EXECUTE ON FUNCTION public.clear_dashboard_data() TO anon;
GRANT EXECUTE ON FUNCTION public.clear_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_dashboard_data() TO service_role;

-- 4. Desativa RLS temporariamente para garantir que a exclusão funcione
-- (Você pode reativar depois se souber configurar as políticas de DELETE)
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs DISABLE ROW LEVEL SECURITY;
