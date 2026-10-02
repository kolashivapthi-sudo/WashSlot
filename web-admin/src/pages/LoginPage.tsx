import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, initialize, isLoading, error, user, clearError, isInitialized } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Initialize auth on mount (check saved token)
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isInitialized && user) {
      navigate('/', { replace: true });
    }
  }, [isInitialized, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  if (!isInitialized) {
    return (
      <div style={styles.splash}>
        <span style={styles.splashIcon}>🧺</span>
        <p style={{ color: '#666', marginTop: 12 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoBox}>
            <span style={{ fontSize: 24 }}>🧺</span>
          </div>
          <h1 style={styles.title}>WashSlot</h1>
          <p style={styles.subtitle}>Admin Dashboard</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={styles.errorBanner}>
            <span style={{ marginRight: 8 }}>⚠️</span>
            {error}
            <button style={styles.errorClose} onClick={clearError}>×</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.fieldGroup, marginBottom: 24 }}>
            <label style={styles.label} htmlFor="password">Password</label>
            <div style={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ ...styles.input, paddingRight: 44 }}
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            style={{
              ...styles.submitBtn,
              opacity: isLoading || !email || !password ? 0.6 : 1,
              cursor: isLoading ? 'wait' : 'pointer',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f4f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  } as React.CSSProperties,

  splash: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  splashIcon: {
    fontSize: 48,
  } as React.CSSProperties,

  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: 32,
  } as React.CSSProperties,

  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#2D6A4F',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  } as React.CSSProperties,

  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 4px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: 14,
    color: '#666',
    margin: 0,
  } as React.CSSProperties,

  errorBanner: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    marginBottom: 20,
  } as React.CSSProperties,

  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#DC2626',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  } as React.CSSProperties,

  fieldGroup: {
    marginBottom: 16,
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px solid #E5E7EB',
    fontSize: 14,
    color: '#1a1a2e',
    background: '#F9FAFB',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,

  passwordWrapper: {
    position: 'relative' as const,
  } as React.CSSProperties,

  eyeBtn: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
  } as React.CSSProperties,

  submitBtn: {
    width: '100%',
    padding: '12px',
    background: '#2D6A4F',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  } as React.CSSProperties,
};
