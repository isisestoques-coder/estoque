import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Sale Form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, salesRes] = await Promise.all([
        supabase.from('products').select('*').order('code', { ascending: true }),
        supabase.from('sales').select('*').order('sold_at', { ascending: false }).limit(50)
      ]);
      
      setProducts(productsRes.data || []);
      setSales(salesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSell = async (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return alert('Selecione um produto!');
    
    const qty = parseInt(quantity);
    if (qty <= 0) return alert('Quantidade inválida!');
    if (qty > product.quantity) return alert(`Atenção: Apenas ${product.quantity} em estoque!`);

    setSelling(true);
    try {
      const totalPrice = qty * product.price;

      // 1. Insert into sales
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          product_id: product.id,
          product_code: product.code,
          product_description: product.description,
          product_size: product.size,
          quantity: qty,
          unit_price: product.price,
          total_price: totalPrice
        }])
        .select();

      if (saleError) throw saleError;

      // 2. Reduce stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: product.quantity - qty })
        .eq('id', product.id);

      if (updateError) throw updateError;

      alert('Venda registrada com sucesso!');
      
      // Update local state
      setProducts(products.map(p => p.id === product.id ? { ...p, quantity: p.quantity - qty } : p));
      setSales([newSale[0], ...sales]);
      
      // Reset form
      setSelectedProduct('');
      setQuantity(1);
    } catch (error) {
      alert('Erro ao registrar venda: ' + error.message);
    } finally {
      setSelling(false);
    }
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="page-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Vendas e Histórico</h1>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-accent)', padding: '8px', borderRadius: '50%' }}>
          <ShoppingCart size={24} />
        </div>
      </div>

      {/* Sale Form */}
      <div className="glass-card" style={{ marginBottom: '24px', borderTop: '4px solid var(--primary-accent)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Nova Venda Livre</h2>
        <form onSubmit={handleSell}>
          <div className="input-group">
            <label className="input-label">Selecione o Produto (Cod/Categoria - Nome - Tamanho)</label>
            <select 
              className="input-field"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                  {p.code} {p.description ? `- ${p.description}` : ''} ({p.size}) - {p.quantity > 0 ? `${p.quantity} em estoque` : 'ESGOTADO'}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Quantidade</label>
            <input 
              type="number" 
              className="input-field"
              min="1"
              max={selectedProductData?.quantity || 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {selectedProductData && (
            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Valor Unitário:</span>
                <span>R$ {selectedProductData.price.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '8px' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--primary-accent)' }}>
                  R$ {(selectedProductData.price * (quantity || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={selling || !selectedProduct}>
            {selling ? 'Processando...' : 'Confirmar Venda'}
          </button>
        </form>
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
                    <Tag size={14} color="var(--primary-accent)" /> 
                    {sale.product_code} {sale.product_description ? `- ${sale.product_description}` : ''}
                  </div>
                  <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>
                    R$ {Number(sale.total_price).toFixed(2)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div>
                    Tam: {sale.product_size} | {sale.quantity}x R$ {Number(sale.unit_price).toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {sale.sold_at ? format(new Date(sale.sold_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
