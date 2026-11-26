import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Camera, CheckCircle2, Eye, EyeOff, KeyRound, Leaf, UserRound } from 'lucide-react';
import { authService } from '../services/authService';
import FaceRecognitionCamera from './common/FaceRecognitionCamera';
import './HomePage.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function HomePage({
  onLoginSuccess,
  onOpenRegister,
  registeredIdentifier = '',
  registrationNotice = ''
}) {
  const [activeMethod, setActiveMethod] = useState('password');
  const [identifier, setIdentifier] = useState(registeredIdentifier);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(() => (
    registrationNotice ? { type: 'success', text: registrationNotice } : null
  ));
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(() => Boolean(window.google?.accounts?.id));
  const [googleScriptFailed, setGoogleScriptFailed] = useState(false);
  const googleButtonRef = useRef(null);
  const googleLoginRef = useRef(null);
  const googleInitializedRef = useRef(false);

  const finishLogin = useCallback(async (response, method) => {
    try {
      await onLoginSuccess({
        citizen_id: response.citizen_id,
        full_name: response.full_name || 'Citizen',
        email: response.email || identifier,
        mobile: response.mobile || '',
        active_persona: response.active_persona || 'CUSTOMER',
        kyc_tier: response.kyc_tier || 'T0',
        method
      });
      setFeedback({ type: 'success', text: 'Signed in successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Account data could not be loaded.' });
    }
  }, [identifier, onLoginSuccess]);

  const handleGoogleCredential = useCallback(async (credential) => {
    if (!credential) {
      setFeedback({ type: 'error', text: 'Google did not return a sign-in credential. Please try again.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await authService.loginWithGoogle(credential);
      await finishLogin(response, 'GOOGLE');
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Google sign-in failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [finishLogin]);

  useEffect(() => {
    googleLoginRef.current = handleGoogleCredential;
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleScriptLoaded) return undefined;

    const scriptId = 'google-identity-services';
    let script = document.getElementById(scriptId);
    const isNewScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
    }

    const handleLoad = () => setGoogleScriptLoaded(true);
    const handleError = () => setGoogleScriptFailed(true);
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    if (isNewScript) document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [googleScriptLoaded]);

  useEffect(() => {
    if (!googleScriptLoaded || googleInitializedRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => googleLoginRef.current(response.credential),
      auto_select: false
    });
    googleInitializedRef.current = true;
  }, [googleScriptLoaded]);

  useEffect(() => {
    if (activeMethod !== 'google' || !googleScriptLoaded || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    googleButtonRef.current.replaceChildren();
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      width: Math.min(googleButtonRef.current.clientWidth, 400)
    });
  }, [activeMethod, googleScriptLoaded]);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const response = await authService.login(identifier, password);
      await finishLogin(response, 'PASSWORD');
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Sign-in failed. Check your details and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCaptured = async (faceImage) => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await authService.loginWithFace(faceImage);
      await finishLogin(response, 'BIOMETRIC_FACE');
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Face recognition failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const selectMethod = (method) => {
    setActiveMethod(method);
    setFeedback(null);
  };

  return (
    <main className="signin-page">
      <section className="signin-card" aria-labelledby="signin-title">
        <div className="signin-brand">
          <span className="signin-brand-icon"><Leaf size={22} /></span>
          <span>AgriLink</span>
        </div>

        <h1 id="signin-title">Welcome back</h1>
        <p className="signin-intro">Sign in to continue to your account.</p>

        <div className="signin-methods" role="group" aria-label="Sign-in method">
          <button
            type="button"
            aria-pressed={activeMethod === 'password'}
            className={activeMethod === 'password' ? 'active' : ''}
            onClick={() => selectMethod('password')}
          >
            <KeyRound size={17} />
            <span>Password</span>
          </button>
          <button
            type="button"
            aria-pressed={activeMethod === 'face'}
            className={activeMethod === 'face' ? 'active' : ''}
            onClick={() => selectMethod('face')}
          >
            <Camera size={17} />
            <span>Face</span>
          </button>
          <button
            type="button"
            aria-pressed={activeMethod === 'google'}
            className={activeMethod === 'google' ? 'active' : ''}
            onClick={() => selectMethod('google')}
          >
            <span className="google-g" aria-hidden="true">G</span>
            <span>Google</span>
          </button>
        </div>

        {feedback && (
          <div className={`signin-feedback ${feedback.type}`} role="status">
            {feedback.type === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {activeMethod === 'password' && (
          <form className="signin-form" onSubmit={handlePasswordSubmit}>
            <label htmlFor="signin-identifier">Email or mobile number</label>
            <div className="signin-input-wrap">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="signin-identifier"
                type="text"
                autoComplete="username"
                placeholder="Enter your email or mobile"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>

            <label htmlFor="signin-password">Password</label>
            <div className="signin-input-wrap">
              <KeyRound size={18} aria-hidden="true" />
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-visibility"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <button type="submit" className="signin-submit" disabled={loading}>
              {loading ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}
            </button>
          </form>
        )}

        {activeMethod === 'face' && (
          <div className="face-signin">
            {loading ? (
              <p className="signin-status">Checking your face…</p>
            ) : (
              <FaceRecognitionCamera
                mode="LOGIN"
                title="Face recognition"
                description="Center your face in the frame."
                onCapture={handleFaceCaptured}
              />
            )}
          </div>
        )}

        {activeMethod === 'google' && (
          <div className="google-signin">
            {!GOOGLE_CLIENT_ID ? (
              <p className="signin-status">Google sign-in is not configured yet.</p>
            ) : googleScriptFailed ? (
              <p className="signin-status error">Google sign-in could not be loaded. Check your connection and try again.</p>
            ) : googleScriptLoaded ? (
              <div ref={googleButtonRef} className="google-button-container" />
            ) : (
              <p className="signin-status">Loading Google sign-in…</p>
            )}
            {loading && <p className="signin-status">Signing in with Google…</p>}
          </div>
        )}

        <div className="signin-register">
          <span>New here?</span>
          <button type="button" onClick={onOpenRegister}>Create an account</button>
        </div>
      </section>
    </main>
  );
}
