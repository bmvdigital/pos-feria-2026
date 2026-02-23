import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, DollarSign, User, Eye, EyeOff, LogIn } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Perfiles definidos por el usuario
    const PROFILES = {
        'Master': 'master2026',
        'Administrador': 'admin2026',
        'Vendedor': 'ventas2026',
        'Promotor': 'promo2026'
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        setTimeout(() => {
            // Simulación de validación
            if (PROFILES[username] && PROFILES[username] === password) {
                onLogin({ name: username, role: username.toUpperCase() });
            } else {
                setError('Credenciales incorrectas. Intenta de nuevo.');
                setIsLoading(false);
            }
        }, 1000);
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a192f 0%, #001f3f 100%)',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 2000
        }}>
            {/* Elementos decorativos de fondo */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)', opacity: 0.15 }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, var(--secondary) 0%, transparent 70%)', opacity: 0.1 }}></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '40px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div style={{
                    width: '100px',
                    height: '100px',
                    background: 'var(--primary)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 10px 25px rgba(197, 160, 89, 0.4)',
                    position: 'relative'
                }}>
                    <Shield size={60} color="white" />
                    <DollarSign
                        size={28}
                        color="var(--primary)"
                        style={{
                            position: 'absolute',
                            background: 'white',
                            borderRadius: '50%',
                            padding: '4px'
                        }}
                    />
                </div>

                <h1 style={{ color: 'white', marginBottom: '8px', fontSize: '1.8rem' }}>Secure Sales</h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '0.9rem' }}>Feria Tabasco: Seguridad y Control</p>

                <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'white', fontSize: '0.75rem', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Perfil de Usuario</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'rgba(255, 255, 255, 0.4)' }} />
                            <select
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 45px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    outline: 'none',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled style={{ background: '#0a192f' }}>Selecciona tu cargo...</option>
                                <option value="Master" style={{ background: '#0a192f' }}>Master</option>
                                <option value="Administrador" style={{ background: '#0a192f' }}>Administrador</option>
                                <option value="Vendedor" style={{ background: '#0a192f' }}>Vendedor</option>
                                <option value="Promotor" style={{ background: '#0a192f' }}>Promotor</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: 'white', fontSize: '0.75rem', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Shield size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'rgba(255, 255, 255, 0.4)' }} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '12px 45px 12px 45px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ color: '#ff4b2b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '20px', textAlign: 'center' }}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-premium btn-primary"
                        style={{
                            width: '100%',
                            height: '50px',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        {isLoading ? (
                            <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        ) : (
                            <><LogIn size={20} /> Entrar al Sistema</>
                        )}
                    </button>
                </form>

                <p style={{ marginTop: '32px', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Powered by AntiGravity • Feria 2026
                </p>
            </motion.div>

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default Login;
