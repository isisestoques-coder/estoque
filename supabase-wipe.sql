-- Estoque ISIS - Script para Limpeza do Dashboard (Mantendo Dívidas)
-- Rodar este script no SQL Editor do Supabase para habilitar o botão "Apagar" do Dashboard

CREATE OR REPLACE FUNCTION public.clear_dashboard_data()
RETURNS void AS $$
BEGIN
    -- 1. Remove registros de pagamentos (Zera o "Valor Recebido Real" no Dashboard)
    DELETE FROM public.payment_logs;
    
    -- 2. Remove registros de vendas (Zera a "Receita Total" e "Itens Vendidos" no Dashboard)
    DELETE FROM public.sales;
    
    -- NOTA: Os parcelas (installments) e o saldo devedor (customers.debt_balance) 
    -- são MANTIDOS para não perder o que os clientes ainda devem conforme pedido.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que o acesso anonimo possa chamar a função se necessário (ou ajuste conforme sua política de segurança)
GRANT EXECUTE ON FUNCTION public.clear_dashboard_data() TO anon;
GRANT EXECUTE ON FUNCTION public.clear_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_dashboard_data() TO service_role;
