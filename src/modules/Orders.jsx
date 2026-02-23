import React, { useState, useEffect } from 'react';
import {
    PlusCircle, Clock, Truck, CheckCircle2, MapPin,
    ShoppingCart, Printer, X, Package, ChevronRight,
    Minus, Plus, ArrowLeft, Loader2, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Orders = ({ user }) => {
    const navigate = useNavigate();
    const [view, setView] = useState('list');
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState('Principal');
    const [loading, setLoading] = useState(true);
    const [showClientMeta, setShowClientMeta] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const orderSheetRef = React.useRef();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: ords } = await supabase.from('orders').select('*, clients(name, zone)').order('created_at', { ascending: false });
        const { data: prods } = await supabase.from('products').select('*');
        const { data: clis } = await supabase.from('clients').select('*');

        if (ords) setOrders(ords);
        if (prods) setProducts(prods);
        if (clis) setClients(clis);
        setLoading(false);
    };

    const handleCancelOrder = async (order) => {
        if (!window.confirm(`¿Estás seguro de cancelar el pedido ${order.folio}? Esta acción no se puede deshacer.`)) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'Cancelado' })
                .eq('id', order.id);

            if (error) throw error;

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Cancelación de Pedido',
                description: `Se canceló el pedido ${order.folio} del cliente ${order.clients?.name}`,
                metadata: { order_id: order.id, folio: order.folio }
            }]);

            alert("Pedido cancelado con éxito.");
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al cancelar el pedido.");
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const handleConfirmOrder = async () => {
        try {
            const { data: whData } = await supabase.from('warehouses').select('id').eq('name', selectedWarehouse).single();
            const folio = `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            const total = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.qty), 0);

            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                folio,
                client_id: selectedClient.id,
                warehouse_id: whData.id,
                total_amount: total,
                status: 'Pendiente'
            }]).select().single();

            if (orderError) throw orderError;

            const items = cart.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                quantity: item.qty,
                unit_price: item.price
            }));
            await supabase.from('order_items').insert(items);

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Nuevo Pedido',
                description: `Se levantó el pedido ${folio} para ${selectedClient.name} por $${total}`,
                metadata: { order_id: orderData.id, folio: folio, client: selectedClient.name }
            }]);

            alert("Pedido levantado satisfactoriamente.");
            setView('list');
            setCart([]);
            setSelectedClient(null);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Error al procesar pedido");
        }
    };

    if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

    if (view === 'pos') {
        return (
            <div style={{ padding: '0px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <button onClick={() => setView('list')} className="btn-premium btn-secondary" style={{ padding: '8px 15px' }}><ArrowLeft size={18} /> Volver</button>
                    <h2 style={{ margin: 0 }}>Levantar Pedido</h2>
                </header>
                <div className="sales-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} style={{ padding: '10px', borderRadius: '10px', width: '200px', marginBottom: '20px' }}>
                            <option value="Principal">Almacén Principal</option>
                            <option value="Teatro">Almacén Teatro</option>
                            <option value="Zona de Extrema">Almacén Zona de Extrema</option>
                        </select>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '15px' }}>
                            {products.map(p => (
                                <motion.button key={p.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(p)} style={{ height: '110px', background: `${p.color_hex}08`, border: `1px solid ${p.color_hex}33`, borderRadius: '15px', padding: '10px' }}>
                                    <Package size={20} color={p.color_hex} />
                                    <p style={{ fontWeight: 700, fontSize: '0.7rem', margin: '5px 0' }}>{p.name}</p>
                                    <p style={{ fontWeight: 900 }}>${p.price}</p>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.7rem', color: '#666' }}>DESTINO</p>
                        {!selectedClient ? (
                            <button onClick={() => setShowClientMeta(true)} className="glass-card" style={{ width: '100%', padding: '12px', textAlign: 'left', marginBottom: '20px' }}>Seleccionar...</button>
                        ) : (
                            <div style={{ background: 'var(--primary)11', padding: '10px', borderRadius: '10px', marginBottom: '20px' }}>
                                <p style={{ fontWeight: 800, margin: 0 }}>{selectedClient.name}</p>
                            </div>
                        )}
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Carrito</h3>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {cart.map(i => (
                                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{i.qty}x {i.name}</span>
                                    <span style={{ fontWeight: 800 }}>${(i.qty * parseFloat(i.price)).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleConfirmOrder} disabled={cart.length === 0 || !selectedClient} className="btn-premium btn-primary" style={{ height: '50px', marginTop: '20px' }}>FINALIZAR PEDIDO</button>
                    </div>
                </div>

                <AnimatePresence>
                    {showClientMeta && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowClientMeta(false)}>
                            <div className="glass-card" style={{ background: 'white', padding: '25px', width: '400px' }} onClick={e => e.stopPropagation()}>
                                <h3>Destino del Pedido</h3>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {clients.map(c => (
                                        <div key={c.id} onClick={() => { setSelectedClient(c); setShowClientMeta(false); }} style={{ padding: '10px', border: '1px solid #eee', marginBottom: '5px', cursor: 'pointer' }}>{c.name}</div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div><h1>Gestión de Pedidos 📝</h1><p style={{ color: '#666' }}>Levantamiento remoto sincronizado con Supabase</p></div>
                <button className="btn-premium btn-primary" onClick={() => setView('pos')}><PlusCircle size={20} /> Nuevo Pedido</button>
            </header>
            <div className="glass-card" style={{ padding: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '15px' }}>Folio</th>
                            <th>Cliente</th>
                            <th>Zona</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>Logística / Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(o => (
                            <tr key={o.id} style={{ borderBottom: '1px solid #f9f9f9', opacity: o.status === 'Cancelado' ? 0.6 : 1 }}>
                                <td style={{ padding: '15px', fontWeight: 800, color: 'var(--primary)' }}>{o.folio}</td>
                                <td>{o.clients?.name}</td>
                                <td>{o.clients?.zone}</td>
                                <td style={{ fontWeight: 800 }}>${parseFloat(o.total_amount).toLocaleString()}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        background: o.status === 'Pendiente' ? '#fef9c3' : o.status === 'Cancelado' ? '#fee2e2' : '#dbeafe',
                                        color: o.status === 'Pendiente' ? '#a16207' : o.status === 'Cancelado' ? '#dc2626' : '#1e40af'
                                    }}>
                                        {o.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {o.status === 'Pendiente' && (
                                            <>
                                                <button
                                                    className="btn-premium btn-secondary"
                                                    onClick={() => navigate('/logistica')}
                                                    style={{ padding: '5px 12px', fontSize: '0.7rem' }}
                                                >
                                                    VER RUTA
                                                </button>
                                                {user?.role?.toLowerCase() === 'master' && (
                                                    <button
                                                        onClick={() => handleCancelOrder(o)}
                                                        title="Cancelar Pedido"
                                                        style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#e53e3e', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Ban size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {o.status === 'Entregado' && (
                                            <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>✅ FINALIZADO</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Orders;
