import React, { useState, useEffect } from 'react';
import {
    Truck, Package, MapPin, Clock,
    CheckCircle2, ChevronRight, X, Loader2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const Logistics = ({ user }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('orders')
            .select('*, clients(*), order_items(*, products(*))')
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
        setLoading(false);
    };

    const handleConfirmDelivery = async (order) => {
        try {
            // 1. Marcar pedido como Entregado
            const { error: ordError } = await supabase
                .from('orders')
                .update({ status: 'Entregado' })
                .eq('id', order.id);

            if (ordError) throw ordError;

            // 2. Registrar venta final
            const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
                client_id: order.client_id,
                warehouse_id: order.warehouse_id,
                total_amount: order.total_amount,
                payment_method: 'credito'
            }]).select().single();

            if (saleError) throw saleError;

            // 3. Registrar items de la venta (SNAPSHOT de costos para utilidad)
            const saleItems = order.order_items.map(item => ({
                sale_id: saleData.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                purchase_unit_price: item.products.purchase_price || 0
            }));

            await supabase.from('sale_items').insert(saleItems);

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Pedido Entregado',
                description: `Se entregó y procesó como venta el pedido ${order.folio} del cliente ${order.clients?.name}`,
                metadata: { order_id: order.id, sale_id: saleData.id, folio: order.folio }
            }]);

            alert("Entrega confirmada. El inventario y saldo del cliente han sido actualizados.");
            fetchOrders();
            setSelectedOrder(null);
        } catch (error) {
            console.error(error);
            alert("Error al confirmar entrega");
        }
    };

    if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

    return (
        <div style={{ padding: '0px' }}>
            <header style={{ marginBottom: '30px' }}>
                <h1>Logística y Entregas 🚚</h1>
                <p style={{ color: 'var(--text-muted)' }}>Despacho de pedidos y control de flota</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Cola de Entrega</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {orders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                style={{
                                    padding: '20px',
                                    background: '#fcfcfc',
                                    borderRadius: '15px',
                                    border: selectedOrder?.id === order.id ? '2px solid var(--primary)' : '1px solid #eee',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ padding: '10px', background: order.status === 'Pendiente' ? '#fef9c3' : '#dcfce7', borderRadius: '12px' }}>
                                        <Truck color={order.status === 'Pendiente' ? '#a16207' : '#15803d'} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 800, margin: 0 }}>{order.folio} • {order.clients.name}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#999' }}>{order.clients.zone} • {new Date(order.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 900, fontSize: '1.1rem' }}>${parseFloat(order.total_amount).toLocaleString()}</p>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: order.status === 'Pendiente' ? '#a16207' : '#15803d' }}>{order.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '25px', position: 'sticky', top: '20px', height: 'fit-content' }}>
                    {selectedOrder ? (
                        <div>
                            <h3>Detalle de Carga</h3>
                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '10px' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666' }}>DESTINO FINAL</p>
                                    <p style={{ fontWeight: 800, margin: '5px 0' }}>{selectedOrder.clients.name}</p>
                                    <p style={{ fontSize: '0.8rem' }}><MapPin size={12} /> {selectedOrder.clients.zone}</p>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666', marginBottom: '10px' }}>MERCANCÍA A SURTIR</p>
                                    {selectedOrder.order_items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                                            <span>{item.quantity}x {item.products.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ borderTop: '2px dashed #ddd', paddingTop: '15px', marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <p style={{ fontWeight: 800 }}>Monto a Cobrar</p>
                                        <p style={{ fontWeight: 900, fontSize: '1.2rem' }}>${parseFloat(selectedOrder.total_amount).toLocaleString()}</p>
                                    </div>
                                    {selectedOrder.status !== 'Entregado' && (
                                        <button
                                            onClick={() => handleConfirmDelivery(selectedOrder)}
                                            className="btn-premium btn-primary"
                                            style={{ width: '100%', height: '50px' }}
                                        >
                                            <CheckCircle2 size={18} /> CONFIRMAR ENTREGA
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', py: 40, color: '#ccc' }}>
                            <Package size={60} strokeWidth={1} style={{ margin: '0 auto 20px' }} />
                            <p>Selecciona un pedido para gestionar el despacho</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Logistics;
