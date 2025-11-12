import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

type Provider = 'apple' | 'google';

export default function Login() {
  const { t } = useTranslation('login');
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  
  const [mode, setMode] = useState<'oauth' | 'email' | 'otp'>('oauth');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLocation('/');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setLocation('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setLocation]);

  const handleOAuthLogin = async (provider: Provider) => {
    if (!configured) {
      setError(t('errorConfig'));
      return;
    }

    setLoading(provider);
    setError(null);

    try {
      const redirectTo = import.meta.env.VITE_REDIRECT_URL || window.location.origin;
      
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start OAuth login');
      setLoading(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setError(t('errorConfig'));
      return;
    }

    setEmailLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const redirectTo = import.meta.env.VITE_REDIRECT_URL || window.location.origin;

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (signUpError) throw signUpError;
        setSuccess(t('emailSent'));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setError(t('errorConfig'));
      return;
    }

    setOtpLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpError) throw otpError;
      setSuccess(t('otpSent'));
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setError(t('errorConfig'));
      return;
    }

    setVerifyLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;
      setSuccess(t('loginSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .login-container {
          position: relative;
        }
        
        .login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.5;
          pointer-events: none;
        }
      `}</style>
      <div className="login-container" style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>{t('title')}</h1>
            <p style={styles.subtitle}>{t('subtitle')}</p>
          </div>

          {!configured && (
            <div style={{...styles.errorBanner, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24'}} role="alert">
              ⚙️ {t('notConfigured')}
              <br />
              <small style={{fontSize: '0.875rem', marginTop: '4px', display: 'block'}}>
                {t('notConfiguredHint')}
              </small>
            </div>
          )}

          {error && (
            <div style={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div style={{...styles.errorBanner, backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #34d399'}} role="alert">
              {success}
            </div>
          )}

          {mode === 'oauth' ? (
            <>
              <div style={styles.buttonContainer}>
            <button
              style={{
                ...styles.button,
                ...styles.appleButton,
                ...(loading === 'apple' ? styles.buttonDisabled : {}),
              }}
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading !== null}
              aria-label={t('appleButton')}
              data-testid="button-login-apple"
              onMouseEnter={(e) => {
                if (loading === null) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#1a1a1a';
                }
              }}
              onMouseLeave={(e) => {
                if (loading === null) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#000';
                }
              }}
            >
              {loading === 'apple' ? (
                <span style={styles.spinner} />
              ) : (
                <span style={styles.buttonText}>{t('appleButton')}</span>
              )}
            </button>

            <button
              style={{
                ...styles.button,
                ...styles.googleButton,
                ...(loading === 'google' ? styles.buttonDisabled : {}),
              }}
              onClick={() => handleOAuthLogin('google')}
              disabled={loading !== null}
              aria-label={t('googleButton')}
              data-testid="button-login-google"
              onMouseEnter={(e) => {
                if (loading === null) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (loading === null) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#fff';
                }
              }}
            >
              {loading === 'google' ? (
                <span style={{ ...styles.spinner, borderTopColor: '#333' }} />
              ) : (
                <span style={styles.buttonText}>{t('googleButton')}</span>
              )}
            </button>
          </div>

          <div style={styles.divider}>
            <span style={styles.dividerText}>{t('orDivider')}</span>
          </div>

          <button
            style={{...styles.button, ...styles.emailButton}}
            onClick={() => {
              setMode('otp');
              setOtpSent(false);
              setOtp('');
              setEmail('');
            }}
            data-testid="button-switch-otp"
          >
            <span style={styles.buttonText}>{t('otpButton')}</span>
          </button>
        </>
      ) : mode === 'otp' ? (
        <>
          {!otpSent ? (
            <form onSubmit={handleSendOtp} style={styles.form}>
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                data-testid="input-otp-email"
              />
              <button
                type="submit"
                disabled={otpLoading}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  ...(otpLoading ? styles.buttonDisabled : {}),
                }}
                data-testid="button-send-otp"
              >
                {otpLoading ? (
                  <span style={styles.spinner} />
                ) : (
                  <span style={styles.buttonText}>{t('sendOtp')}</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={styles.form}>
              <div style={{fontSize: '14px', color: '#666', marginBottom: '12px', textAlign: 'center'}}>
                {t('otpSentTo')} <strong>{email}</strong>
              </div>
              <input
                type="text"
                placeholder={t('otpPlaceholder')}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                style={{...styles.input, textAlign: 'center', fontSize: '24px', letterSpacing: '8px'}}
                data-testid="input-otp-code"
                autoFocus
              />
              <button
                type="submit"
                disabled={verifyLoading || otp.length !== 6}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  ...(verifyLoading || otp.length !== 6 ? styles.buttonDisabled : {}),
                }}
                data-testid="button-verify-otp"
              >
                {verifyLoading ? (
                  <span style={styles.spinner} />
                ) : (
                  <span style={styles.buttonText}>{t('verifyOtp')}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
                style={{...styles.button, ...styles.backButton, marginTop: '8px'}}
                data-testid="button-resend-otp"
              >
                <span style={styles.buttonText}>{t('resendOtp')}</span>
              </button>
            </form>
          )}

          <div style={styles.divider}>
            <span style={styles.dividerText}>{t('orDivider')}</span>
          </div>

          <button
            style={{...styles.button, ...styles.backButton}}
            onClick={() => {
              setMode('oauth');
              setOtpSent(false);
              setOtp('');
              setEmail('');
            }}
            data-testid="button-back-oauth-from-otp"
          >
            <span style={styles.buttonText}>← {t('backToOAuth')}</span>
          </button>
        </>
      ) : (
        <>
          <form onSubmit={handleEmailAuth} style={styles.form}>
            <input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              data-testid="input-email"
            />
            <input
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              data-testid="input-password"
            />
            <button
              type="submit"
              disabled={emailLoading}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(emailLoading ? styles.buttonDisabled : {}),
              }}
              data-testid="button-email-submit"
            >
              {emailLoading ? (
                <span style={styles.spinner} />
              ) : (
                <span style={styles.buttonText}>{isSignUp ? t('signUp') : t('signIn')}</span>
              )}
            </button>
          </form>

          <div style={styles.switchMode}>
            <span style={styles.switchText}>
              {isSignUp ? t('switchToSignIn') : t('switchToSignUp')}
            </span>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={styles.switchButton}
              data-testid="button-switch-mode"
            >
              {isSignUp ? t('signInLink') : t('signUpLink')}
            </button>
          </div>

          <div style={styles.divider}>
            <span style={styles.dividerText}>{t('orDivider')}</span>
          </div>

          <button
            style={{...styles.button, ...styles.backButton}}
            onClick={() => setMode('oauth')}
            data-testid="button-back-oauth"
          >
            <span style={styles.buttonText}>← {t('backToOAuth')}</span>
          </button>
        </>
      )}

          <div style={styles.footer}>
            <p style={styles.footerText}>
              {t('termsPrefix')}{' '}
              <a href="/terms" style={styles.link}>
                {t('termsService')}
              </a>{' '}
              {t('termsAnd')}{' '}
              <a href="/privacy" style={styles.link}>
                {t('termsPrivacy')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 16px 0',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
    lineHeight: '1.4',
  },
  errorBanner: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
    border: '1px solid #fcc',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  button: {
    height: '48px',
    width: '100%',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    outline: 'none',
  },
  appleButton: {
    backgroundColor: '#000',
    color: '#fff',
  },
  googleButton: {
    backgroundColor: '#fff',
    color: '#1a1a1a',
    border: '1px solid #E5E7EB',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  buttonText: {
    fontSize: '16px',
    lineHeight: '1',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  footer: {
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#999',
    margin: 0,
    lineHeight: '1.5',
    opacity: 0.65,
  },
  link: {
    color: '#666',
    textDecoration: 'underline',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    position: 'relative' as const,
  },
  dividerText: {
    padding: '0 12px',
    fontSize: '14px',
    color: '#999',
    backgroundColor: '#fff',
    position: 'relative' as const,
    zIndex: 1,
  },
  emailButton: {
    backgroundColor: '#4f46e5',
    color: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '24px',
  },
  input: {
    height: '48px',
    width: '100%',
    fontSize: '16px',
    padding: '0 16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    color: '#fff',
  },
  switchMode: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  switchText: {
    fontSize: '14px',
    color: '#666',
    marginRight: '8px',
  },
  switchButton: {
    fontSize: '14px',
    color: '#4f46e5',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  backButton: {
    backgroundColor: '#f3f4f6',
    color: '#1a1a1a',
    border: '1px solid #E5E7EB',
  },
};
