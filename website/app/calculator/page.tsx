'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaTrophy, FaDumbbell, FaChartLine } from 'react-icons/fa';

const GOOGLE_CLIENT_ID = '1030081614603-onnmmupafevkn0hojoj4qk023tuohius.apps.googleusercontent.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type Step = 'auth' | 'upload' | 'details' | 'processing' | 'results';

interface User {
  name: string;
  email: string;
  picture?: string;
  googleToken?: string;
}

interface UploadedFile {
  file: File;
  broker: 'zerodha' | 'groww' | 'unknown';
  hash: string;
}

interface Account {
  id: string;
  name: string;
  broker: 'zerodha' | 'groww';
  fileNames: string[];
  holdings: string;
  cash: string;
}

interface ProcessingStep {
  key: string;
  label: string;
  status: 'pending' | 'active' | 'done';
}

interface Results {
  xirr: number | null;
  nifty_xirr: number | null;
  total_invested: number;
  current_value: number;
  net_gain: number;
  investment_period_days: number | null;
  investment_period_years: number | null;
  report_url: string;
}

function formatPeriod(years: number | null): string {
  if (!years) return 'N/A';
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y}yr ${m}mo`;
}

function getInsight(xirr: number | null, niftyXirr: number | null, years: number | null) {
  if (xirr == null || niftyXirr == null) return null;
  const period = years ?? 0;
  const diff = (xirr - niftyXirr).toFixed(1);
  if (xirr >= niftyXirr) {
    return {
      Icon: FaTrophy,
      title: `You beat Nifty 50 by ${diff}%!`,
      body: `Congratulations${period >= 5 ? ` — ${Math.floor(period)} years of disciplined investing is paying off` : ''}! You're outperforming the benchmark that beats most professional fund managers. Keep it up!`,
      bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)',
      iconColor: '#10b981', titleColor: '#10b981', bodyColor: '#6ee7b7',
    };
  }
  if (period < 5) {
    return {
      Icon: FaDumbbell,
      title: 'Keep building your skills!',
      body: `You're ${formatPeriod(years)} into your investing journey. Nifty 50 is a tough benchmark — many investors only start beating it after 5+ years of experience. Stay consistent!`,
      bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',
      iconColor: '#f59e0b', titleColor: '#f59e0b', bodyColor: '#fcd34d',
    };
  }
  return {
    Icon: FaChartLine,
    title: 'Consider shifting to index funds.',
    body: `After ${formatPeriod(years)}, Nifty 50 has consistently outperformed your portfolio by ${Math.abs(parseFloat(diff))}%. Index funds match the market automatically — it may be the smarter long-term move.`,
    bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
    iconColor: '#ef4444', titleColor: '#ef4444', bodyColor: '#fca5a5',
  };
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

async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function detectBroker(file: File): 'zerodha' | 'groww' | 'unknown' {
  const name = file.name.toLowerCase();
  if (file.type === 'text/csv' || name.endsWith('.csv')) return 'zerodha';
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'groww';
  return 'unknown';
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function buildAccounts(files: UploadedFile[], filePans: Record<string, string>, existing: Account[]): Account[] {
  const accounts: Account[] = [];
  const existingMap = new Map(existing.map(a => [a.id, a]));

  files.filter(f => f.broker === 'zerodha').forEach(f => {
    const id = f.file.name;
    const prev = existingMap.get(id);
    accounts.push({
      id,
      name: `Zerodha — ${f.file.name.replace(/\.csv$/i, '')}`,
      broker: 'zerodha',
      fileNames: [f.file.name],
      holdings: prev?.holdings ?? '',
      cash: prev?.cash ?? '',
    });
  });

  const growwByPan: Record<string, string[]> = {};
  files.filter(f => f.broker === 'groww').forEach(f => {
    const pan = (filePans[f.file.name] ?? '').trim().toUpperCase() || `__ungrouped__${f.file.name}`;
    if (!growwByPan[pan]) growwByPan[pan] = [];
    growwByPan[pan].push(f.file.name);
  });

  Object.entries(growwByPan).forEach(([pan, fileNames]) => {
    const isUngrouped = pan.startsWith('__ungrouped__');
    const id = isUngrouped ? fileNames[0] : pan;
    const prev = existingMap.get(id);
    accounts.push({
      id,
      name: isUngrouped
        ? `Groww — ${fileNames[0].replace(/\.pdf$/i, '')} (enter PAN above)`
        : `Groww — ${pan} (${fileNames.length} file${fileNames.length > 1 ? 's' : ''})`,
      broker: 'groww',
      fileNames,
      holdings: prev?.holdings ?? '',
      cash: prev?.cash ?? '',
    });
  });

  return accounts;
}

/* ── Shared style tokens ── */
const GOLD = '#f59e0b';
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
};
const innerCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
};
const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  outline: 'none',
};
const btnPrimary: React.CSSProperties = {
  background: GOLD, color: '#0a1020',
  border: 'none', borderRadius: 8,
  fontWeight: 700, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#94a3b8', borderRadius: 8,
  fontWeight: 600, cursor: 'pointer',
};

export default function CalculatorPage() {
  const [step, setStep] = useState<Step>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [filePans, setFilePans] = useState<Record<string, string>>({});
  const [samePanForAll, setSamePanForAll] = useState(false);
  const [sharedPan, setSharedPan] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [panValidationErrors, setPanValidationErrors] = useState<Record<string, string>>({});
  const [panValidationStatus, setPanValidationStatus] = useState<Record<string, 'idle' | 'validating' | 'valid' | 'invalid'>>({});
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

  const growwFiles = useMemo(() => files.filter(f => f.broker === 'groww'), [files]);

  const effectivePans = useMemo(() => {
    if (samePanForAll) return Object.fromEntries(growwFiles.map(f => [f.file.name, sharedPan.toUpperCase()]));
    return filePans;
  }, [samePanForAll, sharedPan, filePans, growwFiles]);

  const allGrowwPansEntered = growwFiles.length === 0 || (
    samePanForAll
      ? sharedPan.trim().length === 10
      : growwFiles.every(f => (filePans[f.file.name] ?? '').trim().length === 10)
  );

  const allGrowwPansValid = growwFiles.length === 0 || (
    allGrowwPansEntered && (
      samePanForAll
        ? panValidationStatus['__shared__'] === 'valid'
        : growwFiles.every(f => panValidationStatus[f.file.name] === 'valid')
    )
  );

  useEffect(() => {
    setAccounts(prev => buildAccounts(files, effectivePans, prev));
  }, [files, effectivePans]);

  const allHoldingsEntered = accounts.length > 0 && accounts.every(a => a.holdings.trim() !== '');

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
        theme: 'filled_black', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular',
      });
    };
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    if (step === 'auth' && window.google) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular',
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
    setAuthError('');
    setUser({ name: manualName.trim(), email: manualEmail.trim() });
    setStep('upload');
  }

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    const withHashes = await Promise.all(
      Array.from(incoming).map(async file => ({
        file, broker: detectBroker(file), hash: await hashFile(file),
      }))
    );
    setFiles(prev => {
      const existingHashes = new Set(prev.map(f => f.hash));
      const existingNames = new Set(prev.map(f => f.file.name));
      const dupes = withHashes.filter(f => existingHashes.has(f.hash));
      const toAdd = withHashes.filter(f => !existingHashes.has(f.hash) && !existingNames.has(f.file.name));
      if (dupes.length > 0) {
        const names = dupes.map(f => `"${f.file.name}"`).join(', ');
        setDuplicateWarning(`${names} skipped — identical file already added.`);
        setTimeout(() => setDuplicateWarning(''), 5000);
      }
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });
  }, []);

  function removeFile(index: number) {
    const removed = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (removed.broker === 'groww') {
      setFilePans(prev => { const next = { ...prev }; delete next[removed.file.name]; return next; });
    }
  }

  function updateFilePan(fileName: string, pan: string) {
    const upper = pan.toUpperCase();
    setFilePans(prev => ({ ...prev, [fileName]: upper }));
    if (upper.length === 10) {
      const uf = files.find(f => f.file.name === fileName);
      if (uf) validateSinglePan(fileName, upper, [uf]);
    } else {
      setPanValidationStatus(prev => ({ ...prev, [fileName]: 'idle' }));
      setPanValidationErrors(prev => { const next = { ...prev }; delete next[fileName]; return next; });
    }
  }

  function updateAccount(id: string, field: 'holdings' | 'cash', value: string) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function validateSinglePan(key: string, pan: string, filesToCheck: UploadedFile[]) {
    setPanValidationStatus(prev => ({ ...prev, [key]: 'validating' }));
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      for (const uf of filesToCheck) {
        const data = await uf.file.arrayBuffer();
        await pdfjsLib.getDocument({ data, password: pan }).promise;
      }
      setPanValidationStatus(prev => ({ ...prev, [key]: 'valid' }));
      setPanValidationErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'PasswordException') {
        setPanValidationStatus(prev => ({ ...prev, [key]: 'invalid' }));
        setPanValidationErrors(prev => ({ ...prev, [key]: 'Incorrect PAN — could not unlock this file' }));
      } else {
        setPanValidationStatus(prev => ({ ...prev, [key]: 'valid' }));
      }
    }
  }

  async function startProcessing() {
    if (!allHoldingsEntered) return;
    setProcessingError('');
    setStep('processing');
    setProcessingSteps(prev => prev.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' })));

    try {
      const fileList = files.map(f => ({ name: f.file.name, type: f.file.type || 'application/octet-stream' }));
      const sessionRes = await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileList }),
      });
      if (!sessionRes.ok) throw new Error('Failed to create session — please try again.');
      const { session_id, upload_urls } = await sessionRes.json();

      const keyMap: Record<string, string> = {};
      await Promise.all(
        (upload_urls as { name: string; url: string; key: string }[]).map(async ({ name, url, key }) => {
          const uf = files.find(f => f.file.name === name);
          if (!uf) return;
          const putRes = await fetch(url, {
            method: 'PUT', body: uf.file,
            headers: { 'Content-Type': uf.file.type || 'application/octet-stream' },
          });
          if (!putRes.ok) throw new Error(`Failed to upload ${name}`);
          keyMap[name] = key;
        })
      );

      const detectedBrokers = [...new Set(files.map(f => f.broker).filter(b => b !== 'unknown'))];
      const detectedBroker = detectedBrokers.join(',') || 'unknown';
      fetch('/api/save-user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, name: user?.name, email: user?.email, broker: detectedBroker, google_token: user?.googleToken }),
      }).catch(() => {});

      const accountsPayload = accounts.map(acc => ({
        broker: acc.broker,
        pan: acc.broker === 'groww' ? acc.id : null,
        pan_password: acc.broker === 'groww' ? acc.id : null,
        file_keys: acc.fileNames.map(n => keyMap[n]).filter(Boolean),
        holdings: parseFloat(acc.holdings) || 0,
        cash: parseFloat(acc.cash) || 0,
      }));

      const processRes = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, name: user?.name, email: user?.email, accounts: accountsPayload }),
      });
      if (!processRes.ok) throw new Error('Failed to start processing — please try again.');
      pollStatus(session_id);
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('details');
    }
  }

  function pollStatus(sid: string) {
    const statusUrl = `https://xirrledger-jobs.s3.ap-south-1.amazonaws.com/jobs/${sid}/status.json`;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(statusUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'pending') return;
        setProcessingSteps(prev =>
          prev.map(s => ({
            ...s,
            status: s.key === data.status ? 'active'
              : PROCESSING_STEPS.findIndex(p => p.key === s.key) < PROCESSING_STEPS.findIndex(p => p.key === data.status) ? 'done'
              : 'pending',
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  function resetAll() {
    setStep('auth');
    setFiles([]);
    setFilePans({});
    setSamePanForAll(false);
    setSharedPan('');
    setAccounts([]);
    setResults(null);
    setProcessingSteps(PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' as const })));
  }

  const STEPS_LABELS = ['Sign In', 'Upload', 'Details'];
  const stepIndex: Record<Step, number> = { auth: 0, upload: 1, details: 2, processing: 3, results: 4 };

  /* ── pan input border helper ── */
  function panBorder(key: string) {
    const s = panValidationStatus[key];
    if (s === 'valid')      return '1.5px solid #10b981';
    if (s === 'invalid')    return '1.5px solid #ef4444';
    if (s === 'validating') return `1.5px solid ${GOLD}`;
    return '1.5px solid rgba(255,255,255,0.12)';
  }
  function panBg(key: string) {
    const s = panValidationStatus[key];
    if (s === 'valid')   return 'rgba(16,185,129,0.08)';
    if (s === 'invalid') return 'rgba(239,68,68,0.08)';
    return 'rgba(255,255,255,0.06)';
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Page header ── */}
      <div style={{ background: '#0a1020', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '20px 0' }}>
        <div className="container-custom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(245,158,11,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 18, height: 18, color: GOLD }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>XIRR Calculator</h1>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.8rem' }}>
                Upload your broker ledger and get your true returns in seconds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step indicator ── */}
      {step !== 'processing' && step !== 'results' && (
        <div style={{ background: '#0d1526', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 0' }}>
          <div className="container-custom">
            <div style={{ display: 'flex', alignItems: 'center', maxWidth: 400 }}>
              {STEPS_LABELS.map((label, i) => {
                const current = stepIndex[step];
                const done = i < current;
                const active = i === current;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS_LABELS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? 'rgba(16,185,129,0.15)' : active ? GOLD : 'rgba(255,255,255,0.06)',
                        color: done ? '#10b981' : active ? '#0a1020' : '#475569',
                        fontSize: '0.8rem', fontWeight: 700,
                        border: done ? '1.5px solid rgba(16,185,129,0.3)' : active ? 'none' : '1.5px solid rgba(255,255,255,0.08)',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: active ? 700 : 400, color: active ? GOLD : done ? '#64748b' : '#334155', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS_LABELS.length - 1 && (
                      <div style={{ flex: 1, height: 1.5, background: done ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)', margin: '0 8px', marginBottom: 20 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="container-custom" style={{ paddingTop: 36, paddingBottom: 60 }}>

        {/* ── STEP 1: AUTH ── */}
        {step === 'auth' && (
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div style={{ ...card, padding: 36 }}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 100, padding: '3px 12px', fontSize: 11, fontWeight: 600, color: GOLD, marginBottom: 16 }}>
                  ✦ Step 1 of 3
                </div>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6, color: '#ffffff' }}>Get Started</h2>
              <p style={{ color: '#64748b', marginBottom: 28, fontSize: '0.9rem' }}>
                We'll email your report so you can close this tab any time
              </p>

              {/* Google Sign-In */}
              <div ref={googleBtnRef} style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ color: '#334155', fontSize: '0.82rem' }}>or continue manually</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="text" placeholder="Your name" value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  style={{ ...inputBase, padding: '12px 14px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  type="email" placeholder="Your email" value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  style={{ ...inputBase, padding: '12px 14px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                />
                {authError && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{authError}</p>}
                <button onClick={handleManualContinue} style={{ ...btnPrimary, padding: '13px', fontSize: '0.95rem', marginTop: 4 }}>
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: UPLOAD ── */}
        {step === 'upload' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ ...card, padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                {user?.picture && <img src={user.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)' }} />}
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Upload Ledger Files</h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.82rem' }}>Hi {user?.name} · Upload your broker ledger files below</p>
                </div>
              </div>

              {/* Info box */}
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 22 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: GOLD, margin: '0 0 6px' }}>How to download your ledger:</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Zerodha:</span> Console → Reports → Ledger → Download CSV
                </p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Groww:</span> Profile → Reports → Account Statement → Download PDF
                </p>
                <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: 6 }}>You can upload multiple files — across brokers and years</p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? GOLD : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                  background: isDragging ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <svg width="38" height="38" fill="none" stroke={isDragging ? GOLD : '#475569'} viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p style={{ fontWeight: 600, color: isDragging ? GOLD : '#94a3b8', margin: '0 0 4px', fontSize: '0.9rem' }}>
                  Drop files here or click to browse
                </p>
                <p style={{ color: '#334155', fontSize: '0.78rem', margin: 0 }}>
                  Zerodha CSV and Groww PDF files supported
                </p>
                <input ref={fileInputRef} type="file" multiple accept=".csv,.pdf"
                  onChange={e => e.target.files && addFiles(e.target.files)} style={{ display: 'none' }} />
              </div>

              {duplicateWarning && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: GOLD, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚠️ {duplicateWarning}
                </div>
              )}

              {files.length > 0 && (
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', ...innerCard }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: f.broker === 'zerodha' ? 'rgba(16,185,129,0.15)' : f.broker === 'groww' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                        fontSize: '0.65rem', fontWeight: 700,
                        color: f.broker === 'zerodha' ? '#10b981' : f.broker === 'groww' ? GOLD : '#64748b',
                      }}>
                        {f.broker === 'zerodha' ? 'CSV' : f.broker === 'groww' ? 'PDF' : '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', textTransform: 'capitalize' }}>
                          {f.broker === 'unknown' ? 'Unknown file type' : `${f.broker} · ${(f.file.size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                      <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={() => setStep('auth')} style={{ ...btnSecondary, flex: 1, padding: 12, fontSize: '0.9rem' }}>
                  ← Back
                </button>
                <button onClick={() => setStep('details')} disabled={files.length === 0} style={{
                  ...btnPrimary, flex: 2, padding: 12, fontSize: '0.9rem',
                  background: files.length > 0 ? GOLD : 'rgba(255,255,255,0.08)',
                  color: files.length > 0 ? '#0a1020' : '#334155',
                  cursor: files.length > 0 ? 'pointer' : 'not-allowed',
                }}>
                  Continue ({files.length} file{files.length !== 1 ? 's' : ''}) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: DETAILS ── */}
        {step === 'details' && (
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Section A: Groww PANs */}
            {growwFiles.length > 0 && (
              <div style={{ ...card, padding: 28 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: '#ffffff' }}>
                  Identify Your Groww Accounts
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.845rem', marginBottom: 18 }}>
                  Enter the PAN for each Groww PDF. Files with the same PAN will be merged into one account.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16, userSelect: 'none' }}>
                  <input
                    type="checkbox" checked={samePanForAll}
                    onChange={e => setSamePanForAll(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: GOLD, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>Same PAN for all Groww files</span>
                </label>

                {samePanForAll ? (
                  <div style={{ ...innerCard, padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#475569' }}>
                      Applies to all {growwFiles.length} Groww file{growwFiles.length > 1 ? 's' : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', flexShrink: 0 }}>PAN:</label>
                      <input
                        type="text" placeholder="e.g. ABCDE1234F" value={sharedPan} maxLength={10}
                        onChange={e => {
                          const pan = e.target.value.toUpperCase();
                          setSharedPan(pan);
                          if (pan.length === 10) validateSinglePan('__shared__', pan, growwFiles);
                          else {
                            setPanValidationStatus(prev => ({ ...prev, '__shared__': 'idle' }));
                            setPanValidationErrors({});
                          }
                        }}
                        style={{ ...inputBase, flex: 1, padding: '9px 12px', fontSize: '0.9rem', letterSpacing: 3, fontFamily: 'monospace', border: panBorder('__shared__'), background: panBg('__shared__') }}
                      />
                      {panValidationStatus['__shared__'] === 'validating' && <span style={{ color: GOLD }}>⏳</span>}
                      {panValidationStatus['__shared__'] === 'valid'      && <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>}
                      {panValidationStatus['__shared__'] === 'invalid'    && <span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span>}
                    </div>
                    {panValidationErrors['__shared__'] && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>{panValidationErrors['__shared__']}</p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {growwFiles.map(f => (
                      <div key={f.file.name} style={{ ...innerCard, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: GOLD, flexShrink: 0 }}>PDF</div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.845rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</p>
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#334155', flexShrink: 0 }}>{(f.file.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', flexShrink: 0 }}>PAN:</label>
                          <input
                            type="text" placeholder="e.g. ABCDE1234F" maxLength={10}
                            value={filePans[f.file.name] ?? ''}
                            onChange={e => updateFilePan(f.file.name, e.target.value)}
                            style={{ ...inputBase, flex: 1, padding: '7px 10px', fontSize: '0.845rem', letterSpacing: 2, fontFamily: 'monospace', border: panBorder(f.file.name), background: panBg(f.file.name) }}
                          />
                          {panValidationStatus[f.file.name] === 'validating' && <span style={{ color: GOLD }}>⏳</span>}
                          {panValidationStatus[f.file.name] === 'valid'      && <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>}
                          {panValidationStatus[f.file.name] === 'invalid'    && <span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span>}
                        </div>
                        {panValidationErrors[f.file.name] && (
                          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{panValidationErrors[f.file.name]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: 10, marginBottom: 0 }}>
                  Your PAN is used only to unlock the PDF. We never store it.
                </p>

                {allGrowwPansEntered && (
                  <div style={{ marginTop: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
                      {accounts.filter(a => a.broker === 'groww').length} Groww account{accounts.filter(a => a.broker === 'groww').length > 1 ? 's' : ''} detected
                    </p>
                    {accounts.filter(a => a.broker === 'groww').map(a => (
                      <p key={a.id} style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>· {a.name}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section B: Holdings + Cash */}
            <div style={{ ...card, padding: 28 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: '#ffffff' }}>Current Values Per Account</h2>
              <p style={{ color: '#64748b', fontSize: '0.845rem', marginBottom: 18 }}>
                Enter the current market value and available cash for each account
              </p>

              {growwFiles.length > 0 && !allGrowwPansEntered ? (
                <div style={{ padding: '20px', ...innerCard, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <p style={{ margin: 0, color: '#334155', fontSize: '0.845rem' }}>
                    Enter PAN numbers above to detect your accounts
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {accounts.map(account => (
                    <div key={account.id} style={{ ...innerCard, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{
                          padding: '2px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                          background: account.broker === 'zerodha' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: account.broker === 'zerodha' ? '#10b981' : GOLD,
                        }}>
                          {account.broker === 'zerodha' ? 'ZERODHA' : 'GROWW'}
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#e2e8f0' }}>
                          {account.name.replace(/^(Zerodha|Groww) — /, '')}
                        </p>
                        {account.fileNames.length > 1 && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#334155' }}>
                            {account.fileNames.length} files merged
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Holdings value (₹) *</label>
                          <input
                            type="number" placeholder="e.g. 350000"
                            value={account.holdings}
                            onChange={e => updateAccount(account.id, 'holdings', e.target.value)}
                            style={{
                              ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box',
                              border: account.holdings ? `1.5px solid rgba(245,158,11,0.4)` : '1.5px solid rgba(255,255,255,0.1)',
                              background: account.holdings ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.04)',
                            }}
                          />
                          <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#334155' }}>Current market value</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Available cash (₹)</label>
                          <input
                            type="number" placeholder="e.g. 12000"
                            value={account.cash}
                            onChange={e => updateAccount(account.id, 'cash', e.target.value)}
                            style={{ ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box' }}
                          />
                          <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#334155' }}>Cash in broker account</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {processingError && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 14 }}>
                  <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{processingError}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={() => setStep('upload')} style={{ ...btnSecondary, flex: 1, padding: 12, fontSize: '0.9rem' }}>
                  ← Back
                </button>
                {allGrowwPansValid && (
                  <button onClick={startProcessing} disabled={!allHoldingsEntered} style={{
                    ...btnPrimary, flex: 2, padding: 12, fontSize: '0.9rem',
                    background: allHoldingsEntered ? GOLD : 'rgba(255,255,255,0.07)',
                    color: allHoldingsEntered ? '#0a1020' : '#334155',
                    cursor: allHoldingsEntered ? 'pointer' : 'not-allowed',
                  }}>
                    Calculate My XIRR →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PROCESSING ── */}
        {step === 'processing' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ ...card, padding: '48px 40px', textAlign: 'center' }}>
              <div style={{ width: 68, height: 68, margin: '0 auto 28px' }}>
                <svg width="68" height="68" viewBox="0 0 72 72" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke={GOLD} strokeWidth="6" strokeDasharray="80 110" strokeLinecap="round" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 6, color: '#ffffff' }}>Analysing your portfolio</h2>
              <p style={{ color: '#64748b', marginBottom: 36, fontSize: '0.875rem' }}>
                Usually takes 20–30 seconds. You can close this tab — we'll email you the report.
              </p>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {processingSteps.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: s.status === 'done' ? 'rgba(16,185,129,0.15)' : s.status === 'active' ? GOLD : 'rgba(255,255,255,0.05)',
                      border: s.status === 'active' ? `2px solid ${GOLD}` : s.status === 'done' ? '1.5px solid rgba(16,185,129,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.3s',
                    }}>
                      {s.status === 'done'    && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
                      {s.status === 'active'  && <span style={{ color: '#0a1020', fontSize: '0.7rem', fontWeight: 700 }}>{i + 1}</span>}
                      {s.status === 'pending' && <span style={{ color: '#334155', fontSize: '0.7rem' }}>{i + 1}</span>}
                    </div>
                    <span style={{
                      fontSize: '0.875rem', fontWeight: s.status === 'active' ? 700 : 400,
                      color: s.status === 'done' ? '#10b981' : s.status === 'active' ? '#e2e8f0' : '#334155',
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

        {/* ── STEP 5: RESULTS ── */}
        {step === 'results' && results && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>

              {/* Results header */}
              <div style={{ background: 'linear-gradient(135deg, #1a1200 0%, #221800 60%, #0f172a 100%)', borderBottom: '1px solid rgba(245,158,11,0.15)', padding: '28px 32px' }}>
                <p style={{ margin: '0 0 3px', color: '#64748b', fontSize: '0.82rem' }}>Hi {user?.name}, here are your results</p>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>Your Portfolio Analysis</h2>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.78rem' }}>
                  {accounts.length} account{accounts.length > 1 ? 's' : ''} analysed
                </p>
              </div>

              {/* XIRR vs Nifty */}
              <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ textAlign: 'center', padding: '22px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 12, border: `1.5px solid rgba(245,158,11,0.3)` }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Your XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: GOLD, lineHeight: 1 }}>
                      {results.xirr != null ? `${results.xirr.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: '#64748b' }}>annualised return</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '22px 16px', ...innerCard }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Nifty 50 XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: '#64748b', lineHeight: 1 }}>
                      {results.nifty_xirr != null ? `${results.nifty_xirr.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: '#475569' }}>same cash flows</p>
                  </div>
                </div>

                {results.xirr != null && results.nifty_xirr != null && (
                  <div style={{
                    marginTop: 14, padding: '11px 18px', borderRadius: 10, textAlign: 'center',
                    background: results.xirr >= results.nifty_xirr ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${results.xirr >= results.nifty_xirr ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}>
                    {results.xirr >= results.nifty_xirr ? (
                      <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>
                        You beat Nifty 50 by {(results.xirr - results.nifty_xirr).toFixed(1)}% 🎉
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontWeight: 700, color: GOLD, fontSize: '0.9rem' }}>
                        Nifty 50 beat you by {(results.nifty_xirr - results.xirr).toFixed(1)}% — consider index funds
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Total Invested',     value: formatINR(results.total_invested) },
                  { label: 'Current Value',       value: formatINR(results.current_value) },
                  { label: 'Net Gain',            value: formatINR(results.net_gain), positive: results.net_gain >= 0 },
                  { label: 'Investment Period',   value: formatPeriod(results.investment_period_years) },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '12px', ...innerCard }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.7rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: stat.positive !== undefined ? (stat.positive ? '#10b981' : '#ef4444') : '#e2e8f0' }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Insight card */}
              {(() => {
                const insight = getInsight(results.xirr, results.nifty_xirr, results.investment_period_years);
                if (!insight) return null;
                return (
                  <div style={{ padding: '20px 28px', background: insight.bg, borderTop: `2px solid ${insight.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <insight.Icon size={16} color={insight.iconColor} />
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: insight.titleColor }}>{insight.title}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: insight.bodyColor, lineHeight: 1.55 }}>{insight.body}</p>
                  </div>
                );
              })()}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <a href={results.report_url} target="_blank" rel="noopener noreferrer" style={{
                flex: 2, padding: '14px', background: GOLD, color: '#0a1020', borderRadius: 10,
                fontWeight: 700, fontSize: '0.95rem', textAlign: 'center', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </a>
              <button onClick={resetAll} style={{ ...btnSecondary, flex: 1, padding: 14, fontSize: '0.9rem' }}>
                New Calculation
              </button>
            </div>

            <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.76rem', marginTop: 14 }}>
              Report also sent to {user?.email}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
