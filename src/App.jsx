import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, BarChart3, LogOut, Users } from 'lucide-react';

import { AuthProvider, useAuth } from './lib/contexts/AuthContext';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const { signOut } = useAuth();

  if (path === '/login') return null;

  const getStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
    gap: '2px',
    flex: 1,
    padding: '10px 0',
    transition: 'color 0.2s',
    fontSize: '0.70rem',
    fontWeight: isActive ? '600' : '500',
    border: 'none',
    background: 'none'
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
        <Home size={22} />
        Início
      </Link>
      <Link to="/produtos" style={getStyle(path === '/produtos')}>
        <Package size={22} />
        Produtos
      </Link>
      <Link to="/clientes" style={getStyle(path === '/clientes')}>
        <Users size={22} />
        Clientes
      </Link>
      <Link to="/vendas" style={getStyle(path === '/vendas')}>
        <ShoppingCart size={22} />
        Vendas
      </Link>
      <Link to="/dashboard" style={getStyle(path === '/dashboard')}>
        <BarChart3 size={22} />
        Painel
      </Link>
      <button onClick={() => signOut()} style={getStyle(false)}>
        <LogOut size={22} />
        Sair
      </button>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          </Routes>
          <BottomNav />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

