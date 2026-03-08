import React, { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SaleModal({ isOpen, onClose, categoryCode, products, onSuccess }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Filter products by category code and only with stock
  // or at least let them see if it's out of stock
  const categoryProducts = products.filter(p => p.code === categoryCode);
  const selectedProductData = categoryProducts.find(p => p.id === selectedProduct);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductData) return alert('Selecione um tamanho!');
    if (quantity > selectedProductData.quantity) {
      return alert('Quantidade maior que o estoque disponível!');
    }
    if (quantity <= 0) return alert('Quantidade inválida!');

    setLoading(true);
    try {
      const q = parseInt(quantity);
      const total_price = q * selectedProductData.price;

      // 1. Insert into sales table
      const { error: saleError } = await supabase.from('sales').insert([{
        product_id: selectedProductData.id,
        product_code: selectedProductData.code,
        product_description: selectedProductData.description,
        product_size: selectedProductData.size,
        quantity: q,
        unit_price: selectedProductData.price,
        total_price: total_price
      }]);
      if (saleError) throw saleError;

      // 2. Reduce stock in products table
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: selectedProductData.quantity - q })
        .eq('id', selectedProductData.id);
      
      if (updateError) throw updateError;

      alert('Venda registrada com sucesso!');
      onSuccess();
      onClose();
      // Reset form
      setSelectedProduct('');
      setQuantity(1);
    } catch (error) {
      alert('Erro ao registrar venda: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-secondary)' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} /> Venda Rápida
        </h2>
        
        <div style={{ marginBottom: '16px', color: 'var(--primary-accent)', fontWeight: 'bold' }}>
          Categoria: {categoryCode}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Tamanho do Produto</label>
            <select 
              className="input-field"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
            >
              <option value="">Selecione um tamanho</option>
              {categoryProducts.map(p => (
                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                  Tam: {p.size} - R$ {p.price} ({p.quantity} em estoque)
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
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Valor Unitário:</span>
                <span>R$ {selectedProductData.price.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>Total a Pagar:</span>
                <span style={{ color: 'var(--primary-accent)' }}>
                  R$ {(selectedProductData.price * (quantity || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !selectedProduct}
          >
            {loading ? 'Registrando...' : 'Confirmar Venda'}
          </button>
        </form>
      </div>
    </div>
  );
}
