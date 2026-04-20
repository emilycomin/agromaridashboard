import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import './AuthPage.css';

const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

const FIREBASE_ERRORS = {
  'auth/user-not-found':       'E-mail não cadastrado.',
  'auth/wrong-password':       'Senha incorreta.',
  'auth/invalid-credential':   'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password':        'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email':        'E-mail inválido.',
  'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos.',
};

function translateError(code) {
  return FIREBASE_ERRORS[code] || 'Ocorreu um erro. Tente novamente.';
}

export default function AuthPage({ onSelectRole, onBack }) {
  const [view,            setView]            = useState('login');   // 'login' | 'register' | 'forgot'
  const [loginMethod,     setLoginMethod]     = useState('password'); // 'password' | 'emaillink'
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [successMsg,      setSuccessMsg]      = useState(null);

  function resetForm() {
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  }

  function goTo(v) {
    resetForm();
    setSuccessMsg(null);
    setLoginMethod('password');
    setView(v);
  }

  function switchMethod(method) {
    setError(null);
    setSuccessMsg(null);
    setLoginMethod(method);
  }

  // ── Google OAuth (mantém acesso ao Calendar) ─────────────────────────────────
  const loginWithGoogle = useGoogleLogin({
    scope: GCAL_SCOPE,
    onSuccess: (tokenResponse) => {
      setLoading(false);
      onSelectRole('social-media', tokenResponse.access_token);
    },
    onError: () => {
      setLoading(false);
      setError('Login com Google falhou. Tente novamente.');
    },
    onNonOAuthError: () => {
      setLoading(false);
      setError('Login cancelado.');
    },
  });

  // ── Login com e-mail/senha ────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSelectRole('social-media', null);
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── Cadastro ──────────────────────────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) await updateProfile(user, { displayName: name.trim() });
      onSelectRole('social-media', null);
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── Recuperar senha ───────────────────────────────────────────────────────────
  async function handleForgot(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Link enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── Enviar link de acesso por e-mail ─────────────────────────────────────────
  async function handleEmailLink(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem('emailForSignIn', email);
      setSuccessMsg(`Link enviado para ${email}. Verifique sua caixa de entrada e clique no link para entrar.`);
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  }

  // ── Shared UI helpers ─────────────────────────────────────────────────────────
  const inputField = ({ label, type, value, onChange, placeholder, autoComplete, rightEl }) => (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <input
          className="auth-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        {rightEl}
      </div>
    </div>
  );

  const eyeToggle = (
    <button type="button" className="auth-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
      {showPassword ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="auth-page">
      {/* ── Painel esquerdo ── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand">Flow<span>ly</span></div>
          <h2 className="auth-left-title">
            Gerencie conteúdo.<br />Encante clientes.
          </h2>
          <p className="auth-left-sub">
            Planeje, aprove e publique com sua equipe — tudo em um painel centralizado.
          </p>
          <ul className="auth-left-features">
            <li><span className="auth-feat-icon">📅</span> Calendário editorial colaborativo</li>
            <li><span className="auth-feat-icon">✅</span> Fluxo de aprovação com clientes</li>
            <li><span className="auth-feat-icon">📊</span> Analytics e KPIs em tempo real</li>
            <li><span className="auth-feat-icon">🔗</span> Integração com Google Calendar</li>
          </ul>
        </div>
      </div>

      {/* ── Painel direito (formulários) ── */}
      <div className="auth-right">
        <div className="auth-card">

          {/* Logo mobile */}
          <div className="auth-mobile-brand">Flow<span>ly</span></div>

          {/* ──────────── LOGIN ──────────── */}
          {view === 'login' && (
            <>
              <h1 className="auth-title">Bem-vindo de volta</h1>
              <p className="auth-sub">Entre na sua conta para continuar</p>

              {/* Toggle senha / link */}
              <div className="auth-method-toggle">
                <button
                  type="button"
                  className={`auth-method-btn ${loginMethod === 'password' ? 'active' : ''}`}
                  onClick={() => switchMethod('password')}
                >
                  Senha
                </button>
                <button
                  type="button"
                  className={`auth-method-btn ${loginMethod === 'emaillink' ? 'active' : ''}`}
                  onClick={() => switchMethod('emaillink')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Link por e-mail
                </button>
              </div>

              {/* ── Formulário: senha ── */}
              {loginMethod === 'password' && (
                <form onSubmit={handleLogin} noValidate>
                  {inputField({
                    label: 'E-mail',
                    type: 'email',
                    value: email,
                    onChange: setEmail,
                    placeholder: 'seu@email.com',
                    autoComplete: 'email',
                  })}
                  {inputField({
                    label: 'Senha',
                    type: showPassword ? 'text' : 'password',
                    value: password,
                    onChange: setPassword,
                    placeholder: '••••••••',
                    autoComplete: 'current-password',
                    rightEl: eyeToggle,
                  })}
                  <div className="auth-forgot-row">
                    <button type="button" className="auth-link" onClick={() => goTo('forgot')}>
                      Esqueci a senha
                    </button>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" className="auth-btn-primary" disabled={loading}>
                    {loading ? <><span className="auth-spinner" />Entrando…</> : 'Entrar'}
                  </button>
                </form>
              )}

              {/* ── Formulário: link por e-mail ── */}
              {loginMethod === 'emaillink' && (
                <>
                  {successMsg ? (
                    <div className="auth-success-box">
                      <div className="auth-success-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#43C59E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <p className="auth-success-title">Link enviado!</p>
                      <p className="auth-success-sub">{successMsg}</p>
                      <button type="button" className="auth-link" style={{marginTop:12}} onClick={() => { setSuccessMsg(null); setEmail(''); }}>
                        Usar outro e-mail
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailLink} noValidate>
                      <p className="auth-emaillink-hint">
                        Enviaremos um link seguro para o seu e-mail. Clique nele para entrar — sem precisar de senha.
                      </p>
                      {inputField({
                        label: 'Seu e-mail',
                        type: 'email',
                        value: email,
                        onChange: setEmail,
                        placeholder: 'seu@email.com',
                        autoComplete: 'email',
                      })}
                      {error && <div className="auth-error">{error}</div>}
                      <button type="submit" className="auth-btn-primary" disabled={loading}>
                        {loading
                          ? <><span className="auth-spinner" />Enviando…</>
                          : <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                              </svg>
                              Enviar link de acesso
                            </>
                        }
                      </button>
                    </form>
                  )}
                </>
              )}

              <div className="auth-divider"><span>ou</span></div>

              <button
                className="auth-google-btn"
                disabled={loading}
                onClick={() => { setError(null); setLoading(true); loginWithGoogle(); }}
              >
                <GoogleIcon />
                Entrar com Google
              </button>

              <p className="auth-switch">
                Não tem conta?{' '}
                <button type="button" className="auth-link auth-link-bold" onClick={() => goTo('register')}>
                  Criar conta grátis
                </button>
              </p>
            </>
          )}

          {/* ──────────── CADASTRO ──────────── */}
          {view === 'register' && (
            <>
              <h1 className="auth-title">Criar sua conta</h1>
              <p className="auth-sub">Comece grátis por 14 dias, sem cartão</p>

              <form onSubmit={handleRegister} noValidate>
                {inputField({
                  label: 'Nome completo',
                  type: 'text',
                  value: name,
                  onChange: setName,
                  placeholder: 'Maria Silva',
                  autoComplete: 'name',
                })}
                {inputField({
                  label: 'E-mail',
                  type: 'email',
                  value: email,
                  onChange: setEmail,
                  placeholder: 'seu@email.com',
                  autoComplete: 'email',
                })}
                {inputField({
                  label: 'Senha',
                  type: showPassword ? 'text' : 'password',
                  value: password,
                  onChange: setPassword,
                  placeholder: 'Mínimo 6 caracteres',
                  autoComplete: 'new-password',
                  rightEl: eyeToggle,
                })}
                {inputField({
                  label: 'Confirmar senha',
                  type: showPassword ? 'text' : 'password',
                  value: confirmPassword,
                  onChange: setConfirmPassword,
                  placeholder: '••••••••',
                  autoComplete: 'new-password',
                })}

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? <><span className="auth-spinner" />Criando conta…</> : 'Criar conta'}
                </button>
              </form>

              <p className="auth-switch">
                Já tem conta?{' '}
                <button type="button" className="auth-link auth-link-bold" onClick={() => goTo('login')}>
                  Entrar
                </button>
              </p>

              <p className="auth-terms">
                Ao criar uma conta, você concorda com os{' '}
                <a href="#" className="auth-link">Termos de Uso</a> e a{' '}
                <a href="#" className="auth-link">Política de Privacidade</a>.
              </p>
            </>
          )}

          {/* ──────────── RECUPERAR SENHA ──────────── */}
          {view === 'forgot' && (
            <>
              <button type="button" className="auth-back-btn" onClick={() => goTo('login')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Voltar para login
              </button>

              <h1 className="auth-title">Recuperar senha</h1>
              <p className="auth-sub">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>

              {successMsg ? (
                <div className="auth-success-box">
                  <div className="auth-success-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#43C59E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="auth-success-title">E-mail enviado!</p>
                  <p className="auth-success-sub">{successMsg}</p>
                  <button type="button" className="auth-btn-primary" style={{marginTop: 20}} onClick={() => goTo('login')}>
                    Voltar para o login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} noValidate>
                  {inputField({
                    label: 'E-mail cadastrado',
                    type: 'email',
                    value: email,
                    onChange: setEmail,
                    placeholder: 'seu@email.com',
                    autoComplete: 'email',
                  })}

                  {error && <div className="auth-error">{error}</div>}

                  <button type="submit" className="auth-btn-primary" disabled={loading}>
                    {loading ? <><span className="auth-spinner" />Enviando…</> : 'Enviar link de recuperação'}
                  </button>
                </form>
              )}
            </>
          )}

          <p className="auth-back-landing" onClick={onBack}>
            ← Voltar para a página inicial
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
