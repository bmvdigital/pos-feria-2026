import React, { useState } from 'react';
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
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

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
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              className="sidebar glass-card"
              style={{ width: 'var(--sidebar-width)', height: '100vh', position: 'sticky', top: 0, zIndex: 100, borderRadius: 0 }}
            >
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--primary)', letterSpacing: '2px' }}>SECURE SALES</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Feria Tabasco 2026</p>
              </div>

              <nav style={{ padding: '12px' }}>
                <SidebarLink to="/" icon={<BarChart3 size={20} />} label="Dashboard" />
                <SidebarLink to="/ventas" icon={<ShoppingCart size={20} />} label="Ventas" />
                <SidebarLink to="/pedidos" icon={<PlusCircle size={20} />} label="Pedidos" />
                <SidebarLink to="/inventario" icon={<Package size={20} />} label="Inventario" />
                <SidebarLink to="/clientes" icon={<Users size={20} />} label="Clientes" />
                <SidebarLink to="/logistica" icon={<Truck size={20} />} label="Logística" />
                {(user?.role?.toLowerCase() === 'master' || user?.role?.toLowerCase() === 'administrador') && (
                  <SidebarLink to="/auditoria" icon={<ShieldCheck size={20} />} label="Auditoría" />
                )}
              </nav>

              <div style={{ position: 'absolute', bottom: '24px', width: '100%', padding: '0 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 5px 10px 5px' }}>
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
                <div className="glass-card" style={{ padding: '12px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{user.name}</p>
                  <p style={{ fontSize: '0.65rem' }}>{user.role}</p>
                </div>
                <button className="btn-premium btn-secondary" style={{ width: '100%' }} onClick={() => setUser(null)}>
                  <LogOut size={18} /> Salir
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="content-area">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
              {isSidebarOpen ? <X /> : <Menu />}
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

const SidebarLink = ({ to, icon, label }) => (
  <Link to={to} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    textDecoration: 'none',
    color: 'var(--secondary)',
    fontWeight: 500,
    borderRadius: '12px',
    marginBottom: '4px',
    transition: '0.2s'
  }} className="nav-link">
    {icon} <span>{label}</span>
  </Link>
);

export default App;
