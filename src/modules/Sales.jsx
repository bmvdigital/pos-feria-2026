import React, { useState, useRef, useEffect } from 'react';
import {
    ShoppingCart, Trash2, Printer, CreditCard, Banknote,
    Search, User, Package, ChevronRight, X, AlertCircle, Plus, Minus, Download, History, Eye, Calendar, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabaseClient';

const Sales = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState('Principal');
    const [paymentMethod, setPaymentMethod] = useState('contado');
    const [showClientMeta, setShowClientMeta] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [salesHistory, setSalesHistory] = useState([]);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [loading, setLoading] = useState(true);
    const ticketRef = useRef();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: productsData } = await supabase.from('products').select('*');
            const { data: clientsData } = await supabase.from('clients').select('*');
            setProducts(productsData || []);
            setClients(clientsData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        const { data, error } = await supabase
            .from('sales')
            .select('*, clients(name, zone), warehouses(name)')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setSalesHistory(data);
    };

    const handleCancelSale = async (sale) => {
        if (!window.confirm("¿Estás seguro de cancelar esta venta? El stock y el saldo del cliente se revertirán.")) return;

        const { error } = await supabase
            .from('sales')
            .update({ status: 'Cancelada' })
            .eq('id', sale.id);

        if (error) {
            alert("Error al cancelar la venta");
        } else {
            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Cancelación de Venta',
                description: `Se canceló la venta #${sale.id.slice(0, 8)} del cliente ${sale.clients?.name} por un monto de $${sale.total_amount}`,
                metadata: { sale_id: sale.id, client: sale.clients?.name, amount: sale.total_amount }
            }]);

            alert("Venta cancelada con éxito");
            fetchHistory();
            fetchInitialData(); // Para refrescar saldos y stock
        }
    };

    const handleDeleteSale = async (saleId) => {
        if (!window.confirm("⚠️ ATENCIÓN: Se eliminará permanentemente el registro de la venta. Esta acción solo la puede realizar un perfil Master. ¿Continuar?")) return;

        const { error } = await supabase
            .from('sales')
            .delete()
            .eq('id', saleId);

        if (error) {
            alert("Error al eliminar la venta");
        } else {
            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Eliminación de Venta',
                description: `Se eliminó permanentemente el registro de la venta #${saleId.slice(0, 8)}`,
                metadata: { sale_id: saleId }
            }]);

            alert("Venta eliminada permanentemente");
            fetchHistory();
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

    const updateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.qty), 0);
    const isCreditDisabled = selectedClient?.credits_count >= 2;

    const handleProcessSale = async () => {
        if (!selectedClient) return alert("Selecciona un cliente.");

        try {
            const { data: whData } = await supabase.from('warehouses').select('id').eq('name', selectedWarehouse).single();

            const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
                client_id: selectedClient.id,
                warehouse_id: whData.id,
                total_amount: total,
                payment_method: paymentMethod,
                status: 'Completada',
                seller_id: user?.id // Registrar quién vendió
            }]).select().single();

            if (saleError) throw saleError;

            const saleItems = cart.map(item => ({
                sale_id: saleData.id,
                product_id: item.id,
                quantity: item.qty,
                unit_price: item.price,
                purchase_unit_price: item.purchase_price || 0
            }));

            await supabase.from('sale_items').insert(saleItems);

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Nueva Venta',
                description: `Venta registrada para ${selectedClient.name} por $${total} (${paymentMethod.toUpperCase()})`,
                metadata: { sale_id: saleData.id, client: selectedClient.name, amount: total, method: paymentMethod }
            }]);

            setCart([]);
            setSelectedClient(null);
            setPaymentMethod('contado');
            fetchInitialData();
        } catch (error) {
            console.error("Error processing sale:", error);
            alert("Error al procesar la venta.");
        }
    };

    const generatePDF = async () => {
        setIsGeneratingPDF(true);
        const element = ticketRef.current;
        const canvas = await html2canvas(element, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ unit: 'mm', format: [80, 200] });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = 80;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Ticket_${selectedClient.name.replace(/\s/g, '_')}.pdf`);

        setIsGeneratingPDF(false);
        setShowPreview(false);
        await handleProcessSale();
        alert("Venta registrada y Ticket generado con éxito.");
    };

    if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800 }}>CARGANDO SISTEMA DE VENTAS...</div>;

    return (
        <div className="sales-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>Punto de Venta</h2>
                            <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} style={{ marginTop: '10px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--primary)11', fontWeight: 700, outline: 'none' }}>
                                <option value="Principal">Almacén Principal</option>
                                <option value="Teatro">Almacén Teatro</option>
                                <option value="Zona de Extrema">Almacén Zona de Extrema</option>
                            </select>
                        </div>
                        <button
                            onClick={() => { fetchHistory(); setShowHistory(true); }}
                            className="btn-premium btn-secondary"
                            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}
                        >
                            <History size={16} /> Historial
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '15px' }}>
                    {products.map(product => (
                        <motion.button key={product.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(product)} style={{ height: '120px', border: `2px solid ${product.color_hex}44`, background: `${product.color_hex}08`, borderRadius: '16px', cursor: 'pointer', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                            <Package size={20} color={product.color_hex} style={{ marginBottom: '8px' }} />
                            <p style={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: '1.2' }}>{product.name}</p>
                            <p style={{ fontWeight: 900, fontSize: '1rem', marginTop: '5px' }}>${product.price}</p>
                        </motion.button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--text-muted)' }}>CLIENTE</p>
                        {selectedClient && <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem' }}>CAMBIAR</button>}
                    </div>
                    {!selectedClient ? (
                        <div style={{ position: 'relative' }}>
                            <input type="text" placeholder="Seleccionar cliente..." onClick={() => setShowClientMeta(true)} readOnly className="glass-card" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', cursor: 'pointer' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--primary)08', padding: '12px', borderRadius: '12px' }}>
                            <div style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '8px' }}><User size={20} /></div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{selectedClient.name}</p>
                                <p style={{ fontSize: '0.7rem', color: isCreditDisabled ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{isCreditDisabled ? '⚠️ BLOQUEADO' : '✅ DISPONIBLE'}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                    <h3><ShoppingCart size={18} /> Carrito</h3>
                    <div style={{ flex: 1, overflowY: 'auto', marginTop: '15px' }}>
                        {cart.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>Carrito vacío</p>}
                        {cart.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.8rem', margin: 0, flex: 1 }}>{item.name}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                                        <button onClick={() => updateQuantity(item.id, -1)} style={{ border: 'none', background: 'none', padding: '3px' }}><Minus size={12} /></button>
                                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 800 }}>{item.qty}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} style={{ border: 'none', background: 'none', padding: '3px' }}><Plus size={12} /></button>
                                    </div>
                                    <p style={{ fontWeight: 900, fontSize: '0.85rem', textAlign: 'right', minWidth: '60px' }}>${(item.qty * parseFloat(item.price)).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 'auto', borderTop: '2px dashed #ddd', paddingTop: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <button onClick={() => setPaymentMethod('contado')} className={`btn-premium ${paymentMethod === 'contado' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.65rem' }}>EFECTIVO</button>
                            <button onClick={() => setPaymentMethod('credito')} disabled={isCreditDisabled} className={`btn-premium ${paymentMethod === 'credito' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '0.65rem', opacity: isCreditDisabled ? 0.3 : 1 }}>CRÉDITO</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <p style={{ fontWeight: 800, fontSize: '0.8rem' }}>TOTAL</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: 900 }}>${total.toLocaleString()}</p>
                        </div>
                        <button onClick={() => setShowPreview(true)} disabled={cart.length === 0 || !selectedClient} className="btn-premium btn-primary" style={{ width: '100%', height: '55px' }}>PAGAR E IMPRIMIR</button>
                    </div>
                </div>
            </div>

            {/* MODAL HISTORIAL */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }} onClick={() => setShowHistory(false)}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="glass-card" style={{ background: 'white', width: '100%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History color="var(--primary)" /> Auditoría de Ventas</h2>
                                    <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>Historial completo de transacciones realizadas</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                                        <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: '#999', borderBottom: '2px solid #eee' }}>
                                            <th style={{ padding: '12px' }}>FECHA / HORA</th>
                                            <th>CLIENTE</th>
                                            <th>PUNTO DE VENTA</th>
                                            <th>MÉTODO</th>
                                            <th style={{ textAlign: 'right' }}>TOTAL</th>
                                            <th style={{ textAlign: 'center' }}>ESTADO</th>
                                            <th style={{ textAlign: 'center' }}>ACCIONES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesHistory.map((s, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f9f9f9', fontSize: '0.85rem', opacity: s.status === 'Cancelada' ? 0.6 : 1 }}>
                                                <td style={{ padding: '15px 12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Calendar size={14} color="#666" />
                                                        {new Date(s.created_at).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 700 }}>{s.clients?.name}</td>
                                                <td><span style={{ padding: '4px 8px', background: '#f0f0f0', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{s.warehouses?.name}</span></td>
                                                <td><span style={{ fontWeight: 800, color: s.payment_method === 'credito' ? '#ef4444' : '#22c55e' }}>{s.payment_method.toUpperCase()}</span></td>
                                                <td style={{ textAlign: 'right', fontWeight: 900 }}>${parseFloat(s.total_amount).toLocaleString()}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        background: s.status === 'Cancelada' ? '#fee2e2' : '#dcfce7',
                                                        color: s.status === 'Cancelada' ? '#dc2626' : '#15803d',
                                                        borderRadius: '20px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 800
                                                    }}>
                                                        {s.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        {s.status !== 'Cancelada' && (
                                                            <button
                                                                onClick={() => handleCancelSale(s)}
                                                                title="Cancelar Venta"
                                                                style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#e53e3e', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                                            >
                                                                <Ban size={14} />
                                                            </button>
                                                        )}
                                                        {user?.role?.toLowerCase() === 'master' && (
                                                            <button
                                                                onClick={() => handleDeleteSale(s.id)}
                                                                title="Eliminar Permanente"
                                                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showClientMeta && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowClientMeta(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} className="glass-card" style={{ background: 'white', width: '400px', padding: '25px' }}>
                            <h3>Seleccionar Cliente</h3>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '15px' }}>
                                {clients.map(c => (
                                    <div key={c.id} onClick={() => { setSelectedClient(c); setShowClientMeta(false); }} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                                        <p style={{ fontWeight: 700, margin: 0 }}>{c.name}</p>
                                        <p style={{ fontSize: '0.7rem', color: '#999' }}>Zona: {c.zone}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPreview(false)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
                            <div ref={ticketRef} style={{ background: 'white', padding: '20px', color: '#000', fontFamily: 'monospace' }}>
                                <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '15px', marginBottom: '15px' }}>
                                    <h2>SECURE SALES</h2>
                                    <p style={{ fontSize: '0.7rem' }}>ORIGEN: {selectedWarehouse.toUpperCase()}</p>
                                    <p style={{ fontSize: '0.7rem' }}>{new Date().toLocaleString()}</p>
                                </div>
                                <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                    <thead><tr style={{ borderBottom: '1px solid #000' }}><th>CANT</th><th>ITM</th><th style={{ textAlign: 'right' }}>SUB</th></tr></thead>
                                    <tbody>
                                        {cart.map(i => (<tr key={i.id}><td>{i.qty}</td><td>{i.name}</td><td style={{ textAlign: 'right' }}>${(i.qty * parseFloat(i.price)).toLocaleString()}</td></tr>))}
                                    </tbody>
                                </table>
                                <div style={{ textAlign: 'right', marginTop: '10px', borderTop: '2px solid #000' }}>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>TOTAL: ${total.toLocaleString()}</p>
                                </div>
                            </div>
                            <button className="btn-premium btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={generatePDF} disabled={isGeneratingPDF}>{isGeneratingPDF ? 'PROCESANDO...' : 'CONFIRMAR E IMPRIMIR'}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sales;
