import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Package, ShoppingCart, BarChart3 } from 'lucide-react';

import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import DashboardPage from './pages/DashboardPage';

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  const getStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
    gap: '4px',
    flex: 1,
    padding: '12px 0',
    transition: 'color 0.2s',
    fontSize: '0.75rem',
    fontWeight: isActive ? '600' : '500'
  });

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(24, 26, 32, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50
    }}>
      <Link to="/" style={getStyle(path === '/')}>
        <Home size={24} />
        Início
      </Link>
      <Link to="/produtos" style={getStyle(path === '/produtos')}>
        <Package size={24} />
        Produtos
      </Link>
      <Link to="/vendas" style={getStyle(path === '/vendas')}>
        <ShoppingCart size={24} />
        Vendas
      </Link>
      <Link to="/dashboard" style={getStyle(path === '/dashboard')}>
        <BarChart3 size={24} />
        Dashboard
      </Link>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/vendas" element={<SalesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
