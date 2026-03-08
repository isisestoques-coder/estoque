import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, ArrowRight, ArrowLeft, CheckCircle, UserPlus, CreditCard, Banknote, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { addDays, format } from 'date-fns';

export default function SaleModal({ isOpen, onClose, categoryCode, products, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Product Selection
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Step 2: Customer Selection
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState(''); // 'dinheiro', 'cartao', 'pix', 'crediario'
  const [downPayment, setDownPayment] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      // Reset states
      setStep(1);
      setSelectedProduct('');
      setQuantity(1);
      setSelectedCustomerId('');
      setPaymentMethod('');
      setDownPayment('');
      setInstallmentsCount(1);
      setIsCreatingCustomer(false);
    }
  }, [isOpen]);

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('name', { ascending: true });
    setCustomers(data || []);
  }

  if (!isOpen) return null;

  const categoryProducts = categoryCode ? products.filter(p => p.code === categoryCode) : products;
  const selectedProductData = categoryProducts.find(p => p.id === selectedProduct);
  const total_price = selectedProductData ? (quantity * selectedProductData.price) : 0;
  
  const downPaymentVal = parseFloat(downPayment) || 0;
  const financedAmount = Math.max(0, total_price - downPaymentVal);
  const installmentValue = financedAmount / (installmentsCount || 1);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) return alert('Nome é obrigatório');
    
    setLoading(true);
    try {
      const { data, error } = await supabase.from('customers').insert([newCustomer]).select();
      if (error) throw error;
      setCustomers([...customers, data[0]]);
      setSelectedCustomerId(data[0].id);
      setIsCreatingCustomer(false);
      setNewCustomer({ name: '', phone: '' });
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handeNextStep = () => {
    if (step === 1) {
      if (!selectedProductData) return alert('Selecione um produto!');
      if (quantity <= 0 || quantity > selectedProductData.quantity) return alert('Quantidade inválida!');
      setStep(2);
    }
    else if (step === 2) {
      setStep(3);
    }
    else if (step === 3) {
      if (!paymentMethod) return alert('Selecione a forma de pagamento!');
      if (paymentMethod === 'crediario' && !selectedCustomerId) return alert('Crediário exige um cliente selecionado no passo anterior!');
      if (downPaymentVal >= total_price && paymentMethod === 'crediario') return alert('Entrada maior ou igual ao valor total. Não há saldo a financiar no crediário.');
      setStep(4);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      // 1. Inserir Venda
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        product_id: selectedProductData.id,
        product_code: selectedProductData.code,
        product_description: selectedProductData.description,
        product_size: selectedProductData.size,
        quantity: parseInt(quantity),
        unit_price: selectedProductData.price,
        total_price: total_price,
        customer_id: selectedCustomerId || null,
        payment_method: paymentMethod,
        down_payment: downPaymentVal,
        installments_count: paymentMethod === 'crediario' ? installmentsCount : 1
      }]).select();

      if (saleError) throw saleError;
      const newSaleId = saleData[0].id;

      // 2. Reduzir Estoque
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: selectedProductData.quantity - parseInt(quantity) })
        .eq('id', selectedProductData.id);
      
      if (updateError) throw updateError;

      // 3. Processar Crediário se for o caso
      if (paymentMethod === 'crediario' && selectedCustomerId) {
        let installmentsPayload = [];
        let today = new Date();

        for (let i = 1; i <= installmentsCount; i++) {
           installmentsPayload.push({
             sale_id: newSaleId,
             customer_id: selectedCustomerId,
             installment_number: i,
             amount: installmentValue,
             due_date: format(addDays(today, 30 * i), "yyyy-MM-dd"),
             status: 'pending'
           });
        }
        
        const { error: instError } = await supabase.from('installments').insert(installmentsPayload);
        if (instError) throw instError;

        // Atualizar saldo devedor do cliente
        const customerToUpdate = customers.find(c => c.id === selectedCustomerId);
        if (customerToUpdate) {
           const newDebt = Number(customerToUpdate.debt_balance || 0) + financedAmount;
           const { error: debtErr } = await supabase.from('customers').update({ debt_balance: newDebt, updated_at: new Date() }).eq('id', selectedCustomerId);
           if (debtErr) throw debtErr;
        }
      }

      alert('Venda finalizada com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      alert('Erro ao registrar venda: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
    }}>
      <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '450px', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-secondary)' }}>
          <X size={24} />
        </button>
        
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} color="var(--primary-accent)" /> 
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Venda Guiada</h2>
        </div>

        {/* --- STEP 1: PRODUTO --- */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>1. Produto</h3>
            
            {categoryCode && (
              <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Cod/Categoria: <span style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>{categoryCode}</span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Selecione o Produto *</label>
              <select className="input-field" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required>
                <option value="">Selecione...</option>
                {categoryProducts.map(p => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {categoryCode ? '' : `${p.code} - `} Tam: {p.size} - R$ {p.price} ({p.quantity} unid.)
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Quantidade *</label>
              <input type="number" className="input-field" min="1" max={selectedProductData?.quantity || 1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || '')} required />
            </div>

            {selectedProductData && (
              <div style={{ margin: '20px 0', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                Total: <span style={{ color: 'var(--primary-accent)' }}>R$ {total_price.toFixed(2)}</span>
              </div>
            )}

            <button onClick={handeNextStep} className="btn btn-primary" disabled={!selectedProduct || quantity <= 0}>
               Avançar <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* --- STEP 2: CLIENTE --- */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>2. Cliente <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>(Opcional para à vista/pix)</span></h3>
            
             {isCreatingCustomer ? (
               <form onSubmit={handleCreateCustomer} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                 <div className="input-group" style={{ marginBottom: '12px' }}>
                   <label className="input-label">Nome Completo *</label>
                   <input type="text" className="input-field" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} required autoFocus />
                 </div>
                 <div className="input-group" style={{ marginBottom: '16px' }}>
                   <label className="input-label">Telefone</label>
                   <input type="tel" className="input-field" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
                 </div>
                 <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px' }} disabled={loading}>{loading ? '...' : 'Salvar Cliente'}</button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setIsCreatingCustomer(false)}>Cancelar</button>
                 </div>
               </form>
             ) : (
               <div style={{ marginBottom: '24px' }}>
                 <div className="input-group">
                    <label className="input-label">Vincular a um cliente existente:</label>
                    <select className="input-field" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                      <option value="">-- Cliente Avulso (Sem registro) --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                 </div>
                 <button onClick={() => setIsCreatingCustomer(true)} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }}>
                    <UserPlus size={16} /> Cadastrar Novo Cliente Agora
                 </button>
               </div>
             )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}><ArrowLeft size={18} /> Voltar</button>
              <button onClick={handeNextStep} className="btn btn-primary" style={{ flex: 1 }}>Avançar <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* --- STEP 3: PAGAMENTO --- */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>3. Pagamento</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {['dinheiro', 'pix', 'cartao', 'crediario'].map(method => (
                <button 
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: paymentMethod === method ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                    background: paymentMethod === method ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                    color: 'var(--text-primary)',
                    fontWeight: paymentMethod === method ? 'bold' : 'normal',
                    textTransform: 'capitalize'
                  }}
                >
                  {method === 'dinheiro' && <Banknote size={24} style={{ marginBottom: '8px', opacity: 0.8 }} />}
                  {method === 'pix' && <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo%E2%80%94pix_obrigatorio_cor_positiva.svg" width="24" style={{ marginBottom: '8px', filter: 'brightness(0) invert(1)' }} alt="Pix" />}
                  {method === 'cartao' && <CreditCard size={24} style={{ marginBottom: '8px', opacity: 0.8 }} />}
                  {method === 'crediario' && <Calendar size={24} style={{ marginBottom: '8px', opacity: 0.8 }} />}
                  <br />
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === 'crediario' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                {!selectedCustomerId && (
                  <div style={{ color: 'var(--status-critical)', fontSize: '0.9rem', marginBottom: '12px' }}>⚠️ Você precisa VOLTAR e selecionar um cliente para vender no crediário.</div>
                )}
                
                <div className="input-group">
                  <label className="input-label">Valor de Entrada (R$)</label>
                  <input type="number" className="input-field" placeholder="0.00" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Quantidade de Parcelas</label>
                  <select className="input-field" value={installmentsCount} onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}>
                    {[1,2,3,4,5,6].map(n => (
                      <option key={n} value={n}>{n}x de R$ {(financedAmount / n).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: 1 }}><ArrowLeft size={18} /> Voltar</button>
              <button onClick={handeNextStep} className="btn btn-primary" style={{ flex: 1 }} disabled={!paymentMethod || (paymentMethod === 'crediario' && !selectedCustomerId)}>Revisar Pedido <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* --- STEP 4: RESUMO CHECKOUT --- */}
        {step === 4 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <CheckCircle size={48} color="var(--primary-accent)" style={{ margin: '0 auto 12px' }}/>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Revisão da Venda</h3>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px' }}>
              
              <div style={{ paddingBottom: '12px', borderBottom: '1px dashed var(--border-color)', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Produto:</div>
                <div style={{ fontWeight: 'bold' }}>{selectedProductData.code} {selectedProductData.description ? `- ${selectedProductData.description}` : ''}</div>
                <div>{quantity} un. x R$ {selectedProductData.price.toFixed(2)} (Tam: {selectedProductData.size})</div>
              </div>

              <div style={{ paddingBottom: '12px', borderBottom: '1px dashed var(--border-color)', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cliente:</div>
                <div style={{ fontWeight: '500' }}>{selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : 'Consumidor Final (Não Identificado)'}</div>
              </div>

              <div style={{ paddingBottom: '12px', borderBottom: paymentMethod === 'crediario' ? '1px dashed var(--border-color)' : 'none', marginBottom: paymentMethod === 'crediario' ? '12px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Pagamento:</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <span>Total da Venda:</span>
                  <span style={{ color: 'var(--primary-accent)' }}>R$ {total_price.toFixed(2)}</span>
                </div>
              </div>

              {paymentMethod === 'crediario' && (
                <div>
                  {downPaymentVal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-good)', marginBottom: '8px' }}>
                      <span>Entrada Paga:</span>
                      <span>R$ {downPaymentVal.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Cronograma de Parcelas:</div>
                    {[...Array(installmentsCount)].map((_, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span>{i+1}ª Parc: {format(addDays(new Date(), 30 * (i+1)), "dd/MM/yy")}</span>
                        <span style={{ fontWeight: 'bold' }}>R$ {installmentValue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button disabled={loading} onClick={() => setStep(3)} className="btn btn-secondary" style={{ flex: 1 }}><ArrowLeft size={18} /> Alterar</button>
              <button disabled={loading} onClick={handleFinalSubmit} className="btn btn-primary" style={{ flex: 2 }}>{loading ? 'Processando...' : 'Confirmar e Salvar'}</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
