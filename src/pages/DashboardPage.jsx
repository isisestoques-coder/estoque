import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, DollarSign, Package } from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend, PointElement, LineElement 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement
);

export default function DashboardPage() {
  const [sales, setSales] = useState([]);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // today, week, month, year, all
  
  // Custom date range
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    try {
      const [salesRes, logsRes] = await Promise.all([
        supabase.from('sales').select('*').order('sold_at', { ascending: true }),
        supabase.from('payment_logs').select('*').order('paid_at', { ascending: true })
      ]);
        
      if (salesRes.error) throw salesRes.error;
      if (logsRes.error) throw logsRes.error;
      
      setSales(salesRes.data || []);
      setPaymentLogs(logsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter sales based on period
  const getFilteredSales = () => {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = new Date(now.setHours(0,0,0,0));
        end = new Date(now.setHours(23,59,59,999));
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 0 });
        end = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'custom':
        start = new Date(startDate);
        start.setHours(0,0,0,0);
        end = new Date(endDate);
        end.setHours(23,59,59,999);
        break;
      case 'all':
      default:
        return { filteredSales: sales, filteredLogs: paymentLogs };
    }

    const filteredSales = sales.filter(s => {
      if (!s.sold_at) return false;
      const date = parseISO(s.sold_at);
      return isWithinInterval(date, { start, end });
    });

    const filteredLogs = paymentLogs.filter(l => {
      if (!l.paid_at) return false;
      const date = parseISO(l.paid_at);
      return isWithinInterval(date, { start, end });
    });

    return { filteredSales, filteredLogs };
  };

  const { filteredSales, filteredLogs } = getFilteredSales();

  // Calculate metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const itemsSold = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Group by date for chart
  const salesByDate = filteredSales.reduce((acc, s) => {
    if (!s.sold_at) return acc;
    const dateStr = format(parseISO(s.sold_at), 'dd/MM/yyyy');
    if (!acc[dateStr]) acc[dateStr] = 0;
    acc[dateStr] += Number(s.total_price);
    return acc;
  }, {});

  // Group by category for chart
  const salesByCategory = filteredSales.reduce((acc, s) => {
    const cat = s.product_code || 'Outros';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += Number(s.total_price);
    return acc;
  }, {});

  // Group by payment method (Actual Received Cash)
  const salesByPaymentMethod = filteredSales.reduce((acc, s) => {
    const method = s.payment_method || 'não informado';
    if (!acc[method]) acc[method] = 0;
    
    if (method === 'crediario') {
       acc[method] += Number(s.down_payment || 0); // Only add down payment for crediario sales
    } else {
       acc[method] += Number(s.total_price); // Full total price for other methods
    }
    return acc;
  }, {});
  
  // Add installment payments to the crediário total 
  filteredLogs.forEach(log => {
      if (!salesByPaymentMethod['crediario (parcelas)']) salesByPaymentMethod['crediario (parcelas)'] = 0;
      salesByPaymentMethod['crediario (parcelas)'] += Number(log.amount_paid);
  });

  const totalReceived = Object.values(salesByPaymentMethod).reduce((sum, val) => sum + val, 0);

  const handleClearSales = async () => {
    if (window.confirm("ATENÇÃO: Você está prestes a apagar TODOS os registros de vendas, parcelamentos e recebtimentos do sistema. Essa ação é IRREVERSÍVEL. Deseja continuar?")) {
      setLoading(true);
      try {
        // Since installments and payment_logs have ON DELETE CASCADE, deleting sales will clear them too.
        // Supabase won't let you delete without a filter, so we use .not('id', 'is', null) which matches all.
        const { error } = await supabase.from('sales').delete().not('id', 'is', null);
        if (error) throw error;
        
        alert("Todos os registros de vendas foram apagados com sucesso.");
        fetchSales();
      } catch (error) {
        alert("Erro ao apagar dados: " + error.message);
        setLoading(false);
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
      title: { display: false }
    },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  const lineChartData = {
    labels: Object.keys(salesByDate),
    datasets: [
      {
        label: 'Receita (R$)',
        data: Object.values(salesByDate),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const barChartData = {
    labels: Object.keys(salesByCategory),
    datasets: [
      {
        label: 'Vendas por Categoria (R$)',
        data: Object.values(salesByCategory),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderRadius: 4,
      }
    ]
  };

  return (
    <div className="page-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Dashboard</h1>
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', padding: '8px', borderRadius: '50%' }}>
          <BarChart3 size={24} />
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', margin: '0 -10px', padding: '0 10px' }}>
          {['today', 'week', 'month', 'year', 'all', 'custom'].map(p => (
            <button 
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                background: period === p ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
                color: period === p ? '#fff' : 'var(--text-secondary)',
                fontWeight: period === p ? '600' : '400',
                whiteSpace: 'nowrap',
                border: 'none',
              }}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : p === 'all' ? 'Tudo' : 'Personalizado'}
            </button>
          ))}
        </div>
        
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', animation: 'slideUpFade 0.3s' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">De:</label>
              <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">Até:</label>
              <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid var(--primary-accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <DollarSign size={16} /> <span style={{ fontSize: '0.85rem' }}>Receita Total</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>R$ {totalRevenue.toFixed(2)}</div>
            </div>
            
            <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid var(--accent-green)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <Package size={16} /> <span style={{ fontSize: '0.85rem' }}>Itens Vendidos</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{itemsSold}</div>
            </div>
            
            <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid var(--accent-purple)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <TrendingUp size={16} /> <span style={{ fontSize: '0.85rem' }}>Valor Recebido Real</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>R$ {totalReceived.toFixed(2)}</div>
            </div>
          </div>

          {/* Payment Method Summary */}
          {filteredSales.length > 0 && (
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Receita por Forma de Pagamento</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {Object.entries(salesByPaymentMethod).sort((a,b) => b[1] - a[1]).map(([method, total]) => (
                  <div key={method} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', borderLeft: `3px solid ${method.includes('crediario') ? '#60a5fa' : method === 'pix' ? '#34d399' : method === 'dinheiro' ? '#10b981' : 'var(--text-secondary)'}` }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginBottom: '4px' }}>
                      {method === 'crediario' ? 'Crediário (Entradas)' : method}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      R$ {total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          {filteredSales.length > 0 ? (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Evolução de Receita</h3>
                <div style={{ height: '200px' }}>
                  <Line options={chartOptions} data={lineChartData} />
                </div>
              </div>
              
              <div className="glass-card">
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Receita por Categoria</h3>
                <div style={{ height: '200px' }}>
                  <Bar options={chartOptions} data={barChartData} />
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Nenhuma venda encontrada para o período selecionado.
            </div>
          )}

          {/* Recent Sales List with Payment Method */}
          <div className="glass-card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Vendas Recentes no Período</h3>
            {filteredSales.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {filteredSales.slice().reverse().slice(0, 10).map(sale => (
                  <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {sale.product_code} {sale.product_description ? `- ${sale.product_description}` : ''}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{format(parseISO(sale.sold_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        
                        {sale.payment_method && (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: sale.payment_method === 'crediario' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: sale.payment_method === 'crediario' ? '#60a5fa' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: sale.payment_method === 'crediario' ? 'bold' : 'normal',
                            border: sale.payment_method === 'crediario' ? '1px solid rgba(59, 130, 246, 0.5)' : 'none'
                          }}>
                            {sale.payment_method === 'crediario' ? 'CREDIÁRIO / FIADO' : sale.payment_method.toUpperCase()}
                            {sale.payment_method === 'crediario' && sale.installments_count > 1 ? ` (${sale.installments_count}x)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary-accent)' }}>
                      R$ {Number(sale.total_price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhuma venda para listar.</p>
            )}
          </div>

          {/* Danger Zone */}
          <div style={{ marginTop: '48px', borderTop: '1px solid rgba(239, 68, 68, 0.3)', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={handleClearSales}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--status-critical)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 24px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Apagar Todos os Dados de Vendas
            </button>
          </div>
        </>
      )}
    </div>
  );
}
