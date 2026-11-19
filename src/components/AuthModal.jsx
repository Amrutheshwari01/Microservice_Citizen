import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { authService } from '../services/authService';
import { INDIAN_PATTERNS } from '../utils/validators';
import FaceRecognitionCamera from './common/FaceRecognitionCamera';

export default function AuthModal({ isOpen, onClose, onRegisterSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nationalityCode, setNationalityCode] = useState('IN');
  const [faceImage, setFaceImage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (fullName.trim().length < 2) {
      setMessage({ type: 'error', text: 'Enter your full name.' });
      return;
    }
    if (!INDIAN_PATTERNS.EMAIL.test(email.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (!INDIAN_PATTERNS.MOBILE.test(mobile.trim())) {
      setMessage({ type: 'error', text: 'Enter a valid 10-digit mobile number.' });
      return;
    }
    if (!INDIAN_PATTERNS.PASSWORD.test(password)) {
      setMessage({
        type: 'error',
        text: 'Password must be 8+ characters and include uppercase, lowercase, a number, and a symbol.'
      });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setMessage({ type: 'error', text: 'Please accept the terms and privacy policy to continue.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.register({
        full_name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        confirm_password: confirmPassword,
        nationality_code: nationalityCode,
        face_image: faceImage || null
      });
      onRegisterSuccess(result);
      onClose();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Account creation failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content auth-register-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="register-title">Create your account</h2>
            <p>Use your email and password to sign in.</p>
          </div>
          <button type="button" className="btn-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {message && (
              <div className={`auth-form-message ${message.type}`} role="alert">
                <AlertCircle size={18} />
                <span>{message.text}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="register-full-name">Full name</label>
              <input
                id="register-full-name"
                className="form-input"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className="form-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-mobile">Mobile number</label>
              <input
                id="register-mobile"
                className="form-input"
                type="tel"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-nationality">Country</label>
              <select
                id="register-nationality"
                className="form-select"
                value={nationalityCode}
                onChange={(event) => setNationalityCode(event.target.value)}
              >
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Password</label>
              <div className="auth-password-field">
                <input
                  id="register-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="form-help">8+ characters with uppercase, lowercase, a number, and a symbol.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-confirm-password">Confirm password</label>
              <input
                id="register-confirm-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <div className="auth-face-enrollment">
              <div>
                <strong>Face sign-in</strong>
                <p>{faceImage ? 'A face photo is ready for sign-in.' : 'Optional: set up face recognition now.'}</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCamera(true)}>
                {faceImage ? 'Retake photo' : 'Set up'}
              </button>
            </div>
            {showCamera && (
              <div className="auth-face-camera">
                <FaceRecognitionCamera
                  mode="REGISTER"
                  title="Set up face sign-in"
                  description="Position your face in the frame, or upload a clear selfie."
                  onCapture={(image) => {
                    setFaceImage(image);
                    setShowCamera(false);
                  }}
                  onCancel={() => setShowCamera(false)}
                />
              </div>
            )}

            <label className="auth-consent">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>I agree to the terms of service.</span>
            </label>
            <label className="auth-consent">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
              />
              <span>I agree to the privacy policy.</span>
            </label>
          </div>

          <div className="modal-footer auth-register-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
              Back to sign in
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="spinning" /> Creating account...</> : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
