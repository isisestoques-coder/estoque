import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Calendar, Tag, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SaleModal from '../components/SaleModal';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Sale Modal state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, salesRes] = await Promise.all([
        supabase.from('products').select('*').order('code', { ascending: true }),
        supabase.from('sales').select('*, customers(name)').order('sold_at', { ascending: false }).limit(50)
      ]);
      
      setProducts(productsRes.data || []);
      setSales(salesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const PaymentIcon = ({ method }) => {
    if (method === 'dinheiro') return <Banknote size={14} color="var(--status-good)" />;
    if (method === 'crediario') return <Calendar size={14} color="var(--primary-accent)" />;
    if (method === 'cartao') return <CreditCard size={14} color="var(--text-secondary)" />;
    return <Tag size={14} color="var(--primary-accent)" />; // pix / outro
  };

  return (
    <div className="page-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Vendas e Histórico</h1>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-accent)', padding: '8px', borderRadius: '50%' }}>
          <ShoppingCart size={24} />
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
         <button onClick={() => setIsSaleModalOpen(true)} className="btn btn-primary" style={{ padding: '16px', fontSize: '1.1rem' }}>
           <ShoppingCart size={24} style={{ marginRight: '8px' }} />
           Lançar Nova Venda Completa
         </button>
      </div>

      {/* Sales History */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Histórico Recente</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Carregando histórico...</div>
        ) : sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Nenhuma venda registrada ainda.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {sales.map(sale => (
              <div key={sale.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PaymentIcon method={sale.payment_method} /> 
                    {sale.product_code} {sale.product_description ? `- ${sale.product_description}` : ''}
                  </div>
                  <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>
                    R$ {Number(sale.total_price).toFixed(2)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <div>
                    Tam: {sale.product_size} | {sale.quantity}x R$ {Number(sale.unit_price).toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {sale.sold_at ? format(new Date(sale.sold_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                  </div>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {sale.customers?.name ? `Cliente: ${sale.customers.name}` : 'Consumidor Final'} {sale.payment_method ? `| Pagt: ${sale.payment_method.toUpperCase()}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Global Sale Modal */}
      <SaleModal 
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        categoryCode={null} // null permits filtering all products
        products={products}
        onSuccess={fetchData}
      />
    </div>
  );
}
