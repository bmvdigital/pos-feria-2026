import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Search, Trash2, Filter,
    Calendar, User, Activity, AlertCircle,
    Download, Loader2, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const Audit = ({ user }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('Todos');

    // Permissions check
    const isAuthorized = user?.role?.toLowerCase() === 'master' || user?.role?.toLowerCase() === 'administrador';
    const isMaster = user?.role?.toLowerCase() === 'master';

    useEffect(() => {
        if (isAuthorized) {
            fetchLogs();
        }
    }, [isAuthorized]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error(error);
            alert("Error al cargar el historial de auditoría");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLog = async (id) => {
        if (!isMaster) return alert("Solo el perfil Master puede eliminar registros de auditoría.");
        if (!window.confirm("¿Seguro que deseas eliminar este registro? Esta acción es irreversible.")) return;

        try {
            const { error } = await supabase
                .from('audit_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setLogs(logs.filter(l => l.id !== id));
        } catch (error) {
            alert("Error al eliminar el registro.");
        }
    };

    const getEventColor = (type) => {
        const t = type.toLowerCase();
        if (t.includes('venta') || t.includes('completada')) return '#22c55e';
        if (t.includes('cancel') || t.includes('elimin')) return '#ef4444';
        if (t.includes('abono') || t.includes('pago')) return '#3b82f6';
        if (t.includes('inventario') || t.includes('stock')) return '#f59e0b';
        if (t.includes('pedido')) return '#8b5cf6';
        return '#64748b';
    };

    const filteredLogs = logs.filter(l => {
        const matchesSearch = l.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.event_type?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'Todos' || l.event_type === filterType;
        return matchesSearch && matchesType;
    });

    const eventTypes = ['Todos', ...new Set(logs.map(l => l.event_type))];

    if (!isAuthorized) {
        return (
            <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ padding: '30px', background: '#fee2e2', borderRadius: '50%', marginBottom: '20px' }}>
                    <ShieldCheck size={60} color="#ef4444" />
                </div>
                <h1 style={{ color: '#ef4444' }}>Acceso Restringido</h1>
                <p style={{ maxWidth: '400px', color: '#666' }}>Este módulo contiene información sensible de auditoría. Solo perfiles Master o Administrador tienen autorización.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShieldCheck size={32} color="var(--primary)" /> Centro de Auditoría
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Historial inalterable de operaciones y eventos del sistema</p>
                </div>
                <button onClick={fetchLogs} className="btn-premium btn-secondary">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Actualizar
                </button>
            </header>

            <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '12px', color: '#999' }} size={18} />
                        <input
                            placeholder="Buscar en la descripción o tipo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Filter size={18} color="#999" />
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', minWidth: '200px' }}
                        >
                            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#999', fontSize: '0.8rem' }}>
                                <th style={{ padding: '10px 15px' }}>FECHA Y HORA</th>
                                <th>USUARIO</th>
                                <th>EVENTO</th>
                                <th>DESCRIPCIÓN</th>
                                <th style={{ textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px' }}>
                                        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                                    </td>
                                </tr>
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <motion.tr
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{ background: '#fcfcfc', borderBottom: '1px solid #eee' }}
                                    >
                                        <td style={{ padding: '15px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={14} color="#999" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)20', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                                    {log.user_role[0]}
                                                </div>
                                                <span style={{ fontWeight: 700 }}>{log.user_role}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px',
                                                background: `${getEventColor(log.event_type)}15`,
                                                color: getEventColor(log.event_type),
                                                fontWeight: 900,
                                                border: `1px solid ${getEventColor(log.event_type)}30`
                                            }}>
                                                {log.event_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ color: '#555', fontSize: '0.85rem', maxWidth: '400px' }}>
                                            {log.description}
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                            {isMaster && (
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', transition: '0.2s' }}
                                                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseOut={e => e.currentTarget.style.color = '#ccc'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: '#ccc' }}>
                                        <AlertCircle size={40} style={{ margin: '0 auto 10px' }} />
                                        <p>No se encontraron registros de auditoría</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Audit;
