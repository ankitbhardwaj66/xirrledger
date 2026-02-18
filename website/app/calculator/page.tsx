'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const GOOGLE_CLIENT_ID = '1030081614603-onnmmupafevkn0hojoj4qk023tuohius.apps.googleusercontent.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type Step = 'auth' | 'upload' | 'details' | 'processing' | 'results';
type Broker = 'zerodha' | 'groww' | 'both' | '';

interface User {
  name: string;
  email: string;
  picture?: string;
  googleToken?: string;
}

interface UploadedFile {
  file: File;
  broker: 'zerodha' | 'groww' | 'unknown';
}

interface ProcessingStep {
  key: string;
  label: string;
  status: 'pending' | 'active' | 'done';
}

interface Results {
  xirr: number;
  nifty_xirr: number;
  total_invested: number;
  current_value: number;
  net_gain: number;
  report_url: string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement | null, config: object) => void;
        };
      };
    };
  }
}

const PROCESSING_STEPS = [
  { key: 'uploading', label: 'Uploading your files securely...' },
  { key: 'parsing',   label: 'Reading your ledger files...' },
  { key: 'fetching',  label: 'Fetching Nifty 50 historical data...' },
  { key: 'computing', label: 'Calculating your XIRR...' },
  { key: 'report',    label: 'Generating your PDF report...' },
  { key: 'done',      label: 'All done!' },
];

function detectBroker(file: File): 'zerodha' | 'groww' | 'unknown' {
  const name = file.name.toLowerCase();
  if (file.type === 'text/csv' || name.endsWith('.csv')) return 'zerodha';
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'groww';
  return 'unknown';
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function CalculatorPage() {
  const [step, setStep] = useState<Step>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [broker, setBroker] = useState<Broker>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [password, setPassword] = useState('');
  const [holdings, setHoldings] = useState('');
  const [cash, setCash] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(
    PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' as const }))
  );
  const [results, setResults] = useState<Results | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [processingError, setProcessingError] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        use_fedcm_for_prompt: true,
      });
      window.google?.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'rectangular',
      });
    };
    return () => { document.head.removeChild(script); };
  }, []);

  // Re-render Google button when returning to auth step
  useEffect(() => {
    if (step === 'auth' && window.google) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular',
      });
    }
  }, [step]);

  function handleGoogleResponse(response: { credential: string }) {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    setUser({ name: payload.name, email: payload.email, picture: payload.picture, googleToken: response.credential });
    setStep('upload');
  }

  function handleManualContinue() {
    if (!manualName.trim()) { setAuthError('Please enter your name.'); return; }
    if (!manualEmail.trim() || !manualEmail.includes('@')) { setAuthError('Please enter a valid email.'); return; }
    if (!broker) { setAuthError('Please select your broker.'); return; }
    setAuthError('');
    setUser({ name: manualName.trim(), email: manualEmail.trim() });
    setStep('upload');
  }

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(incoming).map(file => ({
      file,
      broker: detectBroker(file),
    }));
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.file.name));
      return [...prev, ...newFiles.filter(f => !existingNames.has(f.file.name))];
    });
  }, []);

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  function hasGrowwFiles(): boolean {
    return files.some(f => f.broker === 'groww') || broker === 'groww' || broker === 'both';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function advanceToDetails() {
    if (files.length === 0) return;
    setStep('details');
  }

  async function startProcessing() {
    if (!holdings) return;
    setProcessingError('');
    setStep('processing');

    // TODO: Replace with real API calls once Lambda is deployed
    // For now, simulate the async flow with mock progress
    simulateProcessing();
  }

  // --- MOCK SIMULATION (replace with real API polling once Lambda is ready) ---
  function simulateProcessing() {
    const steps = [...PROCESSING_STEPS];
    let i = 0;
    function advance() {
      setProcessingSteps(prev =>
        prev.map((s, idx) => ({
          ...s,
          status: idx < i ? 'done' : idx === i ? 'active' : 'pending',
        }))
      );
      if (i < steps.length - 1) {
        i++;
        pollingRef.current = setTimeout(advance, i === 2 ? 3000 : 2000);
      } else {
        // Mock results
        setResults({
          xirr: 16.5,
          nifty_xirr: 13.8,
          total_invested: 500000,
          current_value: 650000,
          net_gain: 150000,
          report_url: '#',
        });
        setStep('results');
      }
    }
    advance();
  }

  // Real polling function (used once Lambda is deployed)
  async function pollStatus(sid: string) {
    // TODO: Replace with real S3 status URL
    const statusUrl = `${API_BASE}/status/${sid}.json`;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(statusUrl);
        const data = await res.json();
        setProcessingSteps(prev =>
          prev.map(s => ({
            ...s,
            status: s.key === data.status ? 'active' : PROCESSING_STEPS.findIndex(p => p.key === s.key) < PROCESSING_STEPS.findIndex(p => p.key === data.status) ? 'done' : 'pending',
          }))
        );
        if (data.status === 'done') {
          clearInterval(pollingRef.current!);
          setResults(data);
          setStep('results');
        } else if (data.status === 'error') {
          clearInterval(pollingRef.current!);
          setProcessingError(data.message || 'Something went wrong. Please try again.');
          setStep('details');
        }
      } catch {}
    }, 2000);
  }

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const primaryColor = '#1f77b4';
  const activeStepIdx = processingSteps.findIndex(s => s.status === 'active');

  // ─── STEP INDICATORS ───────────────────────────────────────────────────────
  const STEPS_LABELS = ['Sign In', 'Upload', 'Details', 'Processing', 'Results'];
  const stepIndex = { auth: 0, upload: 1, details: 2, processing: 3, results: 4 };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: primaryColor, padding: '24px 0', color: '#fff' }}>
        <div className="container-custom">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>XIRR Calculator</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
            Upload your broker ledger and get your true returns in seconds
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      {step !== 'processing' && step !== 'results' && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 0' }}>
          <div className="container-custom">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 600 }}>
              {STEPS_LABELS.slice(0, 3).map((label, i) => {
                const current = stepIndex[step];
                const done = i < current;
                const active = i === current;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? primaryColor : active ? primaryColor : '#e5e7eb',
                        color: done || active ? '#fff' : '#9ca3af', fontSize: '0.85rem', fontWeight: 700,
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 400, color: active ? primaryColor : done ? '#374151' : '#9ca3af', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 2, background: done ? primaryColor : '#e5e7eb', margin: '0 8px', marginBottom: 20 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="container-custom" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* ── STEP 1: AUTH ─────────────────────────────────────────────────── */}
        {step === 'auth' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: '#111827' }}>Get Started</h2>
              <p style={{ color: '#6b7280', marginBottom: 28, fontSize: '0.95rem' }}>
                We'll send your report to your email if you close the tab
              </p>

              {/* Google Sign In */}
              <div ref={googleBtnRef} style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>or continue manually</span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>

              {/* Manual Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  style={{ padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }}
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  style={{ padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }}
                />

                {/* Broker Selection */}
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Your broker</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['zerodha', 'groww', 'both'] as Broker[]).map(b => (
                      <button
                        key={b}
                        onClick={() => setBroker(b)}
                        style={{
                          flex: 1, padding: '10px 4px', borderRadius: 8, border: `2px solid ${broker === b ? primaryColor : '#e5e7eb'}`,
                          background: broker === b ? '#eff6ff' : '#fff', color: broker === b ? primaryColor : '#6b7280',
                          fontWeight: broker === b ? 700 : 400, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s',
                          textTransform: 'capitalize',
                        }}
                      >
                        {b === 'both' ? 'Both' : b.charAt(0).toUpperCase() + b.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {authError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{authError}</p>}

                <button
                  onClick={handleManualContinue}
                  style={{
                    padding: '13px', background: primaryColor, color: '#fff', border: 'none',
                    borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 4,
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: UPLOAD ───────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                {user?.picture && <img src={user.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />}
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#111827' }}>Upload Ledger Files</h2>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>Hi {user?.name} 👋 Upload your broker ledger files below</p>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 18px', marginTop: 20, marginBottom: 24 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: primaryColor, margin: '0 0 6px' }}>How to download your ledger:</p>
                <p style={{ fontSize: '0.82rem', color: '#374151', margin: '2px 0' }}>
                  <strong>Zerodha:</strong> Console → Reports → Ledger → Download CSV
                </p>
                <p style={{ fontSize: '0.82rem', color: '#374151', margin: '2px 0' }}>
                  <strong>Groww:</strong> Profile → Reports → Account Statement → Download PDF
                </p>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? primaryColor : '#d1d5db'}`,
                  borderRadius: 12, padding: '36px 24px', textAlign: 'center',
                  background: isDragging ? '#eff6ff' : '#fafafa', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="40" height="40" fill="none" stroke={isDragging ? primaryColor : '#9ca3af'} viewBox="0 0 24 24" style={{ margin: '0 auto 12px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p style={{ fontWeight: 600, color: isDragging ? primaryColor : '#374151', margin: '0 0 4px' }}>
                  Drop files here or click to browse
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>
                  Zerodha CSV and Groww PDF files supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.pdf"
                  onChange={e => e.target.files && addFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: f.broker === 'zerodha' ? '#dcfce7' : f.broker === 'groww' ? '#fef3c7' : '#f3f4f6',
                        fontSize: '0.7rem', fontWeight: 700,
                        color: f.broker === 'zerodha' ? '#16a34a' : f.broker === 'groww' ? '#d97706' : '#6b7280',
                      }}>
                        {f.broker === 'zerodha' ? 'CSV' : f.broker === 'groww' ? 'PDF' : '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.file.name}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', textTransform: 'capitalize' }}>
                          {f.broker === 'unknown' ? 'Unknown broker' : `${f.broker} • ${(f.file.size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                      <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4, fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => setStep('auth')} style={{ flex: 1, padding: '13px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back
                </button>
                <button
                  onClick={advanceToDetails}
                  disabled={files.length === 0}
                  style={{
                    flex: 2, padding: '13px', background: files.length > 0 ? primaryColor : '#d1d5db',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem',
                    cursor: files.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue ({files.length} file{files.length !== 1 ? 's' : ''}) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: DETAILS ──────────────────────────────────────────────── */}
        {step === 'details' && (
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 6, color: '#111827' }}>A Few More Details</h2>
              <p style={{ color: '#6b7280', marginBottom: 28, fontSize: '0.9rem' }}>
                This is needed to complete your XIRR calculation
              </p>

              {/* PAN Password — only if Groww files */}
              {hasGrowwFiles() && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Groww PDF Password (your PAN number)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={password}
                    onChange={e => setPassword(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none', letterSpacing: 2, boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '6px 0 0' }}>
                    Groww PDFs are password protected with your PAN. We never store this.
                  </p>
                </div>
              )}

              {/* Current Holdings */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Current holdings value (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 650000"
                  value={holdings}
                  onChange={e => setHoldings(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '6px 0 0' }}>
                  Current market value of all your stocks/holdings
                </p>
              </div>

              {/* Available Cash */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Available cash in broker account (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12000"
                  value={cash}
                  onChange={e => setCash(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {processingError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{processingError}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: '13px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back
                </button>
                <button
                  onClick={startProcessing}
                  disabled={!holdings}
                  style={{
                    flex: 2, padding: '13px', background: holdings ? primaryColor : '#d1d5db',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem',
                    cursor: holdings ? 'pointer' : 'not-allowed',
                  }}
                >
                  Calculate My XIRR →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PROCESSING ───────────────────────────────────────────── */}
        {step === 'processing' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              {/* Animated spinner */}
              <div style={{ width: 72, height: 72, margin: '0 auto 28px', position: 'relative' }}>
                <svg width="72" height="72" viewBox="0 0 72 72" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke={primaryColor} strokeWidth="6"
                    strokeDasharray="80 110" strokeLinecap="round" />
                </svg>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: '#111827' }}>Analysing your portfolio</h2>
              <p style={{ color: '#6b7280', marginBottom: 36, fontSize: '0.9rem' }}>
                This usually takes 20–30 seconds. You can close this tab — we'll email you the report.
              </p>

              {/* Progress Steps */}
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {processingSteps.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: s.status === 'done' ? '#dcfce7' : s.status === 'active' ? primaryColor : '#f3f4f6',
                      border: s.status === 'active' ? `2px solid ${primaryColor}` : '2px solid transparent',
                      transition: 'all 0.3s',
                    }}>
                      {s.status === 'done' && <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>✓</span>}
                      {s.status === 'active' && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{i + 1}</span>}
                      {s.status === 'pending' && <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>{i + 1}</span>}
                    </div>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: s.status === 'active' ? 700 : 400,
                      color: s.status === 'done' ? '#16a34a' : s.status === 'active' ? '#111827' : '#9ca3af',
                      transition: 'all 0.3s',
                    }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: RESULTS ──────────────────────────────────────────────── */}
        {step === 'results' && results && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Main card */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              {/* Header */}
              <div style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #155a8a 100%)`, padding: '32px 40px', color: '#fff' }}>
                <p style={{ margin: '0 0 4px', opacity: 0.8, fontSize: '0.9rem' }}>Hi {user?.name}, here are your results</p>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Your Portfolio Analysis</h2>
              </div>

              {/* XIRR Comparison */}
              <div style={{ padding: '32px 40px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Your XIRR */}
                  <div style={{ textAlign: 'center', padding: '24px 20px', background: '#eff6ff', borderRadius: 12, border: `2px solid ${primaryColor}` }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Your XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: primaryColor, lineHeight: 1 }}>
                      {results.xirr.toFixed(1)}%
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>annualised return</p>
                  </div>
                  {/* Nifty XIRR */}
                  <div style={{ textAlign: 'center', padding: '24px 20px', background: '#f9fafb', borderRadius: 12, border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Nifty 50 XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: '#374151', lineHeight: 1 }}>
                      {results.nifty_xirr.toFixed(1)}%
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>same cash flows</p>
                  </div>
                </div>

                {/* Beat/miss badge */}
                <div style={{
                  marginTop: 16, padding: '12px 20px', borderRadius: 10, textAlign: 'center',
                  background: results.xirr >= results.nifty_xirr ? '#dcfce7' : '#fef3c7',
                }}>
                  {results.xirr >= results.nifty_xirr ? (
                    <p style={{ margin: 0, fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>
                      You beat Nifty 50 by {(results.xirr - results.nifty_xirr).toFixed(1)}% 🎉
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontWeight: 700, color: '#d97706', fontSize: '0.95rem' }}>
                      Nifty 50 beat you by {(results.nifty_xirr - results.xirr).toFixed(1)}% — consider index funds
                    </p>
                  )}
                </div>
              </div>

              {/* Portfolio Stats */}
              <div style={{ padding: '28px 40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: 'Total Invested', value: formatINR(results.total_invested) },
                  { label: 'Current Value', value: formatINR(results.current_value) },
                  { label: 'Net Gain', value: formatINR(results.net_gain), positive: results.net_gain >= 0 },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: stat.positive !== undefined ? (stat.positive ? '#16a34a' : '#ef4444') : '#111827' }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 14 }}>
              <a
                href={results.report_url}
                download
                style={{
                  flex: 2, padding: '15px', background: primaryColor, color: '#fff', borderRadius: 10,
                  fontWeight: 700, fontSize: '1rem', textAlign: 'center', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </a>
              <button
                onClick={() => { setStep('auth'); setFiles([]); setResults(null); setHoldings(''); setCash(''); setPassword(''); }}
                style={{ flex: 1, padding: '15px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
              >
                New Calculation
              </button>
            </div>

            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem', marginTop: 16 }}>
              Report also sent to {user?.email}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
