import React, { useState, useEffect } from 'react';
import {
    Package, Search, ArrowRightLeft, History,
    AlertTriangle, CheckCircle, Info, Loader2, Store,
    Plus, X, Edit3, ArrowUp, ArrowDown, ClipboardList, TrendingUp, Tags, FileText, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const Inventory = ({ user }) => {
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modales
    const [showProductModal, setShowProductModal] = useState(false);
    const [showResupply, setShowResupply] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Formulario Producto
    const initialProductForm = {
        name: '',
        category: 'Cerveza',
        price: 0,
        purchase_price: 0,
        description: '',
        presentation: '',
        color_hex: '#0a192f'
    };
    const [productForm, setProductForm] = useState(initialProductForm);

    // Formulario Resurtido
    const [resupplyForm, setResupplyForm] = useState({ qty: 0, description: '' });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        setLoading(true);
        const { data: whs } = await supabase.from('warehouses').select('*').order('name');
        if (whs && whs.length > 0) {
            setWarehouses(whs);
            setSelectedWarehouse(whs[0]);
            fetchStock(whs[0].id);
        }
    };

    const fetchStock = async (whId) => {
        setLoading(true);
        const { data: st } = await supabase
            .from('stock')
            .select('*, products(*)')
            .eq('warehouse_id', whId);
        if (st) setStock(st);
        setLoading(false);
    };

    const fetchHistory = async () => {
        setShowHistory(true);
        setLoading(true);
        const { data } = await supabase
            .from('stock_movements')
            .select('*, products(name), warehouse:from_warehouse_id(name)')
            .order('created_at', { ascending: false });
        if (data) setHistoryData(data);
        setLoading(false);
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('products')
                    .update({
                        name: productForm.name,
                        category: productForm.category,
                        price: parseFloat(productForm.price),
                        purchase_price: parseFloat(productForm.purchase_price),
                        description: productForm.description,
                        presentation: productForm.presentation
                    })
                    .eq('id', productForm.id);
                if (error) throw error;

                // Audit Log
                await supabase.from('audit_logs').insert([{
                    user_role: user?.role || 'Sistema',
                    event_type: 'Edición Producto',
                    description: `Se modificó el producto: ${productForm.name}`,
                    metadata: { product_id: productForm.id, changes: productForm }
                }]);

                alert("Producto actualizado.");
            } else {
                // 1. Crear Producto
                const { data: product, error: pError } = await supabase
                    .from('products')
                    .insert([productForm])
                    .select()
                    .single();

                if (pError) throw pError;

                // 2. Inicializar Stock en todos los almacenes
                const stockInitial = warehouses.map(wh => ({
                    product_id: product.id,
                    warehouse_id: wh.id,
                    quantity: 0
                }));
                await supabase.from('stock').insert(stockInitial);

                // Audit Log
                await supabase.from('audit_logs').insert([{
                    user_role: user?.role || 'Sistema',
                    event_type: 'Alta Producto',
                    description: `Se creó el nuevo producto: ${productForm.name}`,
                    metadata: { product_id: product.id, initial_form: productForm }
                }]);

                alert("Producto creado exitosamente.");
            }

            setShowProductModal(false);
            setProductForm(initialProductForm);
            fetchStock(selectedWarehouse.id);
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const handleDeleteProduct = async (id, name) => {
        if (user?.role?.toLowerCase() !== 'master') return alert("Solo el perfil Master puede eliminar productos.");
        if (!window.confirm(`¿Seguro que deseas eliminar permanentemente el producto "${name}"? Se borrará todo su historial.`)) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Eliminación Producto',
                description: `Se eliminó permanentemente el producto: ${name}`,
                metadata: { product_id: id }
            }]);

            alert("Producto eliminado.");
            fetchStock(selectedWarehouse.id);
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    };

    const openEdit = (product) => {
        setIsEditing(true);
        setProductForm(product);
        setShowProductModal(true);
    };

    const handleResupply = async (e) => {
        e.preventDefault();
        try {
            const adjustment = parseInt(resupplyForm.qty);
            const newQty = (selectedItem.quantity || 0) + adjustment;

            // 1. Actualizar Stock
            const { error: sError } = await supabase
                .from('stock')
                .update({ quantity: newQty })
                .eq('id', selectedItem.id);

            if (sError) throw sError;

            // 2. Registrar Movimiento
            await supabase.from('stock_movements').insert([{
                product_id: selectedItem.product_id,
                from_warehouse_id: selectedWarehouse.id,
                quantity: adjustment,
                movement_type: adjustment > 0 ? 'resurtido' : 'ajuste',
                description: resupplyForm.description
            }]);

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: adjustment > 0 ? 'Resurtido / Entrada' : 'Ajuste / Merma',
                description: `${adjustment > 0 ? 'Entrada' : 'Salida'} de ${Math.abs(adjustment)} unidades de ${selectedItem.products.name} en ${selectedWarehouse.name}. Motivo: ${resupplyForm.description}`,
                metadata: { product_id: selectedItem.product_id, qty: adjustment, warehouse: selectedWarehouse.name }
            }]);

            alert("Stock actualizado exitosamente.");
            setShowResupply(false);
            setResupplyForm({ qty: 0, description: '' });
            fetchStock(selectedWarehouse.id);
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const filteredStock = stock.filter(s =>
        s.products.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '0px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1>Inventarios 📦</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gestión avanzada de productos y auditoría de utilidad</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-premium btn-secondary" onClick={() => { setIsEditing(false); setProductForm(initialProductForm); setShowProductModal(true); }}><Plus size={18} /> Nuevo Producto</button>
                    <button className="btn-premium btn-primary" onClick={fetchHistory}><ClipboardList size={18} /> Auditoría de Movimientos</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {warehouses.map(wh => (
                    <motion.div
                        key={wh.id}
                        whileHover={{ y: -5 }}
                        onClick={() => { setSelectedWarehouse(wh); fetchStock(wh.id); }}
                        className="glass-card"
                        style={{
                            padding: '20px',
                            cursor: 'pointer',
                            border: selectedWarehouse?.id === wh.id ? '2px solid var(--primary)' : '1px solid #eee',
                            background: selectedWarehouse?.id === wh.id ? 'rgba(197, 160, 89, 0.05)' : 'white'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ padding: '10px', background: 'var(--primary)15', borderRadius: '12px' }}><Store size={24} color="var(--primary)" /></div>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>ALMACÉN</p>
                                <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>{wh.name}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="glass-card" style={{ padding: '25px', minHeight: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h3>Existencias en {selectedWarehouse?.name}</h3>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#999' }} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {filteredStock.map(item => {
                        const utility = item.products.price - (item.products.purchase_price || 0);
                        const utilityPercent = item.products.purchase_price > 0 ? ((utility / item.products.purchase_price) * 100).toFixed(0) : 0;

                        return (
                            <div key={item.id} className="glass-card" style={{ padding: '20px', background: '#fcfcfc', border: '1px solid #eee', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{item.products.name}</p>
                                            <button onClick={() => openEdit(item.products)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}><Edit3 size={14} /></button>
                                            {user?.role?.toLowerCase() === 'master' && (
                                                <button onClick={() => handleDeleteProduct(item.products.id, item.products.name)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '8px' }}>{item.products.category} • {item.products.presentation || 'S/P'}</p>

                                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                            <div>
                                                <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#999' }}>COSTO</p>
                                                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>${item.products.purchase_price || '0'}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#999' }}>VENTA</p>
                                                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>${item.products.price}</p>
                                            </div>
                                            <div style={{ background: 'var(--primary)11', padding: '4px 8px', borderRadius: '8px' }}>
                                                <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)' }}>UTILIDAD</p>
                                                <p style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>${utility} <span style={{ fontSize: '0.7rem' }}>({utilityPercent}%)</span></p>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                        <p style={{ fontSize: '2rem', fontWeight: 900, color: item.quantity <= 10 ? '#ef4444' : 'var(--secondary)', lineHeight: 1 }}>{item.quantity}</p>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 700, margin: 0 }}>STOCK</p>
                                    </div>
                                </div>
                                <div style={{ marginTop: '15px' }}>
                                    <button
                                        onClick={() => { setSelectedItem(item); setShowResupply(true); }}
                                        className="btn-premium btn-secondary"
                                        style={{ width: '100%', padding: '10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <ArrowUp size={14} /> AJUSTAR / RESURTIR STOCK
                                    </button>
                                </div>
                                {item.quantity <= 10 && (
                                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', padding: '2px 8px', fontSize: '0.6rem', fontWeight: 900, borderRadius: '0 12px 0 12px' }}>
                                        STOCK BAJO
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL: PRODUCTO (NUEVO/EDITAR) */}
            <AnimatePresence>
                {showProductModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowProductModal(false)}>
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="glass-card" style={{ background: 'white', padding: '30px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
                                <h2>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                                <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>
                            <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>NOMBRE DEL PRODUCTO</label>
                                    <input required placeholder="Ej. Modelo Especial 355ml" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>CATEGORÍA</label>
                                    <select value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px' }}>
                                        <option>Cerveza</option><option>Refresco</option><option>Agua</option><option>Tequila</option><option>Mezcal</option><option>Hielo</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>PRESENTACIÓN</label>
                                    <input placeholder="Ej. Latón 473ml" value={productForm.presentation || ''} onChange={e => setProductForm({ ...productForm, presentation: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>PRECIO DE COMPRA ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00" value={productForm.purchase_price} onChange={e => setProductForm({ ...productForm, purchase_price: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>PRECIO DE VENTA ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px' }} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>DESCRIPCIÓN</label>
                                    <textarea rows="3" placeholder="Detalles adicionales..." value={productForm.description || ''} onChange={e => setProductForm({ ...productForm, description: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginTop: '5px', resize: 'none' }} />
                                </div>
                                <button type="submit" className="btn-premium btn-primary" style={{ gridColumn: 'span 2', height: '50px', marginTop: '10px' }}>
                                    {isEditing ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL: RESURTIDO / AJUSTE */}
                {showResupply && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="glass-card" style={{ background: 'white', padding: '30px', width: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2>Ajustar Existencias</h2>
                                <button onClick={() => setShowResupply(false)} style={{ background: 'none', border: 'none' }}><X /></button>
                            </div>
                            <div style={{ background: 'var(--primary)08', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                                <p style={{ fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{selectedItem?.products.name}</p>
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>Stock actual: {selectedItem?.quantity} unidades</p>
                            </div>
                            <form onSubmit={handleResupply} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>CANTIDAD A SUMAR O RESTAR (X)</label>
                                    <input required type="number" value={resupplyForm.qty} onChange={e => setResupplyForm({ ...resupplyForm, qty: e.target.value })} style={{ width: '100%', padding: '12px', marginTop: '5px', fontSize: '1.2rem', fontWeight: 900, textAlign: 'center', borderRadius: '10px', border: '2px solid #eee' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>MOTIVO DEL MOVIMIENTO</label>
                                    <input required placeholder="Ej. Compra a proveedor, Merma, etc." value={resupplyForm.description} onChange={e => setResupplyForm({ ...resupplyForm, description: e.target.value })} style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                </div>
                                <button type="submit" className="btn-premium btn-primary" style={{ height: '50px' }}>REGISTRAR AUDITORÍA</button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {/* MODAL: HISTORIAL DE AUDITORÍA */}
                {showHistory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }} onClick={() => setShowHistory(false)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="glass-card" style={{ background: 'white', padding: '30px', width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History color="var(--primary)" /> Auditoría de Movimientos</h2>
                                    <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>Registro cronológico de entradas y ajustes de inventario</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                            <th style={{ padding: '15px' }}>Fecha</th>
                                            <th>Producto</th>
                                            <th>Almacén</th>
                                            <th>Cantidad</th>
                                            <th>Tipo</th>
                                            <th>Descripción / Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyData.map((h, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f9f9f9', fontSize: '0.85rem' }}>
                                                <td style={{ padding: '15px 12px', whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleString()}</td>
                                                <td style={{ fontWeight: 800 }}>{h.products?.name}</td>
                                                <td><span style={{ padding: '4px 8px', background: '#f5f5f5', borderRadius: '6px' }}>{h.warehouse?.name}</span></td>
                                                <td style={{ fontWeight: 900, color: h.quantity > 0 ? '#22c55e' : '#ef4444' }}>{h.quantity > 0 ? '+' : ''}{h.quantity}</td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.65rem', padding: '4px 8px', borderRadius: '10px',
                                                        background: h.movement_type === 'resurtido' ? '#dcfce7' : '#fef9c3',
                                                        color: h.movement_type === 'resurtido' ? '#15803d' : '#a16207',
                                                        fontWeight: 800
                                                    }}>
                                                        {h.movement_type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#666', fontSize: '0.8rem' }}>{h.description || 'Sin motivo registrado'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Inventory;
