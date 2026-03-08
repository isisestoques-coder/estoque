-- ==========================================
-- SCRIPT SUPABASE - CLIENTES E CREDIÁRIO
-- ==========================================

-- 1. Criação da Tabela customers (Clientes)
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    phone text,
    address text,
    debt_balance numeric(10,2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ativar RLS e Políticas para customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_customers" ON public.customers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert_customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update_customers" ON public.customers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_delete_customers" ON public.customers FOR DELETE USING (auth.uid() IS NOT NULL);

-- 2. Atualização da Tabela sales (Vendas)
-- Adicionando colunas novas para suportar clientes e métodos de pagamento
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method text; -- 'dinheiro', 'cartao', 'pix', 'crediario'
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS down_payment numeric(10,2) DEFAULT 0.00;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS installments_count integer DEFAULT 1;

-- 3. Criação da Tabela installments (Parcelas)
CREATE TABLE IF NOT EXISTS public.installments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    installment_number integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'pending', -- 'pending', 'partial', 'paid'
    paid_amount numeric(10,2) DEFAULT 0.00,
    payment_date timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Ativar RLS e Políticas para installments
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_installments" ON public.installments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert_installments" ON public.installments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update_installments" ON public.installments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_delete_installments" ON public.installments FOR DELETE USING (auth.uid() IS NOT NULL);

-- 4. Criação da Tabela payment_logs (Histórico de Pagamentos das Parcelas)
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    installment_id uuid REFERENCES public.installments(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    amount_paid numeric(10,2) NOT NULL,
    paid_at timestamptz DEFAULT now()
);

-- Ativar RLS e Políticas para payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_paymentlogs" ON public.payment_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert_paymentlogs" ON public.payment_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update_paymentlogs" ON public.payment_logs FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_delete_paymentlogs" ON public.payment_logs FOR DELETE USING (auth.uid() IS NOT NULL);
