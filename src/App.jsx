import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  Truck,
  LogOut,
  Menu,
  X,
  PlusCircle,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Auth - En el siguiente paso lo conectaremos con Supabase
const USER_ROLES = {
  MASTER: 'Master',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  PROMOTOR: 'Promotor'
};

import Sales from './modules/Sales';
import Dashboard from './modules/Dashboard';
import Clients from './modules/Clients';
import Inventory from './modules/Inventory';
import Orders from './modules/Orders';
import Logistics from './modules/Logistics';
import Audit from './modules/Audit';
import Login from './modules/Login';

const App = () => {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Router>
      <div className={`main-layout ${isDarkMode ? 'dark-theme' : ''}`}>
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {window.innerWidth <= 1024 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="sidebar-backdrop"
                />
              )}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`sidebar ${window.innerWidth <= 1024 ? 'sidebar-mobile' : ''}`}
                style={{
                  width: 'var(--sidebar-width)',
                  background: 'var(--surface)',
                  height: '100vh',
                  position: window.innerWidth <= 1024 ? 'fixed' : 'sticky',
                  top: 0,
                  zIndex: 3000,
                  padding: '24px 0',
                  borderRadius: 0
                }}
              >
                <div style={{ padding: '0 24px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>VibeSales</h2>
                    <p style={{ fontSize: '0.6rem', color: '#999', letterSpacing: '2px', fontWeight: 900 }}>FERIA 2026</p>
                  </div>
                  {window.innerWidth <= 1024 && (
                    <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={20} /></button>
                  )}
                </div>

                <nav style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                  <SidebarLink to="/" icon={<BarChart3 size={20} />} label="Dashboard" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  <SidebarLink to="/ventas" icon={<ShoppingCart size={20} />} label="Ventas" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  <SidebarLink to="/pedidos" icon={<PlusCircle size={20} />} label="Pedidos" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  <SidebarLink to="/inventario" icon={<Package size={20} />} label="Inventario" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  <SidebarLink to="/clientes" icon={<Users size={20} />} label="Clientes" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  <SidebarLink to="/logistica" icon={<Truck size={20} />} label="Logística" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  {(user?.role?.toLowerCase() === 'master' || user?.role?.toLowerCase() === 'administrador') && (
                    <SidebarLink to="/auditoria" icon={<ShieldCheck size={20} />} label="Auditoría" onClick={() => window.innerWidth <= 1024 && setSidebarOpen(false)} />
                  )}
                </nav>

                <div style={{ padding: '24px 12px', borderTop: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>TEMA DEL SISTEMA</p>
                    <button
                      onClick={toggleDarkMode}
                      style={{
                        background: 'var(--primary)20',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--primary)',
                        fontSize: '0.7rem',
                        fontWeight: 900
                      }}
                    >
                      {isDarkMode ? <><Sun size={12} /> CLARO</> : <><Moon size={12} /> OSCURO</>}
                    </button>
                  </div>
                  <div className="glass-card" style={{ padding: '12px', marginBottom: '12px', background: 'var(--primary)05' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>{user.name}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.role}</p>
                  </div>
                  <button className="btn-premium btn-secondary" style={{ width: '100%' }} onClick={() => setUser(null)}>
                    <LogOut size={18} /> SALIR
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="content-area" onClick={() => window.innerWidth <= 1024 && isSidebarOpen && setSidebarOpen(false)}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '15px' }}>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(!isSidebarOpen); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isSidebarOpen ? <X /> : <Menu />}
              <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>MENÚ</span>
            </button>
          </header>

          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/ventas" element={<Sales user={user} />} />
            <Route path="/clientes" element={<Clients user={user} />} />
            <Route path="/inventario" element={<Inventory user={user} />} />
            <Route path="/pedidos" element={<Orders user={user} />} />
            <Route path="/logistica" element={<Logistics user={user} />} />
            <Route path="/auditoria" element={<Audit user={user} />} />
            {/* Otras rutas se irán agregando */}
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const SidebarLink = ({ to, icon, label, onClick }) => (
  <Link to={to} onClick={onClick} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    textDecoration: 'none',
    color: 'var(--secondary)',
    fontWeight: 700,
    borderRadius: '12px',
    marginBottom: '4px',
    transition: '0.2s',
    fontSize: '0.9rem'
  }} className="nav-link">
    {icon} <span>{label}</span>
  </Link>
);

export default App;
