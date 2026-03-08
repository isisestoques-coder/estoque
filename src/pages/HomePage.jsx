import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import SaleModal from '../components/SaleModal';
import { Activity, Settings } from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState({ code: '', min_warning: 5, min_critical: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('category_settings').select('*')
      ]);
      
      setProducts(productsRes.data || []);
      
      const settingsMap = {};
      (settingsRes.data || []).forEach(s => {
        settingsMap[s.code] = s;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Agrupar produtos por código da categoria
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.code]) {
      acc[product.code] = {
        code: product.code,
        totalQuantity: 0,
        items: []
      };
    }
    acc[product.code].totalQuantity += product.quantity;
    acc[product.code].items.push(product);
    return acc;
  }, {});

  const categories = Object.values(groupedProducts);

  const handleOpenSale = (code) => {
    setSelectedCategory(code);
    setSaleModalOpen(true);
  };

  const handleOpenSettings = (code) => {
    const s = settings[code] || { min_quantity_warning: 5, min_quantity_critical: 0 };
    setEditingSettings({
      code,
      min_warning: s.min_quantity_warning,
      min_critical: s.min_quantity_critical,
    });
    setSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: editingSettings.code,
        min_quantity_warning: parseInt(editingSettings.min_warning),
        min_quantity_critical: parseInt(editingSettings.min_critical)
      };

      const { data, error } = await supabase
        .from('category_settings')
        .upsert(payload, { onConflict: 'code' })
        .select();

      if (error) throw error;
      
      setSettings(prev => ({ ...prev, [editingSettings.code]: data[0] }));
      setSettingsModalOpen(false);
    } catch (error) {
      alert('Erro ao salvar configurações: ' + error.message);
    }
  };

  return (
    <div className="page-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Visão Geral</h1>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-accent)', padding: '8px', borderRadius: '50%' }}>
          <Activity size={24} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando dados...</div>
      ) : categories.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Nenhum produto cadastrado.</p>
          <a href="/produtos" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex', width: 'auto' }}>
            Ir para Cadastro de Produtos
          </a>
        </div>
      ) : (
        <div>
          {categories.map(category => (
            <ProductCard 
              key={category.code}
              code={category.code}
              totalQuantity={category.totalQuantity}
              settings={settings[category.code]}
              onEditSettings={handleOpenSettings}
              onClickVenda={handleOpenSale}
            />
          ))}
        </div>
      )}

      {/* Sale Modal */}
      <SaleModal 
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        categoryCode={selectedCategory}
        products={products}
        onSuccess={fetchData}
      />

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} /> Alertas de Estoque: {editingSettings.code}
            </h2>
            <form onSubmit={handleSaveSettings}>
              <div className="input-group">
                <label className="input-label" style={{ color: 'var(--status-warning)' }}>Alerta Amarelo (Estoque Baixo) - Qtd Mínima</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editingSettings.min_warning}
                  onChange={(e) => setEditingSettings({...editingSettings, min_warning: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label" style={{ color: 'var(--status-critical)' }}>Alerta Vermelho (Crítico) - Qtd Mínima</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editingSettings.min_critical}
                  onChange={(e) => setEditingSettings({...editingSettings, min_critical: e.target.value})}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSettingsModalOpen(false)} style={{ flex: 1 }}>Sair</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
