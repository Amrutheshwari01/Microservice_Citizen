import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Sparkles, Volume2, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from '../data/i18n';

export default function VoiceSearchModal({
  isOpen,
  onClose,
  language,
  onExecuteCommand
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedIntent, setDetectedIntent] = useState(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const sampleCommands = {
    en: [
      { text: "Check my available wallet balance", action: "NAV_DASHBOARD" },
      { text: "Top-up wallet with ₹5,000", action: "OPEN_TOPUP" },
      { text: "Transfer money to another farmer", action: "OPEN_TRANSFER" },
      { text: "Show active escrow holds", action: "NAV_HOLDS" },
      { text: "Upgrade KYC to Tier 2", action: "NAV_PROFILE" }
    ],
    hi: [
      { text: "मेरा वॉलेट बैलेंस दिखाएं", action: "NAV_DASHBOARD" },
      { text: "वॉलेट में ₹५००० जोड़ें", action: "OPEN_TOPUP" },
      { text: "किसान को पैसे भेजें", action: "OPEN_TRANSFER" },
      { text: "सक्रिय एस्क्रो रोक देखें", action: "NAV_HOLDS" },
      { text: "केवाईसी टियर २ अपग्रेड करें", action: "NAV_PROFILE" }
    ],
    kn: [
      { text: "ನನ್ನ ವಾಲೆಟ್ ಬ್ಯಾಲೆನ್ಸ್ ತೋರಿಸಿ", action: "NAV_DASHBOARD" },
      { text: "ವಾಲೆಟ್‌ಗೆ ₹೫೦೦೦ ಹಣ ಸೇರಿಸಿ", action: "OPEN_TOPUP" },
      { text: "ಇನ್ನೊಬ್ಬ ರೈತನಿಗೆ ಹಣ ವರ್ಗಾಯಿಸಿ", action: "OPEN_TRANSFER" },
      { text: "ಎಸ್ಕ್ರೋ ತಡೆಹಿಡಿದ ಹಣ ಪರಿಶೀಲಿಸಿ", action: "NAV_HOLDS" },
      { text: "ಕೆವೈಸಿ ಟೈಯರ್ ೨ ನವೀಕರಿಸಿ", action: "NAV_PROFILE" }
    ]
  };

  useEffect(() => {
    if (isOpen) {
      startListeningSimulation();
    } else {
      setIsListening(false);
      setTranscript('');
      setDetectedIntent(null);
    }
  }, [isOpen]);

  const startListeningSimulation = () => {
    setIsListening(true);
    setTranscript('');
    setDetectedIntent(null);

    // If browser supports webkitSpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
          parseIntent(text);
        };
        recognition.onerror = () => {
          // Fallback to simulated prompts
        };
        recognition.start();
        return;
      } catch (e) {
        // Fallback
      }
    }
  };

  const handleSelectSample = (sample) => {
    setTranscript(sample.text);
    setDetectedIntent(sample.action);
  };

  const parseIntent = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('balance') || lower.includes('बैलेंस') || lower.includes('ಬ್ಯಾಲೆನ್ಸ್')) {
      setDetectedIntent('NAV_DASHBOARD');
    } else if (lower.includes('top') || lower.includes('जोड़ें') || lower.includes('ಟಾಪ್')) {
      setDetectedIntent('OPEN_TOPUP');
    } else if (lower.includes('send') || lower.includes('transfer') || lower.includes('भेजें') || lower.includes('ವರ್ಗಾವಣೆ')) {
      setDetectedIntent('OPEN_TRANSFER');
    } else if (lower.includes('hold') || lower.includes('escrow') || lower.includes('रोक') || lower.includes('ಎಸ್ಕ್ರೋ')) {
      setDetectedIntent('NAV_HOLDS');
    } else if (lower.includes('kyc') || lower.includes('profile') || lower.includes('केवाईसी')) {
      setDetectedIntent('NAV_PROFILE');
    }
  };

  const handleExecute = () => {
    if (detectedIntent) {
      onExecuteCommand(detectedIntent);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content voice-modal" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '50%', color: 'var(--primary-600)' }}>
              <Volume2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>{t.actions.voiceSearch}</h3>
              <small className="text-muted">S07 Multilingual Voice Input Engine</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
          {/* Waveform Pulse Animation */}
          <div className="voice-mic-container" style={{ margin: '0 auto 20px', position: 'relative', width: '90px', height: '90px' }}>
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                animation: isListening ? 'pulseGlow 1.5s infinite' : 'none'
              }}
            />
            <div 
              style={{
                position: 'absolute',
                inset: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-700), var(--primary-500))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Mic size={36} />
            </div>
          </div>

          <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>
            {isListening ? t.voice.listening : 'Ready to listen'}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: '16px' }}>
            {t.voice.speakNow}
          </p>

          {/* Transcript Box */}
          <div 
            style={{
              minHeight: '54px',
              background: 'var(--slate-100)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed var(--slate-300)',
              marginBottom: '20px'
            }}
          >
            {transcript ? (
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                "{transcript}"
              </span>
            ) : (
              <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                Tap a suggestion below or speak into microphone...
              </span>
            )}
          </div>

          {/* Suggestions */}
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Suggested Voice Commands:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {(sampleCommands[language] || sampleCommands.en).map((cmd, i) => (
                <button
                  key={i}
                  className="voice-suggestion-btn"
                  onClick={() => handleSelectSample(cmd)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--slate-200)',
                    background: transcript === cmd.text ? 'var(--primary-50)' : 'white',
                    borderColor: transcript === cmd.text ? 'var(--primary-500)' : 'var(--slate-200)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left'
                  }}
                >
                  <span>"{cmd.text}"</span>
                  <ArrowRight size={14} className="text-muted" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button 
            className="btn btn-primary" 
            disabled={!detectedIntent}
            onClick={handleExecute}
          >
            Execute Action
          </button>
        </div>
      </div>
    </div>
  );
}
