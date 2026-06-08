import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

// Evento de instalación PWA
let deferredPrompt: any = null;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [installable, setInstallable] = useState(false);

  // Recuperación de contraseña
  const [forgotStep, setForgotStep] = useState<'login' | 'email' | 'code' | 'done'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallable(false);
    }
    deferredPrompt = null;
  }

  // ─── Recuperación de contraseña ───

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMsg(data.message || 'Código enviado');
      if (data.code) {
        setForgotMsg(`Código enviado: ${data.code}`);
      }
      setForgotStep('code');
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Error al solicitar código');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      setForgotError('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setForgotError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        code: forgotCode,
        newPassword,
      });
      setForgotStep('done');
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  }

  function resetForgotFlow() {
    setForgotStep('login');
    setForgotEmail('');
    setForgotCode('');
    setNewPassword('');
    setForgotMsg('');
    setForgotError('');
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-surface rounded-xl shadow-lg border border-border">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="PPAM Costa" className="w-24 h-24 mb-4 rounded-xl shadow-md inline-block" />
          <h1 className="text-2xl font-bold text-primary">PPAM Costa</h1>
          <p className="text-text-secondary mt-2">
            Predicación Pública Áreas Metropolitanas
          </p>
        </div>

        {/* ─── Recuperación de contraseña: paso 1 - email ─── */}
        {forgotStep === 'email' && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={resetForgotFlow} className="p-1 rounded hover:bg-surface-hover text-text-muted">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-semibold text-text-primary">Recuperar contraseña</h2>
            </div>
            <p className="text-sm text-text-secondary">Ingresa tu correo y te enviaremos un código de verificación.</p>

            {forgotError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-danger text-sm border border-red-200 dark:border-red-800">{forgotError}</div>}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Correo electrónico</label>
              <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="usuario@ppam.org" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-light disabled:opacity-50 transition-colors">
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        )}

        {/* ─── Recuperación de contraseña: paso 2 - código + nueva contraseña ─── */}
        {forgotStep === 'code' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={resetForgotFlow} className="p-1 rounded hover:bg-surface-hover text-text-muted">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-semibold text-text-primary">Nueva contraseña</h2>
            </div>

            {forgotMsg && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-success text-sm border border-green-200 dark:border-green-800">{forgotMsg}</div>}
            {forgotError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-danger text-sm border border-red-200 dark:border-red-800">{forgotError}</div>}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Código de verificación</label>
              <input type="text" value={forgotCode} onChange={(e) => setForgotCode(e.target.value)} required maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-2xl tracking-widest" placeholder="000000" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Mínimo 4 caracteres" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-light disabled:opacity-50 transition-colors">
              {loading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}

        {/* ─── Recuperación: éxito ─── */}
        {forgotStep === 'done' && (
          <div className="space-y-5 text-center">
            <CheckCircle2 size={48} className="mx-auto text-success" />
            <h2 className="text-lg font-semibold text-text-primary">¡Contraseña actualizada!</h2>
            <p className="text-sm text-text-secondary">Tu contraseña ha sido cambiada correctamente.</p>
            <button onClick={resetForgotFlow}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors">
              Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* ─── Login normal ─── */}
        {forgotStep === 'login' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-danger text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         placeholder:text-text-muted"
              placeholder="usuario@ppam.org"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         placeholder:text-text-muted"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium
                       hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>

          <p className="text-center">
            <button
              type="button"
              onClick={() => { setForgotStep('email'); setError(''); }}
              className="text-sm text-primary hover:text-primary-light transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        </form>
        )}

        <p className="text-center text-text-muted text-xs mt-6">
          Todos los derechos reservados. PPAM Costa © 2026
        </p>

        {installable && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors"
            >
              <Download size={16} />
              Instalar app
            </button>
            <p className="text-text-muted text-xs mt-1">Agrega PPAM Costa a tu pantalla de inicio</p>
          </div>
        )}
        <p className="text-center text-text-muted text-xs mt-4">
          📱 También puedes instalar esta página como app desde el menú del navegador
        </p>
      </div>
    </div>
  );
}
