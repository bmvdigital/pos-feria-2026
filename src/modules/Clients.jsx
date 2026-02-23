import React, { useState, useEffect } from 'react';
import {
    Users, Search, Phone, MapPin, Plus, X, Store,
    DollarSign, History, AlertCircle, Loader2, CheckCircle2,
    Calendar, CreditCard, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const Clients = ({ user }) => {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [showRegister, setShowRegister] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modal Abonos
    const [showAbonoModal, setShowAbonoModal] = useState(false);
    const [abonoAmount, setAbonoAmount] = useState('');
    const [abonoProcessing, setAbonoProcessing] = useState(false);

    // Modal Historial
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [clientHistory, setClientHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [newClient, setNewClient] = useState({
        name: '', zone: 'Teatro al A. L.', business_type: '', phone: '', contact_name: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true });
        if (!error) setClients(data);
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.from('clients').insert([newClient]).select().single();
        if (!error) {
            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Alta de Cliente',
                description: `Nuevo cliente registrado: ${newClient.name} (${newClient.zone})`,
                metadata: { client_id: data.id, client_name: data.name }
            }]);

            setClients([data, ...clients]);
            setShowRegister(false);
            setNewClient({ name: '', zone: 'Teatro al A. L.', business_type: '', phone: '', contact_name: '' });
            setSelectedClient(data);
            alert("Cliente registrado exitosamente.");
        } else {
            alert("Error al registrar: " + error.message);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!abonoAmount || parseFloat(abonoAmount) <= 0) return alert("Ingresa un monto válido.");

        setAbonoProcessing(true);
        try {
            const amount = parseFloat(abonoAmount);
            const { error } = await supabase.from('client_payments').insert([{
                client_id: selectedClient.id,
                amount: amount,
                payment_method: 'efectivo',
                notes: 'Abono manual desde módulo clientes'
            }]);

            if (error) throw error;

            // Audit Log
            await supabase.from('audit_logs').insert([{
                user_role: user?.role || 'Sistema',
                event_type: 'Abono de Cliente',
                description: `Abono de $${amount} recibido de ${selectedClient.name}`,
                metadata: { client_id: selectedClient.id, amount: amount }
            }]);

            alert(`Abono de $${amount} registrado con éxito.`);
            setShowAbonoModal(false);
            setAbonoAmount('');
            // Refrescar datos del cliente
            const { data: updatedClient } = await supabase.from('clients').select('*').eq('id', selectedClient.id).single();
            if (updatedClient) {
                setSelectedClient(updatedClient);
                setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
            }
        } catch (error) {
            alert("Error al registrar abono: " + error.message);
        } finally {
            setAbonoProcessing(false);
        }
    };

    const fetchHistory = async () => {
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            // Unir Ventas a Crédito y Abonos para ver el balance histórico
            const { data: sales } = await supabase
                .from('sales')
                .select('created_at, total_amount, payment_method')
                .eq('client_id', selectedClient.id)
                .eq('payment_method', 'credito')
                .order('created_at', { ascending: false });

            const { data: payments } = await supabase
                .from('client_payments')
                .select('created_at, amount, notes')
                .eq('client_id', selectedClient.id)
                .order('created_at', { ascending: false });

            // Combinar y ordenar
            const history = [
                ...(sales || []).map(s => ({ ...s, type: 'CARGO', amount: s.total_amount })),
                ...(payments || []).map(p => ({ ...p, type: 'ABONO', amount: p.amount, description: p.notes }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setClientHistory(history);
        } catch (error) {
            console.error(error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.zone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

    return (
        <div className="clients-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>

            {/* Sidebar: Lista de Clientes */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                            <Users size={24} color="var(--primary)" /> Directorio
                        </h2>
                        <button
                            className="btn-premium btn-primary"
                            style={{ padding: '8px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
                            onClick={() => setShowRegister(true)}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#999' }} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o zona..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                borderRadius: '10px',
                                border: '1px solid #ddd',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div className="mobile-scroll-list" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {filteredClients.map(client => (
                        <motion.div
                            key={client.id}
                            whileHover={{ x: 5 }}
                            onClick={() => setSelectedClient(client)}
                            style={{
                                padding: '15px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                marginBottom: '8px',
                                background: selectedClient?.id === client.id ? 'rgba(197, 160, 89, 0.1)' : 'transparent',
                                border: selectedClient?.id === client.id ? '1px solid var(--primary)' : '1px solid transparent'
                            }}
                        >
                            <p style={{ fontWeight: 700, margin: 0 }}>{client.name}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{client.zone}</span>
                                {client.credits_count >= 2 ? (
                                    <span style={{ fontSize: '0.6rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>BLOQUEADO</span>
                                ) : (
                                    <span style={{ fontSize: '0.6rem', background: '#dcfce7', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ACTIVO</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Detalle del Cliente */}
            <div className="glass-card" style={{ padding: '30px', overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                    {selectedClient ? (
                        <motion.div
                            key={selectedClient.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                                <div>
                                    <h1 style={{ fontSize: '2.5rem', marginBottom: '5px', lineHeight: 1 }}>{selectedClient.name}</h1>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        <MapPin size={16} /> {selectedClient.zone} • <Store size={16} /> {selectedClient.business_type}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>SALDO PENDIENTE</p>
                                    <p style={{ fontSize: '3rem', fontWeight: 900, color: parseFloat(selectedClient.balance) > 0 ? '#ef4444' : 'var(--success)' }}>
                                        ${parseFloat(selectedClient.balance).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                <div className="glass-card" style={{ padding: '20px', background: '#f8f9fa', border: 'none' }}>
                                    <h3 style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>INFORMACIÓN DE CONTACTO</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: 700 }}>
                                            <Users size={18} color="var(--primary)" /> {selectedClient.contact_name}
                                        </p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: 700 }}>
                                            <Phone size={18} color="var(--primary)" /> {selectedClient.phone}
                                        </p>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '20px', background: selectedClient.credits_count >= 2 ? '#fff1f2' : '#f0fdf4', border: 'none' }}>
                                    <h3 style={{ marginBottom: '15px', fontSize: '0.9rem', color: selectedClient.credits_count >= 2 ? '#be123c' : '#15803d' }}>
                                        ESTADO DE CRÉDITO: {selectedClient.credits_count >= 2 ? 'LÍMITE' : 'OK'}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ flex: 1, height: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(selectedClient.credits_count / 2) * 100}%`,
                                                height: '100%',
                                                background: selectedClient.credits_count >= 2 ? '#ef4444' : 'var(--primary)'
                                            }} />
                                        </div>
                                        <span style={{ fontWeight: 900 }}>{selectedClient.credits_count}/2</span>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', marginTop: '10px', fontWeight: 600 }}>
                                        {selectedClient.credits_count >= 2
                                            ? '🚨 CLIENTE BLOQUEADO: Debe liquidar saldos anteriories.'
                                            : `Permitido: ${2 - selectedClient.credits_count} compras a crédito.`}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button
                                    onClick={() => setShowAbonoModal(true)}
                                    className="btn-premium btn-primary"
                                    style={{ flex: 1, height: '50px' }}
                                    disabled={parseFloat(selectedClient.balance) <= 0}
                                >
                                    <DollarSign size={20} /> REGISTRAR ABONO
                                </button>
                                <button
                                    onClick={fetchHistory}
                                    className="btn-premium btn-secondary"
                                    style={{ flex: 1, height: '50px' }}
                                >
                                    <History size={20} /> ESTADO DE CUENTA
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ddd' }}>
                            <Users size={100} strokeWidth={1} />
                            <h2 style={{ color: '#ccc', marginTop: '20px' }}>Directorio de Clientes</h2>
                            <p>Selecciona un negocio para gestionar su cuenta o usa el botón (+) para registrar uno nuevo.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* MODAL REGISTRO CLIENTE */}
            <AnimatePresence>
                {showRegister && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowRegister(false)}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="glass-card" style={{ background: 'white', width: '100%', maxWidth: '500px', padding: '35px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h2>Registrar Nuevo Cliente</h2>
                                <button onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>
                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <input required placeholder="Nombre del Negocio" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                <select value={newClient.zone} onChange={e => setNewClient({ ...newClient, zone: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}>
                                    <option>Teatro al A. L.</option><option>Zona VIP</option><option>Explanada</option><option>Juegos</option>
                                </select>
                                <input required placeholder="Giro" value={newClient.business_type} onChange={e => setNewClient({ ...newClient, business_type: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                <input required placeholder="Contacto" value={newClient.contact_name} onChange={e => setNewClient({ ...newClient, contact_name: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                <input required placeholder="Teléfono" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                <button type="submit" className="btn-premium btn-primary" style={{ height: '50px' }}>ACEPTAR Y REGISTRAR</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL ABONO */}
            <AnimatePresence>
                {showAbonoModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAbonoModal(false)}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="glass-card" style={{ background: 'white', width: '100%', maxWidth: '400px', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2>Registrar Abono</h2>
                                <button onClick={() => setShowAbonoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>
                            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#999', margin: 0 }}>SALDO ACTUAL</p>
                                <p style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>${parseFloat(selectedClient.balance).toLocaleString()}</p>
                            </div>
                            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#666' }}>CANTIDAD A ABONAR ($)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={abonoAmount}
                                        onChange={e => setAbonoAmount(e.target.value)}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid var(--primary)', fontSize: '1.5rem', fontWeight: 900, textAlign: 'center', marginTop: '10px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setAbonoAmount(selectedClient.balance)}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', marginTop: '5px', textDecoration: 'underline' }}
                                    >
                                        Liquidar Saldo Total
                                    </button>
                                </div>
                                <button type="submit" className="btn-premium btn-primary" style={{ height: '55px' }} disabled={abonoProcessing}>
                                    {abonoProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> CONFIRMAR PAGO</>}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL HISTORIAL / ESTADO DE CUENTA */}
            <AnimatePresence>
                {showHistoryModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }} onClick={() => setShowHistoryModal(false)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} onClick={e => e.stopPropagation()} className="glass-card" style={{ background: 'white', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History color="var(--primary)" /> Estado de Cuenta: {selectedClient.name}</h2>
                                    <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>Historial de compras a crédito y abonos realizados</p>
                                </div>
                                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
                                {historyLoading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {clientHistory.length > 0 ? (
                                            clientHistory.map((item, idx) => (
                                                <div key={idx} style={{
                                                    padding: '20px',
                                                    background: item.type === 'ABONO' ? '#f0fdf4' : '#fff1f2',
                                                    borderRadius: '15px',
                                                    border: `1px solid ${item.type === 'ABONO' ? '#dcfce7' : '#fee2e2'}`,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                        <div style={{
                                                            padding: '10px',
                                                            background: item.type === 'ABONO' ? '#22c55e20' : '#ef444420',
                                                            borderRadius: '12px',
                                                            color: item.type === 'ABONO' ? '#22c55e' : '#ef4444'
                                                        }}>
                                                            {item.type === 'ABONO' ? <DollarSign size={20} /> : <Receipt size={20} />}
                                                        </div>
                                                        <div>
                                                            <p style={{ fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>
                                                                {item.type === 'ABONO' ? 'ABONO RECIBIDO' : 'VENTA A CRÉDITO'}
                                                            </p>
                                                            <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                                                                <Calendar size={12} /> {new Date(item.created_at).toLocaleString()}
                                                            </p>
                                                            {item.description && <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>{item.description}</p>}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{
                                                            fontWeight: 900,
                                                            fontSize: '1.2rem',
                                                            color: item.type === 'ABONO' ? '#22c55e' : '#ef4444'
                                                        }}>
                                                            {item.type === 'ABONO' ? '-' : '+'}${item.amount.toLocaleString()}
                                                        </p>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.6 }}>
                                                            {item.type === 'ABONO' ? 'REDUCCIÓN SALDO' : 'INCREMENTO DEUDA'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
                                                <AlertCircle size={60} strokeWidth={1} style={{ marginBottom: '15px' }} />
                                                <p>Sin movimientos registrados en esta cuenta.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '25px', background: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#999', margin: 0 }}>BALANCE TOTAL POR LIQUIDAR</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>${parseFloat(selectedClient.balance).toLocaleString()}</p>
                                </div>
                                <button onClick={() => { setShowHistoryModal(false); setShowAbonoModal(true); }} className="btn-premium btn-primary" disabled={parseFloat(selectedClient.balance) <= 0}>
                                    <CheckCircle2 size={18} /> ABONAR A LA CUENTA
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Clients;
