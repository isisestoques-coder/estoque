import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { 
  Users, UserPlus, Search, Edit2, Trash2, ArrowLeft, 
  DollarSign, Calendar, Clock, CheckCircle, Share2, 
  FileText, Download, X 
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // View states: 'list', 'form', 'details'
  const [view, setView] = useState('list');
  const [currentCustomer, setCurrentCustomer] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  // Details state
  const [customerSales, setCustomerSales] = useState([]);
  const [customerInstallments, setCustomerInstallments] = useState([]);
  const [customerPaymentLogs, setCustomerPaymentLogs] = useState([]);

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInstallment, setPaymentInstallment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // Delete Confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Receipt Modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [view]);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerDetails(customer) {
    try {
      setLoading(true);
      setCurrentCustomer(customer);
      setView('details');

      const [salesRes, instRes, logsRes] = await Promise.all([
        supabase.from('sales').select('*').eq('customer_id', customer.id).order('sold_at', { ascending: false }),
        supabase.from('installments').select('*').eq('customer_id', customer.id).order('due_date', { ascending: true }),
        supabase.from('payment_logs').select('*').eq('customer_id', customer.id).order('paid_at', { ascending: false })
      ]);

      setCustomerSales(salesRes.data || []);
      setCustomerInstallments(instRes.data || []);
      setCustomerPaymentLogs(logsRes.data || []);
    } catch (error) {
      alert('Erro ao carregar detalhes: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, updated_at: new Date() };

      if (currentCustomer) {
        // Edit
        const { error } = await supabase.from('customers').update(payload).eq('id', currentCustomer.id);
        if (error) throw error;
        alert('Cliente atualizado com sucesso!');
      } else {
        // Create
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
        alert('Cliente cadastrado com sucesso!');
      }
      
      setFormData({ name: '', phone: '', address: '' });
      setCurrentCustomer(null);
      setView('list');
    } catch (error) {
      alert('Erro ao salvar cliente: ' + error.message);
    }
  };

  const openPaymentModal = (installment) => {
    setPaymentInstallment(installment);
    setPaymentAmount((installment.amount - installment.paid_amount).toFixed(2));
    setPaymentModalOpen(true);
  };

  const handlePayInstallment = async (e) => {
    e.preventDefault();
    if (!paymentInstallment) return;
    
    const paidValue = parseFloat(String(paymentAmount).replace(',', '.'));
    if (isNaN(paidValue) || paidValue <= 0) {
      return alert('Valor inválido!');
    }

    try {
      setLoading(true);
      const installment = paymentInstallment;
      
      const isTotalPayment = paidValue >= (installment.amount - installment.paid_amount);
      const newPaidAmount = installment.paid_amount + paidValue;
      const newStatus = isTotalPayment ? 'paid' : 'partial';

      // 1. Update Installment
      const { error: instError } = await supabase
        .from('installments')
        .update({ 
          paid_amount: newPaidAmount, 
          status: newStatus,
          payment_date: isTotalPayment ? new Date() : installment.payment_date 
        })
        .eq('id', installment.id);
      
      if (instError) throw instError;

      // 2. Insert Payment Log
      const { error: logError } = await supabase
        .from('payment_logs')
        .insert([{
          installment_id: installment.id,
          customer_id: installment.customer_id,
          amount_paid: paidValue
        }]);

      if (logError) throw logError;

      // 3. Update Customer Debt Balance (reduce debt)
      const newDebt = Math.max(0, currentCustomer.debt_balance - paidValue);
      const { error: custError } = await supabase
        .from('customers')
        .update({ debt_balance: newDebt, updated_at: new Date() })
        .eq('id', currentCustomer.id);
        
      if (custError) throw custError;

      alert('Pagamento registrado com sucesso!');
      
      setPaymentModalOpen(false);
      setPaymentInstallment(null);
      
      // Reload details to verify fixes
      loadCustomerDetails({ ...currentCustomer, debt_balance: newDebt });
      
    } catch (error) {
      alert('Erro ao processar pagamento: ' + error.message);
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id);
      if (error) throw error;
      
      alert('Cliente excluído com sucesso!');
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      setView('list');
      fetchCustomers();
    } catch (error) {
      alert('Erro ao excluir cliente: ' + error.message);
      setLoading(false);
    }
  };

  const generatePDFReport = () => {
    try {
      if (!currentCustomer) return;
      
      const doc = new jsPDF();
      const now = format(new Date(), 'dd/MM/yyyy HH:mm');
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text('Relatório de Cliente - Estoque ISIS', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${now}`, 105, 28, { align: 'center' });
      
      // Customer Info
      doc.setFontSize(14);
      doc.text('Dados do Cliente', 14, 45);
      doc.setFontSize(11);
      doc.text(`Nome: ${currentCustomer.name}`, 14, 52);
      doc.text(`Telefone: ${currentCustomer.phone || 'Não informado'}`, 14, 58);
      doc.text(`Endereço: ${currentCustomer.address || 'Não informado'}`, 14, 64);
      doc.setTextColor(200, 0, 0);
      doc.text(`Saldo Devedor Atual: R$ ${Number(currentCustomer.debt_balance).toFixed(2)}`, 14, 70);
      doc.setTextColor(0);

      let finalY = 75;

      // Installments Table
      if (customerInstallments.length > 0) {
        doc.setFontSize(14);
        doc.text('Histórico de Parcelas', 14, finalY + 10);
        
        const head = [['#', 'Vencimento', 'Valor (R$)', 'Pago (R$)', 'Status']];
        const body = customerInstallments.map(inst => [
          inst.installment_number,
          format(new Date(inst.due_date), 'dd/MM/yyyy'),
          Number(inst.amount).toFixed(2),
          Number(inst.paid_amount).toFixed(2),
          inst.status === 'paid' ? 'Pago' : inst.status === 'partial' ? 'Parcial' : 'Pendente'
        ]);

        autoTable(doc, {
          startY: finalY + 15,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246] }
        });
        
        finalY = doc.lastAutoTable?.finalY || finalY + 20;
      }

      // Payment Logs Table
      if (customerPaymentLogs.length > 0) {
        doc.setFontSize(14);
        doc.text('Histórico de Recebimentos', 14, finalY + 15);
        
        const headLogs = [['Data/Hora', 'Valor Recebido (R$)']];
        const bodyLogs = customerPaymentLogs.map(log => [
          format(new Date(log.paid_at), 'dd/MM/yyyy HH:mm'),
          Number(log.amount_paid).toFixed(2)
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: headLogs,
          body: bodyLogs,
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] }
        });
      }

      doc.save(`Relatorio_${currentCustomer.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF: ' + error.message);
    }
  };

  const shareReceiptAsImage = async () => {
    const node = document.getElementById('receipt-content');
    if (!node) return;
    
    try {
      setSharing(true);
      const dataUrl = await toPng(node, { 
        backgroundColor: '#0f172a',
        style: {
          borderRadius: '16px'
        }
      });
      
      const link = document.createElement('a');
      link.download = `Recibo_${currentCustomer.name.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyy')}.png`;
      link.href = dataUrl;
      link.click();
      
      alert('Imagem do recibo gerada com sucesso! Você já pode compartilhar.');
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert('Erro ao gerar imagem para compartilhamento.');
    } finally {
      setSharing(false);
    }
  };

  const openReceiptModal = (sale) => {
    setSelectedSale(sale);
    setReceiptModalOpen(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  // --- RENDER VIEWS ---

  if (view === 'form') {
    return (
      <div className="page-container animate-in">
        <button onClick={() => setView('list')} className="btn btn-secondary" style={{ marginBottom: '24px', width: 'auto' }}>
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentCustomer ? <><Edit2 size={20} /> Editar Cliente</> : <><UserPlus size={20} /> Novo Cliente</>}
          </h2>
          
          <form onSubmit={handleSubmitForm}>
            <div className="input-group">
              <label className="input-label">Nome Completo *</label>
              <input type="text" name="name" required className="input-field" value={formData.name} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label className="input-label">Telefone</label>
              <input type="tel" name="phone" className="input-field" placeholder="(99) 99999-9999" value={formData.phone} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label className="input-label">Endereço Completo</label>
              <textarea name="address" className="input-field" rows="3" value={formData.address} onChange={handleInputChange}></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Salvar Cliente</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'details' && currentCustomer) {
    return (
      <div className="page-container animate-in">
        <button onClick={() => setView('list')} className="btn btn-secondary" style={{ marginBottom: '24px', width: 'auto' }}>
          <ArrowLeft size={16} /> Voltar para Clientes
        </button>

        {/* Customer Header */}
        <div className="glass-card" style={{ marginBottom: '24px', borderTop: '4px solid var(--primary-accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{currentCustomer.name}</h1>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                {currentCustomer.phone} | {currentCustomer.address}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  setFormData({ name: currentCustomer.name, phone: currentCustomer.phone || '', address: currentCustomer.address || '' });
                  setView('form');
                }}
                className="btn btn-secondary" 
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}
              >
                <Edit2 size={16} style={{ marginRight: '6px' }} /> Editar
              </button>
              <button 
                onClick={() => {
                  setCustomerToDelete(currentCustomer);
                  setDeleteConfirmOpen(true);
                }}
                className="btn btn-secondary" 
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', color: 'var(--status-critical)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <Trash2 size={16} style={{ marginRight: '6px' }} /> Excluir
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <div style={{ flex: 1, padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--status-critical)', fontWeight: '600', marginBottom: '4px' }}>Saldo Devedor Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                R$ {Number(currentCustomer.debt_balance).toFixed(2)}
              </div>
            </div>
            <button 
              onClick={generatePDFReport}
              className="btn btn-secondary" 
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--accent-purple)' }}
            >
              <FileText size={18} color="var(--accent-purple)" />
              <span style={{ fontSize: '0.9rem' }}>Relatório PDF</span>
            </button>
          </div>
        </div>

        {/* Installments Section */}
        <h2 className="page-title" style={{ fontSize: '1.2rem', marginTop: '32px' }}>Parcelas e Pagamentos</h2>
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          {customerInstallments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhuma parcela registrada para este cliente.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {customerInstallments.map(inst => {
                const isPaid = inst.status === 'paid';
                const isPartial = inst.status === 'partial';
                const isOverdue = new Date(inst.due_date) < new Date() && !isPaid;
                
                return (
                  <div key={inst.id} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.2)' : isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
                    background: isPaid ? 'rgba(16, 185, 129, 0.05)' : isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 'bold' }}>Parcela #{inst.installment_number}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                         {isPaid && <CheckCircle size={16} color="var(--status-good)" />}
                         <span style={{ 
                           color: isPaid ? 'var(--status-good)' : isOverdue ? 'var(--status-critical)' : 'var(--status-warning)',
                           fontWeight: '600'
                         }}>
                           {isPaid ? 'Pago' : isPartial ? 'Parcial' : isOverdue ? 'Atrasada' : 'Pendente'}
                         </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      <div>
                        Vencimento: <span style={{ color: isOverdue ? 'var(--status-critical)' : 'inherit', fontWeight: isOverdue ? 'bold': 'normal' }}>
                          {format(new Date(inst.due_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div>Valor: R$ {Number(inst.amount).toFixed(2)}</div>
                    </div>

                    {!isPaid && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                         <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Falta pagar:</div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>R$ {(inst.amount - inst.paid_amount).toFixed(2)}</div>
                         </div>
                         <button onClick={() => openPaymentModal(inst)} className="btn" style={{ width: 'auto', padding: '8px 16px', background: 'var(--status-good)', color: 'white' }}>
                           Receber Pagamento
                         </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales History */}
        <h2 className="page-title" style={{ fontSize: '1.2rem', marginTop: '32px' }}>Histórico de Compras</h2>
        <div className="glass-card" style={{ marginBottom: '24px' }}>
           {customerSales.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhuma compra registrada.</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {customerSales.map(sale => (
                <div 
                  key={sale.id} 
                  onClick={() => openReceiptModal(sale)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', borderRadius: '8px' }}
                  className="hover-card"
                >
                  <div>
                    <div style={{ fontWeight: '500' }}>{sale.product_description || sale.product_code}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{format(new Date(sale.sold_at), "dd/MM/yyyy", { locale: ptBR })} | Pagamento: {sale.payment_method?.toUpperCase()}</div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>
                    R$ {Number(sale.total_price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Payment Logs History */}
        <h2 className="page-title" style={{ fontSize: '1.2rem', marginTop: '32px' }}>Histórico de Recebimentos (Logs)</h2>
        <div className="glass-card">
           {customerPaymentLogs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhum pagamento recebido ainda.</p>
          ) : (
             <div style={{ display: 'grid', gap: '8px' }}>
               {customerPaymentLogs.map(log => (
                 <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '50%' }}>
                     <DollarSign size={16} color="var(--status-good)" />
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: '500' }}>R$ {Number(log.amount_paid).toFixed(2)} recebido</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{format(new Date(log.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Payment Modal */}
        {paymentModalOpen && paymentInstallment && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: '20px', paddingTop: '10vh'
          }}>
            <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} color="var(--status-good)" /> Receber Pagamento
              </h2>
              
              <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Parcela #{paymentInstallment.installment_number}
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
                  Falta pagar: R$ {(paymentInstallment.amount - paymentInstallment.paid_amount).toFixed(2)}
                </div>
              </div>

              <form onSubmit={handlePayInstallment}>
                <div className="input-group">
                  <label className="input-label">Qual valor está sendo pago agora? (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setPaymentModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--status-good)' }} disabled={loading}>
                    {loading ? '...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt / Sale Details Modal */}
        {receiptModalOpen && selectedSale && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px'
          }}>
            <div style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
              {/* Actual Content to Capture */}
              <div id="receipt-content" style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-accent)', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Recibo de Compra</div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>Estoque ISIS</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{format(new Date(selectedSale.sold_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</div>
                </div>

                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', borderBottom: '1px dashed rgba(255,255,255,0.1)', padding: '24px 0', marginBottom: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Cliente</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{currentCustomer.name}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Produto</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{selectedSale.product_description || selectedSale.product_code}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Qtd: {selectedSale.quantity} un.</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Pagamento</div>
                    <div style={{ fontWeight: '600', textTransform: 'uppercase' }}>{selectedSale.payment_method === 'crediario' ? 'Crediário' : selectedSale.payment_method}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Entrada</div>
                    <div style={{ fontWeight: '600' }}>R$ {Number(selectedSale.down_payment || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total da Venda</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--primary-accent)' }}>
                    R$ {Number(selectedSale.total_price).toFixed(2)}
                  </div>
                  {selectedSale.installments_count > 1 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Parcelado em {selectedSale.installments_count}x
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Obrigado pela preferência!
                </div>
              </div>

              {/* Actions below the capture node */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  onClick={() => setReceiptModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <X size={18} /> Fechar
                </button>
                <button 
                  onClick={shareReceiptAsImage} 
                  className="btn btn-primary" 
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#2563eb' }}
                  disabled={sharing}
                >
                  {sharing ? 'Gerando...' : <><Share2 size={18} /> Compartilhar Imagem</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && customerToDelete && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px'
          }}>
            <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '400px', borderTop: '4px solid var(--status-critical)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--status-critical)' }}>
                Excluir Cliente?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                Tem certeza que deseja excluir o cliente <strong>{customerToDelete.name}</strong>?
                <br/><br/>
                Isso removerá permanentemente o histórico de parcelas e recebimentos vinculados a ele. Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteConfirmOpen(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button className="btn" onClick={handleDeleteCustomer} style={{ flex: 1, background: 'var(--status-critical)', color: 'white' }} disabled={loading}>
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- DEFAULT VIEW: LIST ---
  return (
    <div className="page-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Meus Clientes</h1>
        <button 
          onClick={() => { setFormData({ name: '', phone: '', address: '' }); setCurrentCustomer(null); setView('form'); }} 
          className="btn btn-primary" 
          style={{ width: 'auto', padding: '10px 16px' }}
        >
          <UserPlus size={20} /> <span className="hide-mobile">Novo Cliente</span>
        </button>
      </div>

      <div className="glass-card">
        <div className="input-group" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Buscar por nome ou telefone..." 
            style={{ paddingLeft: '44px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Carregando...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Nenhum cliente encontrado.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredCustomers.map(customer => (
              <div 
                key={customer.id} 
                className="glass-card" 
                style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  borderLeft: customer.debt_balance > 0 ? '4px solid var(--status-critical)' : '4px solid var(--status-good)',
                }}
                onClick={() => loadCustomerDetails(customer)}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{customer.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {customer.phone || 'Sem telefone'} | Saldo devedor: R$ {Number(customer.debt_balance).toFixed(2)}
                  </div>
                </div>
                <Users size={20} color="var(--primary-accent)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
