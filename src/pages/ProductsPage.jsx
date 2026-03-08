import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Edit2, Trash2, Save, X, FileText, Download } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    size: '',
    price: '',
    quantity: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
      // Fallback for UI testing before DB is set up
      if (products.length === 0) setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (product) => {
    setFormData({
      code: product.code,
      description: product.description || '',
      size: product.size,
      price: product.price,
      quantity: product.quantity
    });
    setCurrentProduct(product);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      alert('Erro ao excluir produto: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productPayload = {
        code: formData.code,
        description: formData.description,
        size: formData.size,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity)
      };

      if (isEditing && currentProduct) {
        // Update
        const { data, error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', currentProduct.id)
          .select();
          
        if (error) throw error;
        setProducts(products.map(p => p.id === currentProduct.id ? data[0] : p));
        alert('Produto atualizado com sucesso!');
      } else {
        // Insert
        const { data, error } = await supabase
          .from('products')
          .insert([productPayload])
          .select();
          
        if (error) throw error;
        setProducts([data[0], ...products]);
        alert('Produto cadastrado com sucesso!');
      }
      
      resetForm();
    } catch (error) {
      alert('Erro ao salvar produto: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({ code: '', description: '', size: '', price: '', quantity: '' });
    setIsEditing(false);
    setCurrentProduct(null);
  };

  const generateInventoryPDF = () => {
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleString('pt-BR');
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text("Resumo de Inventário - Espaço Dell'as", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Gerado em: ${now}`, 105, 27, { align: 'center' });

      // Calculate totals
      const totalItems = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
      const totalValue = products.reduce((acc, p) => acc + (p.price * (p.quantity || 0)), 0);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total de Itens em Estoque: ${totalItems}`, 14, 40);
      doc.text(`Valor Total do Inventário: R$ ${totalValue.toFixed(2)}`, 14, 47);

      // Group by Category (from code)
      // We assume the code format like "CATEGORIA-COD" or just use the code as is
      const sortedProducts = [...products].sort((a, b) => {
        if (a.code < b.code) return -1;
        if (a.code > b.code) return 1;
        return 0;
      });

      const tableRows = sortedProducts.map(p => [
        p.code,
        p.description || '-',
        p.size,
        p.quantity,
        `R$ ${Number(p.price).toFixed(2)}`,
        `R$ ${(p.price * p.quantity).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Cod/Cat', 'Descrição', 'Tam', 'Qtd', 'Preço Un.', 'Subtotal']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] }, // Violet color to match theme
        styles: { fontSize: 9 },
        didDrawPage: (data) => {
          // Footer with page number
          const str = 'Página ' + doc.internal.getNumberOfPages();
          doc.setFontSize(10);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
      });

      doc.save(`Inventario_Espaco_Dellas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF de inventário: ' + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.code.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
    p.size.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Cadastro de Produtos</h1>
        <button 
          onClick={generateInventoryPDF}
          className="btn btn-secondary" 
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--accent-purple)' }}
        >
          <FileText size={18} color="var(--accent-purple)" />
          <span className="hide-mobile" style={{ fontSize: '0.9rem' }}>Exportar Inventário (PDF)</span>
          <Download size={16} className="show-mobile" color="var(--accent-purple)" />
        </button>
      </div>

      {/* Form Section */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEditing ? <><Edit2 size={20} /> Editar Produto</> : <><Plus size={20} /> Novo Produto</>}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Cod/Categoria *</label>
            <input 
              type="text" 
              name="code"
              required 
              className="input-field" 
              placeholder="Ex: CAMISA-POLO"
              value={formData.code}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Nome do Produto</label>
            <input 
              type="text" 
              name="description"
              className="input-field" 
              placeholder="Nome do produto"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Tamanho *</label>
              <select 
                name="size"
                required 
                className="input-field"
                value={formData.size}
                onChange={handleInputChange}
              >
                <option value="">Selecione</option>
                <option value="PP">PP</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
                <option value="XG">XG</option>
                <option value="U">Único</option>
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label className="input-label">Preço (R$) *</label>
              <input 
                type="number" 
                name="price"
                step="0.01" 
                required 
                className="input-field" 
                placeholder="0.00"
                value={formData.price}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label">Quantidade Inicial *</label>
            <input 
              type="number" 
              name="quantity"
              required 
              className="input-field" 
              placeholder="0"
              value={formData.quantity}
              onChange={handleInputChange}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              <Save size={20} /> Salvar Produto
            </button>
            {isEditing && (
              <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ flex: 1 }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Lista de Produtos</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{products.length} itens</span>
        </div>
        
        <div className="input-group" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar por código, tamanho..." 
            style={{ paddingLeft: '44px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Carregando...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Nenhum produto encontrado.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredProducts.map(product => (
              <div key={product.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--primary-accent)' }}>{product.code} {product.description ? `- ${product.description}` : ''}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tam: {product.size} | Qtd: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{product.quantity}</span> | R$ {product.price}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleEdit(product)}
                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-accent)', padding: '8px', borderRadius: '8px' }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-critical)', padding: '8px', borderRadius: '8px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
