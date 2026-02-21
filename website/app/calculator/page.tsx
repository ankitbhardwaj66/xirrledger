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

// One per unique broker account (PAN for Groww, filename for Zerodha)
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
      bg: '#dcfce7', border: '#86efac', iconColor: '#15803d', titleColor: '#15803d', bodyColor: '#166534',
    };
  }
  if (period < 5) {
    return {
      Icon: FaDumbbell,
      title: 'Keep building your skills!',
      body: `You're ${formatPeriod(years)} into your investing journey. Nifty 50 is a tough benchmark — many investors only start beating it after 5+ years of experience. Stay consistent!`,
      bg: '#fefce8', border: '#fde68a', iconColor: '#a16207', titleColor: '#a16207', bodyColor: '#854d0e',
    };
  }
  return {
    Icon: FaChartLine,
    title: 'Consider shifting to index funds.',
    body: `After ${formatPeriod(years)}, Nifty 50 has consistently outperformed your portfolio by ${Math.abs(parseFloat(diff))}%. Index funds match the market automatically — it may be the smarter long-term move.`,
    bg: '#fff7ed', border: '#fed7aa', iconColor: '#c2410c', titleColor: '#c2410c', bodyColor: '#9a3412',
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

// Derives accounts from uploaded files + entered PANs
function buildAccounts(files: UploadedFile[], filePans: Record<string, string>, existing: Account[]): Account[] {
  const accounts: Account[] = [];
  const existingMap = new Map(existing.map(a => [a.id, a]));

  // Zerodha: each CSV = one account
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

  // Groww: group by PAN (files with same PAN = same account)
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

export default function CalculatorPage() {
  const [step, setStep] = useState<Step>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // PAN per Groww PDF filename
  const [filePans, setFilePans] = useState<Record<string, string>>({});
  const [samePanForAll, setSamePanForAll] = useState(false);
  const [sharedPan, setSharedPan] = useState('');

  // Per-account holdings + cash — derived from files+PANs, user edits holdings/cash
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

  // Effective PAN map — when samePanForAll, all files get sharedPan
  const effectivePans = useMemo(() => {
    if (samePanForAll) {
      return Object.fromEntries(growwFiles.map(f => [f.file.name, sharedPan.toUpperCase()]));
    }
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

  // Recompute accounts whenever files or effective PANs change, preserving holdings/cash
  useEffect(() => {
    setAccounts(prev => buildAccounts(files, effectivePans, prev));
  }, [files, effectivePans]);
  const allHoldingsEntered = accounts.length > 0 && accounts.every(a => a.holdings.trim() !== '');

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
        theme: 'outline', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular',
      });
    };
    return () => { document.head.removeChild(script); };
  }, []);

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
    setAuthError('');
    setUser({ name: manualName.trim(), email: manualEmail.trim() });
    setStep('upload');
  }

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    const withHashes = await Promise.all(
      Array.from(incoming).map(async file => ({
        file,
        broker: detectBroker(file),
        hash: await hashFile(file),
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
        // Non-password error (corrupt PDF etc.) — let it through
        setPanValidationStatus(prev => ({ ...prev, [key]: 'valid' }));
      }
    }
  }

  async function startProcessing() {
    if (!allHoldingsEntered) return;
    setProcessingError('');
    setStep('processing');

    // Mark "Uploading" as active immediately
    setProcessingSteps(prev => prev.map((s, i) => ({
      ...s, status: i === 0 ? 'active' : 'pending',
    })));

    try {
      // 1. Create session + get presigned S3 upload URLs
      const fileList = files.map(f => ({
        name: f.file.name,
        type: f.file.type || 'application/octet-stream',
      }));
      const sessionRes = await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileList }),
      });
      if (!sessionRes.ok) throw new Error('Failed to create session — please try again.');
      const { session_id, upload_urls } = await sessionRes.json();

      // 2. Upload files directly to S3 via presigned PUT URLs
      const keyMap: Record<string, string> = {};
      await Promise.all(
        (upload_urls as { name: string; url: string; key: string }[]).map(async ({ name, url, key }) => {
          const uf = files.find(f => f.file.name === name);
          if (!uf) return;
          const putRes = await fetch(url, {
            method: 'PUT',
            body: uf.file,
            headers: { 'Content-Type': uf.file.type || 'application/octet-stream' },
          });
          if (!putRes.ok) throw new Error(`Failed to upload ${name}`);
          keyMap[name] = key;
        })
      );

      // 3. Save user to Hostinger PHP bridge (non-blocking — fire and forget)
      const detectedBrokers = [...new Set(files.map(f => f.broker).filter(b => b !== 'unknown'))];
      const detectedBroker = detectedBrokers.join(',') || 'unknown';
      fetch('/api/save-user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          name: user?.name,
          email: user?.email,
          broker: detectedBroker,
          google_token: user?.googleToken,
        }),
      }).catch(() => {}); // ignore failures — user data logging is best-effort

      // 4. Build accounts payload for Lambda /process
      const accountsPayload = accounts.map(acc => {
        // For Groww accounts grouped by PAN, id === pan (see buildAccounts)
        const pan = acc.broker === 'groww' ? acc.id : null;
        return {
          broker: acc.broker,
          pan,
          pan_password: pan, // Groww PDF password = PAN
          file_keys: acc.fileNames.map(n => keyMap[n]).filter(Boolean),
          holdings: parseFloat(acc.holdings) || 0,
          cash: parseFloat(acc.cash) || 0,
        };
      });

      // 5. Trigger async Lambda processing
      const processRes = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          name: user?.name,
          email: user?.email,
          accounts: accountsPayload,
        }),
      });
      if (!processRes.ok) throw new Error('Failed to start processing — please try again.');

      // 6. Start polling S3 jobs bucket for status updates
      pollStatus(session_id);
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('details');
    }
  }

  function pollStatus(sid: string) {
    // Jobs bucket is publicly readable — poll directly without going through API Gateway
    const statusUrl = `https://xirrledger-jobs.s3.ap-south-1.amazonaws.com/jobs/${sid}/status.json`;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(statusUrl, { cache: 'no-store' });
        if (!res.ok) return; // not written yet — keep polling
        const data = await res.json();
        // Lambda writes status:"pending" initially — not a step key, so skip UI update
        // to preserve the 'active' state already set on step 1 (Uploading)
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
      } catch {} // network hiccup — keep polling
    }, 2000);
  }

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Scroll to top whenever the step changes
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

  const primaryColor = '#1f77b4';
  const STEPS_LABELS = ['Sign In', 'Upload', 'Details'];
  const stepIndex: Record<Step, number> = { auth: 0, upload: 1, details: 2, processing: 3, results: 4 };

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
            <div style={{ display: 'flex', alignItems: 'center', maxWidth: 480 }}>
              {STEPS_LABELS.map((label, i) => {
                const current = stepIndex[step];
                const done = i < current;
                const active = i === current;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS_LABELS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done || active ? primaryColor : '#e5e7eb',
                        color: done || active ? '#fff' : '#9ca3af', fontSize: '0.85rem', fontWeight: 700,
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 400, color: active ? primaryColor : done ? '#374151' : '#9ca3af', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS_LABELS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: done ? primaryColor : '#e5e7eb', margin: '0 8px', marginBottom: 20 }} />
                    )}
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
              <div ref={googleBtnRef} style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>or continue manually</span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="text" placeholder="Your name" value={manualName} onChange={e => setManualName(e.target.value)}
                  style={{ padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }} />
                <input type="email" placeholder="Your email" value={manualEmail} onChange={e => setManualEmail(e.target.value)}
                  style={{ padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }} />
                {authError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{authError}</p>}
                <button onClick={handleManualContinue} style={{
                  padding: '13px', background: primaryColor, color: '#fff', border: 'none',
                  borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 4,
                }}>
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
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>Hi {user?.name} 👋  Upload all your broker ledger files below</p>
                </div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 18px', marginTop: 20, marginBottom: 24 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: primaryColor, margin: '0 0 6px' }}>How to download your ledger:</p>
                <p style={{ fontSize: '0.82rem', color: '#374151', margin: '2px 0' }}>
                  <strong>Zerodha:</strong> Console → Reports → Ledger → Download CSV
                </p>
                <p style={{ fontSize: '0.82rem', color: '#374151', margin: '2px 0' }}>
                  <strong>Groww:</strong> Profile → Reports → Account Statement → Download PDF
                </p>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 6 }}>
                  You can upload multiple files — across brokers and years
                </p>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? primaryColor : '#d1d5db'}`,
                  borderRadius: 12, padding: '36px 24px', textAlign: 'center',
                  background: isDragging ? '#eff6ff' : '#fafafa', cursor: 'pointer', transition: 'all 0.2s',
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
                <input ref={fileInputRef} type="file" multiple accept=".csv,.pdf"
                  onChange={e => e.target.files && addFiles(e.target.files)} style={{ display: 'none' }} />
              </div>
              {duplicateWarning && (
                <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <span>{duplicateWarning}</span>
                </div>
              )}
              {files.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: f.broker === 'zerodha' ? '#dcfce7' : f.broker === 'groww' ? '#fef3c7' : '#f3f4f6',
                        fontSize: '0.7rem', fontWeight: 700,
                        color: f.broker === 'zerodha' ? '#16a34a' : f.broker === 'groww' ? '#d97706' : '#6b7280',
                      }}>
                        {f.broker === 'zerodha' ? 'CSV' : f.broker === 'groww' ? 'PDF' : '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', textTransform: 'capitalize' }}>
                          {f.broker === 'unknown' ? 'Unknown file type' : `${f.broker} • ${(f.file.size / 1024).toFixed(0)} KB`}
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
                <button onClick={() => setStep('details')} disabled={files.length === 0} style={{
                  flex: 2, padding: '13px', background: files.length > 0 ? primaryColor : '#d1d5db',
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem',
                  cursor: files.length > 0 ? 'pointer' : 'not-allowed',
                }}>
                  Continue ({files.length} file{files.length !== 1 ? 's' : ''}) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: DETAILS ──────────────────────────────────────────────── */}
        {step === 'details' && (
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Section A: Groww PANs (only if Groww files exist) ── */}
            {growwFiles.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6, color: '#111827' }}>
                  Identify Your Groww Accounts
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20 }}>
                  Enter the PAN for each Groww PDF. Files with the same PAN will be merged into one account.
                </p>

                {/* Same PAN checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16, userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={samePanForAll}
                    onChange={e => setSamePanForAll(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: primaryColor, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Same PAN for all Groww files
                  </span>
                </label>

                {samePanForAll ? (
                  /* Single shared PAN input */
                  <div style={{ background: '#fafafa', borderRadius: 10, padding: '16px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#6b7280' }}>
                      Applies to all {growwFiles.length} Groww file{growwFiles.length > 1 ? 's' : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>PAN:</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={sharedPan}
                        onChange={e => {
                          const pan = e.target.value.toUpperCase();
                          setSharedPan(pan);
                          if (pan.length === 10) {
                            validateSinglePan('__shared__', pan, growwFiles);
                          } else {
                            setPanValidationStatus(prev => ({ ...prev, '__shared__': 'idle' }));
                            setPanValidationErrors({});
                          }
                        }}
                        maxLength={10}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 6, fontSize: '0.95rem', outline: 'none', letterSpacing: 3, fontFamily: 'monospace',
                          border: `1.5px solid ${panValidationStatus['__shared__'] === 'valid' ? '#16a34a' : panValidationStatus['__shared__'] === 'invalid' ? '#dc2626' : panValidationStatus['__shared__'] === 'validating' ? '#f59e0b' : '#e5e7eb'}`,
                          background: panValidationStatus['__shared__'] === 'valid' ? '#f0fdf4' : panValidationStatus['__shared__'] === 'invalid' ? '#fef2f2' : '#fff',
                        }}
                      />
                      {panValidationStatus['__shared__'] === 'validating' && <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>⏳</span>}
                      {panValidationStatus['__shared__'] === 'valid'      && <span style={{ color: '#16a34a', fontSize: '1rem' }}>✓</span>}
                      {panValidationStatus['__shared__'] === 'invalid'    && <span style={{ color: '#dc2626', fontSize: '1rem' }}>✗</span>}
                    </div>
                    {panValidationErrors['__shared__'] && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                        {panValidationErrors['__shared__']}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Per-file PAN inputs */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {growwFiles.map(f => (
                      <div key={f.file.name} style={{ background: '#fafafa', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#d97706', flexShrink: 0 }}>
                            PDF
                          </div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.file.name}
                          </p>
                          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0 }}>
                            {(f.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>PAN:</label>
                          <input
                            type="text"
                            placeholder="e.g. ABCDE1234F"
                            value={filePans[f.file.name] ?? ''}
                            onChange={e => updateFilePan(f.file.name, e.target.value)}
                            maxLength={10}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: '0.875rem', outline: 'none', letterSpacing: 2, fontFamily: 'monospace',
                              border: `1.5px solid ${panValidationStatus[f.file.name] === 'valid' ? '#16a34a' : panValidationStatus[f.file.name] === 'invalid' ? '#dc2626' : panValidationStatus[f.file.name] === 'validating' ? '#f59e0b' : '#e5e7eb'}`,
                              background: panValidationStatus[f.file.name] === 'valid' ? '#f0fdf4' : panValidationStatus[f.file.name] === 'invalid' ? '#fef2f2' : '#fff',
                            }}
                          />
                          {panValidationStatus[f.file.name] === 'validating' && <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>⏳</span>}
                          {panValidationStatus[f.file.name] === 'valid'      && <span style={{ color: '#16a34a', fontSize: '1rem' }}>✓</span>}
                          {panValidationStatus[f.file.name] === 'invalid'    && <span style={{ color: '#dc2626', fontSize: '1rem' }}>✗</span>}
                        </div>
                        {panValidationErrors[f.file.name] && (
                          <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                            {panValidationErrors[f.file.name]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 12, marginBottom: 0 }}>
                  Your PAN is used only to unlock the PDF. We never store it.
                </p>

                {/* Live account preview */}
                {allGrowwPansEntered && (
                  <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>
                      {accounts.filter(a => a.broker === 'groww').length} Groww account{accounts.filter(a => a.broker === 'groww').length > 1 ? 's' : ''} detected
                    </p>
                    {accounts.filter(a => a.broker === 'groww').map(a => (
                      <p key={a.id} style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#374151' }}>
                        • {a.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Section B: Per-account holdings + cash ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6, color: '#111827' }}>
                Current Values Per Account
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20 }}>
                Enter the current market value and available cash for each account
              </p>

              {/* Show placeholder if Groww PANs not all entered yet */}
              {growwFiles.length > 0 && !allGrowwPansEntered ? (
                <div style={{ padding: '20px', background: '#fafafa', borderRadius: 10, border: '1px dashed #d1d5db', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.875rem' }}>
                    Enter PAN numbers above to detect your accounts
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {accounts.map(account => (
                    <div key={account.id} style={{ background: '#fafafa', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
                      {/* Account header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                          background: account.broker === 'zerodha' ? '#dcfce7' : '#fef3c7',
                          color: account.broker === 'zerodha' ? '#16a34a' : '#d97706',
                        }}>
                          {account.broker === 'zerodha' ? 'ZERODHA' : 'GROWW'}
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                          {account.name.replace(/^(Zerodha|Groww) — /, '')}
                        </p>
                        {account.fileNames.length > 1 && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
                            {account.fileNames.length} files merged
                          </span>
                        )}
                      </div>

                      {/* Holdings + Cash inputs */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                            Holdings value (₹) *
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 350000"
                            value={account.holdings}
                            onChange={e => updateAccount(account.id, 'holdings', e.target.value)}
                            style={{
                              width: '100%', padding: '10px 12px', border: `1.5px solid ${account.holdings ? '#1f77b4' : '#e5e7eb'}`,
                              borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                              background: account.holdings ? '#eff6ff' : '#fff',
                            }}
                          />
                          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>Current market value</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                            Available cash (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 12000"
                            value={account.cash}
                            onChange={e => updateAccount(account.id, 'cash', e.target.value)}
                            style={{
                              width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
                              borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                              background: '#fff',
                            }}
                          />
                          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>Cash in broker account</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {processingError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{processingError}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => setStep('upload')} style={{ flex: 1, padding: '13px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  ← Back
                </button>
                {allGrowwPansValid && (
                  <button
                    onClick={startProcessing}
                    disabled={!allHoldingsEntered}
                    style={{
                      flex: 2, padding: '13px',
                      background: allHoldingsEntered ? primaryColor : '#d1d5db',
                      color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem',
                      cursor: allHoldingsEntered ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Calculate My XIRR →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PROCESSING ───────────────────────────────────────────── */}
        {step === 'processing' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, margin: '0 auto 28px' }}>
                <svg width="72" height="72" viewBox="0 0 72 72" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke={primaryColor} strokeWidth="6" strokeDasharray="80 110" strokeLinecap="round" />
                </svg>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: '#111827' }}>Analysing your portfolio</h2>
              <p style={{ color: '#6b7280', marginBottom: 36, fontSize: '0.9rem' }}>
                This usually takes 20–30 seconds. You can close this tab — we'll email you the report.
              </p>
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
                      fontSize: '0.9rem', fontWeight: s.status === 'active' ? 700 : 400,
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
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              <div style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #155a8a 100%)`, padding: '32px 40px', color: '#fff' }}>
                <p style={{ margin: '0 0 4px', opacity: 0.8, fontSize: '0.9rem' }}>Hi {user?.name}, here are your results</p>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Your Portfolio Analysis</h2>
                <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.85rem' }}>
                  {accounts.length} account{accounts.length > 1 ? 's' : ''} analysed
                </p>
              </div>
              <div style={{ padding: '32px 40px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ textAlign: 'center', padding: '24px 20px', background: '#eff6ff', borderRadius: 12, border: `2px solid ${primaryColor}` }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Your XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: primaryColor, lineHeight: 1 }}>
                      {results.xirr != null ? `${results.xirr.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>annualised return</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '24px 20px', background: '#f9fafb', borderRadius: 12, border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Nifty 50 XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: '#374151', lineHeight: 1 }}>
                      {results.nifty_xirr != null ? `${results.nifty_xirr.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>same cash flows</p>
                  </div>
                </div>
                {results.xirr != null && results.nifty_xirr != null && (
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
                )}
              </div>
              <div style={{ padding: '28px 40px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, borderBottom: '1px solid #f3f4f6' }}>
                {[
                  { label: 'Total Invested', value: formatINR(results.total_invested) },
                  { label: 'Current Value', value: formatINR(results.current_value) },
                  { label: 'Net Gain', value: formatINR(results.net_gain), positive: results.net_gain >= 0 },
                  { label: 'Investment Period', value: formatPeriod(results.investment_period_years) },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: stat.positive !== undefined ? (stat.positive ? '#16a34a' : '#ef4444') : '#111827' }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
              {(() => {
                const insight = getInsight(results.xirr, results.nifty_xirr, results.investment_period_years);
                if (!insight) return null;
                return (
                  <div style={{
                    margin: '0', padding: '20px 28px',
                    background: insight.bg, borderBottom: `3px solid ${insight.border}`,
                    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <insight.Icon size={18} color={insight.iconColor} />
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: insight.titleColor }}>
                        {insight.title}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: insight.bodyColor, lineHeight: 1.5 }}>
                      {insight.body}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <a href={results.report_url} target="_blank" rel="noopener noreferrer" style={{
                flex: 2, padding: '15px', background: primaryColor, color: '#fff', borderRadius: 10,
                fontWeight: 700, fontSize: '1rem', textAlign: 'center', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </a>
              <button onClick={resetAll} style={{ flex: 1, padding: '15px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
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
