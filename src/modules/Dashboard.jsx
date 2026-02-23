import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
    TrendingUp, Users, ShoppingBag, DollarSign,
    Calendar, Loader2, Download, UserCheck, X, AlertCircle, Briefcase, Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Dashboard = ({ user }) => {
    const dashboardRef = useRef();
    const [stats, setStats] = useState({
        totalSales: 0,
        totalCost: 0,
        utility: 0,
        salesCount: 0,
        receivablesTotal: 0,
        pendingOrders: 0,
        topProducts: [],
        salesByZone: [],
        dailySales: [],
        topClients: [],
        debtorClients: []
    });
    const [loading, setLoading] = useState(true);
    const [showReceivablesModal, setShowReceivablesModal] = useState(false);

    const SALES_GOAL = 12500000; // 12.5M

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // 1. Basic Stats & Sales
            const { data: sales } = await supabase.from('sales').select('id, total_amount, created_at, clients(id, name, zone)');
            const { data: saleItems } = await supabase.from('sale_items').select('quantity, unit_price, purchase_unit_price, products(name)');
            const { data: clients } = await supabase.from('clients').select('*');
            const { count: ordCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pendiente');

            const totalSales = sales?.reduce((acc, s) => acc + parseFloat(s.total_amount), 0) || 0;

            // Calculate Total Cost (COGS)
            const totalCost = saleItems?.reduce((acc, item) => {
                const cost = parseFloat(item.purchase_unit_price || 0) * item.quantity;
                return acc + cost;
            }, 0) || 0;

            const utility = totalSales - totalCost;

            // Calculate receivables (Cuentas por cobrar) from clients with balance > 0
            const debtors = clients?.filter(c => parseFloat(c.balance) > 0) || [];
            const receivablesTotal = debtors.reduce((acc, c) => acc + parseFloat(c.balance), 0);

            // 2. Sales by Zone
            const zones = {};
            sales?.forEach(s => {
                const zone = s.clients?.zone || 'Sin Zona';
                zones[zone] = (zones[zone] || 0) + parseFloat(s.total_amount);
            });
            const salesByZone = Object.keys(zones).map(name => ({ name, value: zones[name] }));

            // 3. Daily Sales
            const daily = {};
            sales?.forEach(s => {
                const date = new Date(s.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                daily[date] = (daily[date] || 0) + parseFloat(s.total_amount);
            });
            const dailySales = Object.keys(daily).map(date => ({ date, amount: daily[date] })).sort((a, b) => new Date(a.date) - new Date(b.date));

            // 4. Top Clients
            const clientPurchases = {};
            sales?.forEach(s => {
                const name = s.clients?.name || 'Cliente Gral';
                clientPurchases[name] = (clientPurchases[name] || 0) + parseFloat(s.total_amount);
            });
            const topClients = Object.keys(clientPurchases)
                .map(name => ({ name, amount: clientPurchases[name] }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5);

            // 5. Calculate Top Products from actual sale items
            const productSales = {};
            saleItems?.forEach(item => {
                const name = item.products?.name || 'Producto';
                productSales[name] = (productSales[name] || 0) + (parseFloat(item.unit_price) * item.quantity);
            });
            const topProducts = Object.keys(productSales)
                .map(name => ({ name, sales: productSales[name] }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 5);

            setStats({
                totalSales,
                totalCost,
                utility,
                salesCount: sales?.length || 0,
                receivablesTotal,
                pendingOrders: ordCount || 0,
                salesByZone,
                dailySales,
                topClients,
                debtorClients: debtors.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)),
                topProducts: topProducts.length > 0 ? topProducts : [
                    { name: 'XX LAGER', sales: 0 },
                    { name: 'HIELO 5KG', sales: 0 }
                ]
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async () => {
        const element = dashboardRef.current;
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('Reporte_Utilidad_SecureSales.pdf');
    };

    const goalPercentage = Math.min(100, (stats.totalSales / SALES_GOAL) * 100);
    const utilityMargin = stats.totalSales > 0 ? ((stats.utility / stats.totalSales) * 100).toFixed(1) : 0;

    if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

    return (
        <div style={{ padding: '0px' }} ref={dashboardRef}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Panel Financiero & Utilidad 📊</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Métricas de rentabilidad en tiempo real • Feria 2026</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={downloadReport} className="btn-premium btn-secondary" style={{ padding: '10px 20px' }}>
                        <Download size={18} /> Reporte Ejecutiva
                    </button>
                    <div style={{ padding: '10px 20px', background: 'white', borderRadius: '15px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 800 }}>En Producción</span>
                    </div>
                </div>
            </header>

            {/* FULL WIDTH UTILITY HIGHLIGHT */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '30px' }}>
                <div className="glass-card" style={{ padding: '30px', background: 'linear-gradient(135deg, var(--secondary), #152c4b)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, letterSpacing: '2px' }}>UTILIDAD BRUTA TOTAL</p>
                        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)', margin: '10px 0', textShadow: '0 0 20px rgba(197, 160, 89, 0.3)' }}>
                            ${stats.utility.toLocaleString()}
                        </h2>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                            <div>
                                <p style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 700 }}>VENTA BRUTA</p>
                                <p style={{ fontWeight: 900 }}>${stats.totalSales.toLocaleString()}</p>
                            </div>
                            <div style={{ width: '2px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <div>
                                <p style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 700 }}>COSTO MERCANCÍA</p>
                                <p style={{ fontWeight: 900 }}>${stats.totalCost.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ width: '100px', height: '100px', background: 'rgba(197, 160, 89, 0.1)', borderRadius: '50%', border: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>{utilityMargin}%</p>
                            <p style={{ fontSize: '0.5rem', fontWeight: 800 }}>MARGEN</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#999', marginBottom: '15px' }}>RECAUDACIÓN VS META ($12.5M)</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{goalPercentage.toFixed(1)}%</span>
                        <TrendingUp color="#22c55e" style={{ marginBottom: '10px' }} />
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#f0f0f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goalPercentage}%` }}
                            style={{ height: '100%', background: 'var(--primary)' }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <KpiCard icon={<DollarSign color="#22c55e" />} label="Efectivo Generado" value={`$${(stats.totalSales - stats.receivablesTotal).toLocaleString()}`} trend="Real" />
                <KpiCard icon={<ShoppingBag color="var(--primary)" />} label="Transacciones" value={stats.salesCount} trend="Ventas" />
                <KpiCard
                    icon={<Users color="var(--secondary)" />}
                    label="Por Cobrar"
                    value={`$${stats.receivablesTotal.toLocaleString()}`}
                    trend="Cartera"
                    onClick={() => setShowReceivablesModal(true)}
                    isClickable
                />
                <KpiCard icon={<Briefcase color="#ef4444" />} label="Pedidos" value={stats.pendingOrders} trend="Pend." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '25px', height: '400px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Histórico de Ingresos</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={stats.dailySales}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: '25px', height: '400px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Ventas por Zona</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={stats.salesByZone}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                            <Tooltip cursor={{ fill: 'rgba(197, 160, 89, 0.05)' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '25px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Top Clientes (Compras)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stats.topClients.map((c, idx) => (
                            <div key={idx} style={{ padding: '12px 20px', background: '#fcfcfc', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <UserCheck size={20} color="var(--primary)" />
                                    <p style={{ fontWeight: 800, margin: 0 }}>{c.name}</p>
                                </div>
                                <p style={{ fontWeight: 900, color: 'var(--secondary)' }}>${c.amount.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '25px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Productos más Rentables</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stats.topProducts.map((p, idx) => (
                            <div key={idx} style={{ padding: '12px 20px', background: '#fcfcfc', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '25px', height: '25px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem' }}>{idx + 1}</div>
                                    <p style={{ fontWeight: 800, margin: 0 }}>{p.name}</p>
                                </div>
                                <p style={{ fontWeight: 900, color: 'var(--secondary)' }}>${p.sales.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL CUENTAS POR COBRAR */}
            <AnimatePresence>
                {showReceivablesModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                        onClick={() => setShowReceivablesModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()} className="glass-card"
                            style={{ background: 'white', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            <div style={{ padding: '25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><AlertCircle color="#ef4444" /> Cartera Vencida</h2>
                                    <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>Clientes con deudas activas por créditos</p>
                                </div>
                                <button onClick={() => setShowReceivablesModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                                {stats.debtorClients.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: '#999', borderBottom: '2px solid #eee' }}>
                                                <th style={{ padding: '12px' }}>CLIENTE</th>
                                                <th>ZONA</th>
                                                <th style={{ textAlign: 'right' }}>DEUDA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.debtorClients.map((c, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f9f9f9', fontSize: '0.9rem' }}>
                                                    <td style={{ padding: '15px 12px', fontWeight: 800 }}>{c.name}</td>
                                                    <td style={{ color: '#666' }}>{c.zone}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>${parseFloat(c.balance).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
                                        <UserCheck size={60} strokeWidth={1} />
                                        <p>No hay deudas pendientes</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const KpiCard = ({ icon, label, value, trend, onClick, isClickable }) => (
    <motion.div
        whileHover={isClickable ? { y: -5, scale: 1.02 } : {}}
        onClick={onClick} className="glass-card"
        style={{
            padding: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            cursor: isClickable ? 'pointer' : 'default', border: isClickable ? '2px solid rgba(197,160,89,0.3)' : '1px solid var(--glass-border)'
        }}
    >
        <div>
            <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '10px', display: 'inline-block', marginBottom: '10px' }}>{icon}</div>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '5px' }}>{value}</p>
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '20px', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--primary)' }}>
            {trend}
        </div>
    </motion.div>
);

export default Dashboard;
