import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Upload, Eye, ShieldCheck, X, ArrowLeft, Loader2 } from 'lucide-react';

export default function FaceRecognitionCamera({
  onCapture,
  onCancel,
  mode = 'LOGIN', // 'LOGIN' | 'REGISTER' | 'ENROLL'
  title = 'Biometric Face Recognition',
  description = 'Position your face inside the frame and keep still for biometric verification.'
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 480 },
            height: { ideal: 480 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera access not supported on this device/browser. Please upload a photo instead.');
      }
    } catch (err) {
      console.warn('Webcam permission error:', err);
      setCameraError('Unable to access webcam. Please allow camera permissions or upload a selfie below.');
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Capture frame to canvas
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const width = video.videoWidth || 320;
    const height = video.videoHeight || 320;
    canvas.width = width;
    canvas.height = height;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Get Base64 image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setTimeout(() => {
      setCapturedImage(dataUrl);
      setIsScanning(false);
      stopCamera();
    }, 400);
  };

  // Retake
  const handleRetake = () => {
    setCapturedImage(null);
    setIsConfirming(false);
    startCamera();
  };

  // Confirm capture
  const handleConfirm = () => {
    if (capturedImage) {
      setIsConfirming(true);
      stopCamera();
      // Invoke callback
      onCapture(capturedImage);
    }
  };

  // File Upload fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      background: 'var(--slate-900, #0f172a)',
      color: '#fff',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
      position: 'relative'
    }}>
      {onCancel && (
        <button 
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            color: '#fff',
            cursor: 'pointer',
            padding: '6px'
          }}
          title="Close Camera"
        >
          <X size={16} />
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
          <ShieldCheck size={20} style={{ color: '#22c55e' }} />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
            {title}
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', maxWidth: '320px' }}>
          {description}
        </p>
      </div>

      {/* Camera / Preview Viewport */}
      <div style={{
        position: 'relative',
        width: '260px',
        height: '260px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: isScanning ? '3px solid #22c55e' : '3px solid rgba(34, 197, 94, 0.4)',
        boxShadow: isScanning ? '0 0 25px rgba(34, 197, 94, 0.6)' : '0 0 15px rgba(0, 0, 0, 0.5)',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Hidden Canvas for capture processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Live Video Feed */}
        {!capturedImage && (
          <video 
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Mirror preview
            }}
          />
        )}

        {/* Captured Snapshot Preview */}
        {capturedImage && (
          <img 
            src={capturedImage} 
            alt="Captured Face" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* Biometric Oval Guide Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          bottom: '20px',
          left: '35px',
          right: '35px',
          border: '2px dashed rgba(255, 255, 255, 0.4)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        {/* Scanning Laser Animation */}
        {isScanning && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
            boxShadow: '0 0 8px #22c55e',
            animation: 'scanBeam 1.5s infinite ease-in-out',
            top: '50%'
          }} />
        )}
      </div>

      {/* Camera Error / Permission Notice */}
      {cameraError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          maxWidth: '320px',
          textAlign: 'center'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
        {!capturedImage ? (
          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleCapture}
            disabled={!cameraActive || isScanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              background: '#22c55e',
              borderColor: '#22c55e',
              color: '#fff',
              borderRadius: '8px'
            }}
          >
            <Camera size={16} />
            <span>{isScanning ? 'Extracting AI Features...' : 'Scan & Capture Face'}</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={handleRetake}
              disabled={isConfirming}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                fontSize: '0.85rem',
                color: '#fff',
                borderColor: '#475569',
                borderRadius: '8px'
              }}
            >
              <RefreshCw size={14} />
              <span>Retake</span>
            </button>
            <button 
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={isConfirming}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                fontSize: '0.85rem',
                background: '#22c55e',
                borderColor: '#22c55e',
                color: '#fff',
                borderRadius: '8px'
              }}
            >
              <CheckCircle2 size={14} />
              <span>
                {isConfirming ? 'Processing...' : (mode === 'LOGIN' ? 'Verify & Log In' : 'Use Photo & Return')}
              </span>
            </button>
          </div>
        )}

        {/* File Upload Fallback */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          marginTop: '2px'
        }}>
          <Upload size={12} />
          <span>Or upload selfie from file</span>
          <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
          />
        </label>

        {onCancel && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '4px'
            }}
          >
            <ArrowLeft size={12} />
            <span>Return to Form</span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes scanBeam {
          0% { top: 15%; opacity: 0.3; }
          50% { top: 85%; opacity: 1; }
          100% { top: 15%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
