'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaTrophy, FaDumbbell, FaChartLine } from 'react-icons/fa';

const GOOGLE_CLIENT_ID = '1030081614603-onnmmupafevkn0hojoj4qk023tuohius.apps.googleusercontent.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const JOBS_BASE_URL = process.env.NEXT_PUBLIC_JOBS_BASE_URL || 'https://xirrledger-jobs.s3.ap-south-1.amazonaws.com';

type Step = 'auth' | 'otp' | 'upload' | 'details' | 'processing' | 'results';

interface User {
  name: string;
  email: string;
  picture?: string;
  googleToken?: string;
}

interface UploadedFile {
  file: File;
  broker: 'zerodha' | 'groww' | 'fyers' | 'unknown';
  hash: string;
  formatError?: string;
  fyersClientId?: string;
}

interface Account {
  id: string;
  name: string;
  broker: 'zerodha' | 'groww' | 'fyers';
  fileNames: string[];
  holdings: string;
  cash: string;
}

interface ManualEntry {
  id: string;
  label: string;
  amount: string;
  date: string;
  accountId: string;
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
  const diff = (xirr - niftyXirr).toFixed(2);
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

async function detectBrokerFromContent(file: File): Promise<Pick<UploadedFile, 'broker' | 'formatError' | 'fyersClientId'>> {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isCsv = file.type === 'text/csv' || name.endsWith('.csv');

  if (isPdf) {
    try {
      const allBytes = await file.arrayBuffer();
      const content = new TextDecoder('latin1').decode(new Uint8Array(allBytes));
      if (!content.startsWith('%PDF')) {
        return { broker: 'unknown', formatError: 'Not a valid PDF. Please upload your Groww Balance Statement PDF.' };
      }
      // Groww PDFs are always PAN-encrypted. /Encrypt only exists in encrypted PDFs.
      if (!content.includes('/Encrypt')) {
        return { broker: 'unknown', formatError: 'This PDF is not password-protected. Groww statements are always encrypted with your PAN — please upload the correct file.' };
      }
    } catch { /* fall through */ }
    return { broker: 'groww' };
  }

  if (isCsv) {
    try {
      const text = await file.slice(0, 8192).text();
      // Zerodha: header row contains 'particulars'
      if (text.split('\n')[0]?.toLowerCase().includes('particulars')) {
        return { broker: 'zerodha' };
      }
      // Fyers: content contains 'Transaction type' + 'Debit amount'
      if (text.includes('Transaction type') && text.includes('Debit amount')) {
        const m = text.match(/Client\s+ID[,\s:]+([A-Z0-9]+)/i);
        return { broker: 'fyers', fyersClientId: m ? m[1] : file.name.replace(/\.csv$/i, '') };
      }
      return { broker: 'unknown', formatError: 'This CSV has the wrong structure. Please download the correct statement from your broker.' };
    } catch {
      return { broker: 'unknown', formatError: 'Could not read this file. Please check it is not corrupted.' };
    }
  }

  const isXlsx = name.endsWith('.xlsx');
  if (isXlsx) {
    // Verify ZIP/XLSX signature (PK = 0x50 0x4B)
    try {
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      if (header[0] !== 0x50 || header[1] !== 0x4B) {
        return { broker: 'unknown', formatError: 'Not a valid XLSX file. Please upload the Zerodha ledger XLSX.' };
      }
    } catch { /* fall through */ }
    return { broker: 'zerodha' };
  }

  return { broker: 'unknown', formatError: 'Unrecognized file — please upload a Zerodha XLSX, Groww PDF, or Fyers CSV.' };
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
    const displayId = f.file.name
      .replace(/\.(csv|xlsx)$/i, '')
      .replace(/^ledger[-_]/i, '');
    accounts.push({
      id,
      name: `Zerodha — ${displayId}`,
      broker: 'zerodha',
      fileNames: [f.file.name],
      holdings: prev?.holdings ?? '',
      cash: prev?.cash ?? '',
    });
  });

  // Fyers: group by Client ID extracted from file content
  const fyersByClientId: Record<string, string[]> = {};
  files.filter(f => f.broker === 'fyers').forEach(f => {
    const clientId = f.fyersClientId || f.file.name.replace(/\.csv$/i, '');
    if (!fyersByClientId[clientId]) fyersByClientId[clientId] = [];
    fyersByClientId[clientId].push(f.file.name);
  });
  Object.entries(fyersByClientId).forEach(([clientId, fileNames]) => {
    const prev = existingMap.get(clientId);
    accounts.push({
      id: clientId,
      name: `Fyers — ${clientId} (${fileNames.length} file${fileNames.length > 1 ? 's' : ''})`,
      broker: 'fyers',
      fileNames,
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
const devLog = (...args: unknown[]) => {
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') console.log(...args);
};
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
  const [dividendFiles, setDividendFiles] = useState<File[]>([]);
  const [dividendKeyMap, setDividendKeyMap] = useState<Record<string, string>>({});
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
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResent, setOtpResent] = useState(false);
  const [showDownloadGuide, setShowDownloadGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'zerodha' | 'groww' | 'fyers'>('zerodha');
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [processingError, setProcessingError] = useState('');
  const [uploadedSession, setUploadedSession] = useState<{ sessionId: string; keyMap: Record<string, string> } | null>(null);
  const [fileValidationStatus, setFileValidationStatus] = useState<Record<string, 'validating' | 'valid' | 'invalid'>>({});
  const [fileValidationErrors, setFileValidationErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'validating'>('uploading');
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
  const allManualEntriesLinked = manualEntries.every(e => e.accountId !== '');
  const allManualEntriesFilled = manualEntries.every(e => e.amount.trim() !== '' && e.date.trim() !== '');

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

  async function handleManualContinue() {
    if (!manualName.trim()) { setAuthError('Please enter your name.'); return; }
    if (!manualEmail.trim() || !manualEmail.includes('@')) { setAuthError('Please enter a valid email.'); return; }
    setAuthError('');
    setOtpError('');
    setOtpCode('');
    setOtpSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manualEmail.trim().toLowerCase(), name: manualName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.sent) throw new Error(data.error || 'Failed to send OTP');
      setStep('otp');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send verification code. Please try again.');
    } finally {
      setOtpSending(false);
    }
  }

  async function handleOtpVerify() {
    if (otpCode.length !== 6) { setOtpError('Please enter the 6-digit code.'); return; }
    setOtpError('');
    setOtpVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manualEmail.trim().toLowerCase(), otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      if (!data.verified) { setOtpError(data.error || 'Incorrect code.'); return; }
      setUser({ name: manualName.trim(), email: manualEmail.trim() });
      setStep('upload');
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  }

  const isDividendFile = (file: File) =>
    file.name.toLowerCase().endsWith('.xlsx') &&
    file.name.toLowerCase().startsWith('dividends-');

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    const all = Array.from(incoming);
    // Separate dividend XLSX files from broker files
    const divFiles = all.filter(f => isDividendFile(f));
    const brokerFiles = all.filter(f => !isDividendFile(f));

    if (divFiles.length > 0) {
      setDividendFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        return [...prev, ...divFiles.filter(f => !existingNames.has(f.name))];
      });
    }

    if (brokerFiles.length === 0) return;

    const withHashes = await Promise.all(
      brokerFiles.map(async file => {
        const [detected, hash] = await Promise.all([detectBrokerFromContent(file), hashFile(file)]);
        return { file, hash, ...detected };
      })
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

      // Deep validate via Lambda if files are already uploaded to S3
      if (uploadedSession) {
        for (const uf of filesToCheck) {
          const fileKey = uploadedSession.keyMap[uf.file.name];
          if (!fileKey) continue;
          setFileValidationStatus(prev => ({ ...prev, [uf.file.name]: 'validating' }));
          try {
            const res = await fetch(`${API_BASE}/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: uploadedSession.sessionId, file_key: fileKey, broker: 'groww', pan }),
            });
            const result = await res.json();
            if (result.valid) {
              setFileValidationStatus(prev => ({ ...prev, [uf.file.name]: 'valid' }));
              setFileValidationErrors(prev => { const next = { ...prev }; delete next[uf.file.name]; return next; });
            } else {
              setFileValidationStatus(prev => ({ ...prev, [uf.file.name]: 'invalid' }));
              setFileValidationErrors(prev => ({ ...prev, [uf.file.name]: result.error || 'No transactions found in this PDF.' }));
              setPanValidationStatus(prev => ({ ...prev, [key]: 'invalid' }));
              setPanValidationErrors(prev => ({ ...prev, [key]: result.error || 'No transactions found in this PDF.' }));
            }
          } catch {
            // Network error — don't block on this
            setFileValidationStatus(prev => ({ ...prev, [uf.file.name]: 'valid' }));
          }
        }
      }
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

  function addManualEntry() {
    setManualEntries(prev => [...prev, { id: crypto.randomUUID(), label: '', amount: '', date: '', accountId: '' }]);
  }
  function removeManualEntry(id: string) {
    setManualEntries(prev => prev.filter(e => e.id !== id));
  }
  function updateManualEntry(id: string, field: keyof Omit<ManualEntry, 'id'>, value: string) {
    setManualEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  async function handleContinueToDetails() {
    const hasFormatErrors = files.some(f => f.formatError);
    if (hasFormatErrors) return;
    setIsUploading(true);
    setUploadPhase('uploading');

    const allFiles = [...files.map(f => f.file), ...dividendFiles];
    const totalSizeBytes = allFiles.reduce((sum, f) => sum + f.size, 0);
    const totalSizeMB = (totalSizeBytes / 1024 / 1024).toFixed(2);
    const t0 = performance.now();

    try {
      // Upload broker files + dividend files to S3 in one session
      const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const allFilesToUpload = [
        ...files.map(f => ({
          name: f.file.name,
          type: f.file.name.toLowerCase().endsWith('.xlsx') ? xlsxMime : (f.file.type || 'application/octet-stream'),
        })),
        ...dividendFiles.map(f => ({ name: f.name, type: xlsxMime })),
      ];
      const sessionRes = await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFilesToUpload }),
      });
      if (!sessionRes.ok) throw new Error('Upload failed — please try again.');
      const { session_id, upload_urls } = await sessionRes.json();

      const keyMap: Record<string, string> = {};
      const divKeyMap: Record<string, string> = {};
      await Promise.all(
        (upload_urls as { name: string; url: string; key: string }[]).map(async ({ name, url, key }) => {
          const uf = files.find(f => f.file.name === name);
          const df = dividendFiles.find(f => f.name === name);
          const fileObj = uf?.file ?? df;
          if (!fileObj) return;
          const contentType = uf
            ? (uf.file.name.toLowerCase().endsWith('.xlsx')
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : (uf.file.type || 'application/octet-stream'))
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const putRes = await fetch(url, {
            method: 'PUT', body: fileObj,
            headers: { 'Content-Type': contentType },
          });
          if (!putRes.ok) throw new Error(`Failed to upload ${name}`);
          if (uf) keyMap[name] = key;
          if (df) divKeyMap[name] = key;
        })
      );
      const tUploadDone = performance.now();
      devLog(`[XIRR] Upload done — ${allFiles.length} file(s), ${totalSizeMB} MB, took ${((tUploadDone - t0) / 1000).toFixed(2)}s`);

      setUploadedSession({ sessionId: session_id, keyMap });
      setDividendKeyMap(divKeyMap);
      setUploadPhase('validating');

      // Deep-validate non-Groww files via Lambda immediately
      const nonGrowwFiles = files.filter(f => f.broker !== 'groww');
      const newStatuses: Record<string, 'validating' | 'valid' | 'invalid'> = {};
      const newErrors: Record<string, string> = {};

      // Sequential validation — avoids spawning multiple cold Lambda containers in parallel
      for (const f of nonGrowwFiles) {
        newStatuses[f.file.name] = 'validating';
        const tFile = performance.now();
        try {
          const res = await fetch(`${API_BASE}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id, file_key: keyMap[f.file.name], broker: f.broker }),
          });
          const result = await res.json();
          const fileSizeMB = (f.file.size / 1024 / 1024).toFixed(2);
          devLog(`[XIRR] Validated ${f.file.name} (${f.broker}, ${fileSizeMB} MB) — ${((performance.now() - tFile) / 1000).toFixed(2)}s — valid: ${result.valid}${result.transactions_found != null ? `, txns: ${result.transactions_found}` : ''}`);
          if (result.valid) {
            newStatuses[f.file.name] = 'valid';
            if (f.broker === 'zerodha' && result.client_id) {
              setAccounts(prev => prev.map(a =>
                a.fileNames.includes(f.file.name) && a.broker === 'zerodha'
                  ? { ...a, id: result.client_id, name: `Zerodha — ${result.client_id}` }
                  : a
              ));
            }
          } else {
            newStatuses[f.file.name] = 'invalid';
            newErrors[f.file.name] = result.error || 'Invalid file — please check you uploaded the correct statement.';
          }
        } catch {
          devLog(`[XIRR] Validate ${f.file.name} — network error after ${((performance.now() - tFile) / 1000).toFixed(2)}s`);
          newStatuses[f.file.name] = 'invalid';
          newErrors[f.file.name] = 'Could not validate file — please check your connection and try again.';
        }
      }

      const tValidateDone = performance.now();
      devLog(`[XIRR] Validation done — ${nonGrowwFiles.length} file(s) validated in ${((tValidateDone - tUploadDone) / 1000).toFixed(2)}s — total: ${((tValidateDone - t0) / 1000).toFixed(2)}s`);

      setFileValidationStatus(prev => ({ ...prev, ...newStatuses }));
      setFileValidationErrors(prev => ({ ...prev, ...newErrors }));

      const anyInvalid = Object.values(newStatuses).some(s => s === 'invalid');
      if (!anyInvalid) {
        setStep('details');
      }
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  async function startProcessing() {
    if (!allHoldingsEntered || !allManualEntriesLinked || !allManualEntriesFilled) return;
    setProcessingError('');
    setStep('processing');
    setProcessingSteps(prev => prev.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' })));
    const tProcess = performance.now();

    try {
      // Reuse existing upload if already done in handleContinueToDetails
      let session_id: string;
      let keyMap: Record<string, string>;

      if (uploadedSession) {
        session_id = uploadedSession.sessionId;
        keyMap = uploadedSession.keyMap;
      } else {
        // Fallback: upload now (e.g. if user navigated back to Step 2 and re-added files)
        const fileList = files.map(f => ({ name: f.file.name, type: f.file.type || 'application/octet-stream' }));
        const sessionRes = await fetch(`${API_BASE}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: fileList }),
        });
        if (!sessionRes.ok) throw new Error('Failed to create session — please try again.');
        const sessionData = await sessionRes.json();
        session_id = sessionData.session_id;
        const upload_urls = sessionData.upload_urls as { name: string; url: string; key: string }[];
        keyMap = {};
        await Promise.all(
          upload_urls.map(async ({ name, url, key }) => {
            const uf = files.find(f => f.file.name === name);
            if (!uf) return;
            const ct = uf.file.name.toLowerCase().endsWith('.xlsx')
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : (uf.file.type || 'application/octet-stream');
            const putRes = await fetch(url, {
              method: 'PUT', body: uf.file,
              headers: { 'Content-Type': ct },
            });
            if (!putRes.ok) throw new Error(`Failed to upload ${name}`);
            keyMap[name] = key;
          })
        );
      }

      const detectedBrokers = [...new Set(files.map(f => f.broker).filter(b => b !== 'unknown'))];
      const detectedBroker = detectedBrokers.join(',') || 'unknown';
      if (process.env.NEXT_PUBLIC_DEBUG !== 'true') {
        fetch('/api/save-user.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id, name: user?.name, email: user?.email, broker: detectedBroker, google_token: user?.googleToken }),
        }).catch(() => {});
      }

      // Auto-link dividend files to Zerodha accounts by client ID
      // After XLSX validation, acc.id is already the client ID (e.g. "GZW478").
      // For CSV accounts (no client_id returned from validate), acc.id is still
      // the filename (e.g. "ledger-GZW478.csv") — extract via regex in that case.
      // Dividend file looks like "dividends-GZW478-2025_2026.xlsx" → client ID = "GZW478"
      const getZerodhaClientId = (accountId: string) => {
        const m = accountId.match(/ledger[-_](.+?)\.(?:csv|xlsx)/i);
        return m ? m[1].toUpperCase() : accountId.toUpperCase();
      };
      const getDividendClientId = (filename: string) =>
        filename.match(/dividends[-_](.+?)[-_]\d{4}/i)?.[1]?.toUpperCase() ?? null;

      const accountsPayload = accounts.map(acc => {
        const zerodhaClientId = acc.broker === 'zerodha' ? getZerodhaClientId(acc.id) : null;
        const divKeys = zerodhaClientId
          ? dividendFiles
              .filter(f => getDividendClientId(f.name) === zerodhaClientId)
              .map(f => dividendKeyMap[f.name])
              .filter(Boolean)
          : [];
        return {
          id: acc.id,
          broker: acc.broker,
          pan: acc.broker === 'groww' ? acc.id : null,
          pan_password: acc.broker === 'groww' ? acc.id : null,
          file_keys: acc.fileNames.map(n => keyMap[n]).filter(Boolean),
          dividend_file_keys: divKeys,
          holdings: parseFloat(acc.holdings) || 0,
          cash: parseFloat(acc.cash) || 0,
        };
      });

      const manualEntriesPayload = manualEntries
        .filter(e => e.amount.trim() && e.date.trim())
        .map(e => ({
          label: e.label.trim() || 'Manual investment',
          amount: parseFloat(e.amount),
          date: e.date,
          account_id: e.accountId || null,
        }));

      const tProcessCall = performance.now();
      const processRes = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, name: user?.name, email: user?.email, accounts: accountsPayload, manual_entries: manualEntriesPayload }),
      });
      if (!processRes.ok) throw new Error('Failed to start processing — please try again.');
      devLog(`[XIRR] /process triggered — ${((performance.now() - tProcessCall) / 1000).toFixed(2)}s`);
      pollStatus(session_id, tProcess);
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('details');
    }
  }

  function pollStatus(sid: string, t0: number) {
    const statusUrl = `${JOBS_BASE_URL}/jobs/${sid}/status.json`;
    let lastStatus = '';
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(statusUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'pending') return;
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        if (data.status !== lastStatus) {
          devLog(`[XIRR] Status: ${data.status} — ${elapsed}s`);
          lastStatus = data.status;
        }
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
          devLog(`[XIRR] Done — total processing time: ${elapsed}s | XIRR: ${data.xirr}% | Nifty: ${data.nifty_xirr}%`);
          setResults(data);
          setStep('results');
        } else if (data.status === 'error') {
          clearInterval(pollingRef.current!);
          devLog(`[XIRR] Error after ${elapsed}s — ${data.message}`);
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
    setManualEntries([]);
    setResults(null);
    setProcessingSteps(PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' as const })));
    setUploadedSession(null);
    setFileValidationStatus({});
    setFileValidationErrors({});
    setProcessingError('');
  }

  const STEPS_LABELS = ['Sign In', 'Upload', 'Details'];
  const stepIndex: Record<Step, number> = { auth: 0, otp: 0, upload: 1, details: 2, processing: 3, results: 4 };

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
                We will email you the report too
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
                <button onClick={handleManualContinue} disabled={otpSending} style={{ ...btnPrimary, padding: '13px', fontSize: '0.95rem', marginTop: 4, opacity: otpSending ? 0.6 : 1 }}>
                  {otpSending ? 'Sending code…' : 'Continue →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP OTP ── */}
        {step === 'otp' && (
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ ...card, padding: 36, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>Verify your email</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 24px' }}>
                We sent a 6-digit code to <span style={{ color: '#94a3b8' }}>{manualEmail}</span>
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...inputBase, padding: '14px', fontSize: '1.6rem', letterSpacing: '0.3em', textAlign: 'center', width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              />
              {otpError && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 12px' }}>{otpError}</p>}
              <button onClick={handleOtpVerify} disabled={otpVerifying} style={{ ...btnPrimary, padding: '13px', fontSize: '0.95rem', width: '100%', opacity: otpVerifying ? 0.6 : 1 }}>
                {otpVerifying ? 'Verifying…' : 'Verify →'}
              </button>
              {otpResent && (
                <p style={{ color: '#10b981', fontSize: '0.82rem', margin: '12px 0 0' }}>✓ New code sent to {manualEmail}</p>
              )}
              <button
                onClick={async () => {
                  setOtpCode(''); setOtpError(''); setOtpResent(false);
                  setOtpSending(true);
                  try {
                    const res = await fetch(`${API_BASE}/send-otp`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: manualEmail.trim().toLowerCase(), name: manualName.trim() }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.sent) throw new Error(data.error || 'Failed to send OTP');
                    setOtpResent(true);
                    setTimeout(() => setOtpResent(false), 4000);
                  } catch (err: unknown) {
                    setOtpError(err instanceof Error ? err.message : 'Failed to resend. Please try again.');
                  } finally {
                    setOtpSending(false);
                  }
                }}
                disabled={otpSending}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}
              >
                {otpSending ? 'Sending…' : 'Resend code'}
              </button>
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

              {/* Download guide link */}
              <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>Zerodha CSV, Groww PDF &amp; Fyers CSV supported</p>
                <button
                  onClick={() => { setShowDownloadGuide(true); setActiveGuideTab('zerodha'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: GOLD, fontSize: '0.82rem', fontWeight: 600, padding: 0 }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  How to download?
                </button>
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
                  Zerodha XLSX · Groww PDF · Fyers CSV · Zerodha dividend XLSX (optional)
                </p>
                <input ref={fileInputRef} type="file" multiple accept=".csv,.pdf,.xlsx"
                  onChange={e => e.target.files && addFiles(e.target.files)} style={{ display: 'none' }} />
              </div>

              {duplicateWarning && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: GOLD, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚠️ {duplicateWarning}
                </div>
              )}

              {files.length > 0 && (
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {files.map((f, i) => {
                    const vStatus = fileValidationStatus[f.file.name];
                    const vError = f.formatError || fileValidationErrors[f.file.name];
                    const hasError = !!f.formatError || vStatus === 'invalid';
                    return (
                      <div key={i}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          ...innerCard,
                          border: hasError ? '1px solid rgba(239,68,68,0.35)' : vStatus === 'valid' ? '1px solid rgba(16,185,129,0.25)' : innerCard.border,
                          background: hasError ? 'rgba(239,68,68,0.05)' : vStatus === 'valid' ? 'rgba(16,185,129,0.04)' : innerCard.background,
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: f.broker === 'zerodha' ? 'rgba(16,185,129,0.15)' : f.broker === 'groww' ? 'rgba(245,158,11,0.15)' : f.broker === 'fyers' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                            fontSize: '0.65rem', fontWeight: 700,
                            color: f.broker === 'zerodha' ? '#10b981' : f.broker === 'groww' ? GOLD : f.broker === 'fyers' ? '#818cf8' : '#64748b',
                          }}>
                            {f.broker === 'zerodha' ? 'XLS' : f.broker === 'groww' ? 'PDF' : f.broker === 'fyers' ? 'CSV' : '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', textTransform: 'capitalize' }}>
                              {f.broker === 'unknown' ? 'Unknown file type' : f.broker === 'fyers' ? `Fyers · ${(f.file.size / 1024).toFixed(0)} KB` : `${f.broker} · ${(f.file.size / 1024).toFixed(0)} KB`}
                            </p>
                          </div>
                          {vStatus === 'validating' && <span style={{ color: GOLD, fontSize: '0.75rem', flexShrink: 0 }}>checking…</span>}
                          {vStatus === 'valid' && !f.formatError && <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓</span>}
                          {hasError
                            ? <button onClick={() => removeFile(i)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', padding: '3px 9px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>Remove</button>
                            : <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                          }
                        </div>
                        {vError && (
                          <p style={{ margin: '4px 0 0 4px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>
                            ⚠ {vError}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Dividend files section ── */}
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: GOLD, fontWeight: 600 }}>
                  Optional: Zerodha dividend statement (.xlsx)
                </p>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5 }}>
                  Adds dividend income as inflows to your XIRR.{' '}
                  Download from{' '}
                  <a href="https://console.zerodha.com/reports/downloads" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'underline' }}>
                    Zerodha Console → Reports → Downloads
                  </a>
                  {' '}→ select <b style={{ color: '#94a3b8' }}>Dividend statement</b>, choose FY, click Download. Upload one file per FY.
                </p>
              </div>

              {dividendFiles.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: GOLD, fontWeight: 600 }}>
                    Dividend statements detected — inflows will be included in XIRR
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dividendFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', ...innerCard, border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.12)', fontSize: '0.6rem', fontWeight: 700, color: GOLD }}>
                          XLSX
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>Zerodha dividend statement · {(f.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => setDividendFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const hasFormatErrors = files.some(f => f.formatError);
                const hasValidationErrors = Object.values(fileValidationErrors).length > 0 && files.some(f => fileValidationStatus[f.file.name] === 'invalid');
                const canContinue = files.length > 0 && !hasFormatErrors && !hasValidationErrors && !isUploading;
                return (
                  <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                    <button onClick={() => setStep('auth')} style={{ ...btnSecondary, flex: 1, padding: 12, fontSize: '0.9rem' }}>
                      ← Back
                    </button>
                    <button onClick={handleContinueToDetails} disabled={!canContinue} style={{
                      ...btnPrimary, flex: 2, padding: 12, fontSize: '0.9rem',
                      background: canContinue ? GOLD : 'rgba(255,255,255,0.08)',
                      color: canContinue ? '#0a1020' : '#334155',
                      cursor: canContinue ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      {isUploading ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 72 72" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(10,16,32,0.3)" strokeWidth="8" />
                            <circle cx="36" cy="36" r="30" fill="none" stroke="#0a1020" strokeWidth="8" strokeDasharray="60 120" strokeLinecap="round" />
                          </svg>
                          Uploading & Validating…
                        </>
                      ) : (
                        `Continue (${files.length} file${files.length !== 1 ? 's' : ''}) →`
                      )}
                    </button>
                  </div>
                );
              })()}
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

                {growwFiles.length > 1 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16, userSelect: 'none' }}>
                    <input
                      type="checkbox" checked={samePanForAll}
                      onChange={e => setSamePanForAll(e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: GOLD, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>Same PAN for all Groww files</span>
                  </label>
                )}

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
                    {growwFiles.map(f => {
                      const hasError = panValidationStatus[f.file.name] === 'invalid';
                      return (
                        <div key={f.file.name} style={{
                          ...innerCard, padding: '12px 14px',
                          border: hasError ? '1px solid rgba(239,68,68,0.35)' : innerCard.border,
                          background: hasError ? 'rgba(239,68,68,0.04)' : innerCard.background,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: GOLD, flexShrink: 0 }}>PDF</div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.845rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.file.name}</p>
                            <span style={{ fontSize: '0.72rem', color: '#334155', flexShrink: 0 }}>{(f.file.size / 1024).toFixed(0)} KB</span>
                            {hasError && (
                              <button
                                onClick={() => removeFile(files.findIndex(uf => uf.file.name === f.file.name))}
                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', padding: '3px 9px', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}
                              >
                                Remove
                              </button>
                            )}
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
                      );
                    })}
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: 10, marginBottom: 0 }}>
                  Your PAN is used only to unlock the PDF.
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
                          background: account.broker === 'zerodha' ? 'rgba(16,185,129,0.12)' : account.broker === 'fyers' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                          color: account.broker === 'zerodha' ? '#10b981' : account.broker === 'fyers' ? '#818cf8' : GOLD,
                        }}>
                          {account.broker === 'zerodha' ? 'ZERODHA' : account.broker === 'fyers' ? 'FYERS' : 'GROWW'}
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#e2e8f0' }}>
                          {account.name.replace(/^(Zerodha|Groww|Fyers) — /, '')}
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
                            type="number" placeholder="e.g. 350000" min="0"
                            value={account.holdings}
                            onChange={e => updateAccount(account.id, 'holdings', e.target.value.replace('-', ''))}
                            style={{
                              ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box',
                              border: account.holdings ? `1.5px solid rgba(245,158,11,0.4)` : '1.5px solid rgba(255,255,255,0.1)',
                              background: account.holdings ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.04)',
                            }}
                          />
                          <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#94a3b8' }}>Today's market value of your holdings — not what you invested</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Available cash (₹)</label>
                          <input
                            type="number" placeholder="e.g. 12000" min="0"
                            value={account.cash}
                            onChange={e => updateAccount(account.id, 'cash', e.target.value.replace('-', ''))}
                            style={{ ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box' }}
                          />
                          <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#94a3b8' }}>Cash in broker account</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* ── Section C: Outside Investments ── */}
            <div style={{ ...card, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Outside Investments</h2>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '3px 0 0', fontWeight: 500 }}>Optional</p>
                </div>
                {manualEntries.length > 0 && (
                  <button onClick={addManualEntry} style={{ ...btnSecondary, padding: '6px 12px', fontSize: '0.8rem' }}>+ Add</button>
                )}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55, margin: '10px 0 18px' }}>
                For investments your broker doesn&apos;t track — sovereign gold bonds, unlisted stocks, etc. — add their original purchase details here. Select the account where <strong style={{ color: '#94a3b8' }}>the holding&apos;s current value is already included</strong> above.
              </p>

              {manualEntries.length === 0 ? (
                <button
                  onClick={addManualEntry}
                  style={{ width: '100%', padding: 14, border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 10, color: '#475569', cursor: 'pointer', fontSize: '0.845rem', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}
                >
                  + Add an outside investment
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {manualEntries.map((entry, idx) => (
                    <div key={entry.id} style={{ ...innerCard, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', flexShrink: 0 }}>#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Description (e.g. RBI Bond 2022)"
                          value={entry.label}
                          onChange={e => updateManualEntry(entry.id, 'label', e.target.value)}
                          style={{ ...inputBase, flex: 1, padding: '7px 10px', fontSize: '0.845rem' }}
                        />
                        <button onClick={() => removeManualEntry(entry.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 4, flexShrink: 0 }}>×</button>
                      </div>
                      {accounts.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>
                            Account *
                          </label>
                          <select
                            value={entry.accountId}
                            onChange={e => updateManualEntry(entry.id, 'accountId', e.target.value)}
                            style={{ ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box' as const, cursor: 'pointer', color: entry.accountId ? '#e2e8f0' : '#475569' }}
                          >
                            <option value="" disabled>Select account where this holding appears…</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Amount invested (₹) *</label>
                          <input
                            type="number" placeholder="e.g. 10000"
                            value={entry.amount}
                            onChange={e => updateManualEntry(entry.id, 'amount', e.target.value)}
                            style={{ ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Date of investment *</label>
                          <input
                            type="date"
                            value={entry.date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => updateManualEntry(entry.id, 'date', e.target.value)}
                            style={{ ...inputBase, width: '100%', padding: '9px 11px', fontSize: '0.845rem', boxSizing: 'border-box', colorScheme: 'dark' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}


              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={() => { setUploadedSession(null); setFileValidationStatus({}); setFileValidationErrors({}); setStep('upload'); }} style={{ ...btnSecondary, flex: 1, padding: 12, fontSize: '0.9rem' }}>
                  ← Back
                </button>
                {allGrowwPansValid && (
                  <button onClick={startProcessing} disabled={!allHoldingsEntered || !allManualEntriesLinked || !allManualEntriesFilled} style={{
                    ...btnPrimary, flex: 2, padding: 12, fontSize: '0.9rem',
                    background: (allHoldingsEntered && allManualEntriesLinked && allManualEntriesFilled) ? GOLD : 'rgba(255,255,255,0.07)',
                    color: (allHoldingsEntered && allManualEntriesLinked && allManualEntriesFilled) ? '#0a1020' : '#334155',
                    cursor: (allHoldingsEntered && allManualEntriesLinked && allManualEntriesFilled) ? 'pointer' : 'not-allowed',
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

              <button onClick={() => {
                if (pollingRef.current) clearInterval(pollingRef.current);
                setProcessingSteps(PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' as const })));
                setStep('details');
              }} style={{ ...btnSecondary, width: '100%', padding: '11px', marginTop: 24, fontSize: '0.85rem' }}>
                ← Stop &amp; Edit Holdings
              </button>
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
                      {results.xirr != null ? `${results.xirr.toFixed(2)}%` : 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: '#64748b' }}>annualised return</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '22px 16px', ...innerCard }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Nifty 50 XIRR</p>
                    <p style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: '#64748b', lineHeight: 1 }}>
                      {results.nifty_xirr != null ? `${results.nifty_xirr.toFixed(2)}%` : 'N/A'}
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
                      <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <FaTrophy size={14} color="#f59e0b" />
                        You beat Nifty 50 by {(results.xirr - results.nifty_xirr).toFixed(2)}%
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontWeight: 700, color: GOLD, fontSize: '0.9rem' }}>
                        Nifty 50 beat you by {(results.nifty_xirr - results.xirr).toFixed(2)}% — consider index funds
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href={results.report_url} target="_blank" rel="noopener noreferrer" style={{
                padding: '14px', background: GOLD, color: '#0a1020', borderRadius: 10,
                fontWeight: 700, fontSize: '0.95rem', textAlign: 'center', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </a>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => {
                  setProcessingSteps(PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' as const })));
                  setResults(null);
                  setStep('details');
                }} style={{ ...btnSecondary, flex: 1, padding: 14, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Holdings
                </button>
                <button onClick={resetAll} style={{ ...btnSecondary, flex: 1, padding: 14, fontSize: '0.9rem' }}>
                  New Calculation
                </button>
              </div>
            </div>

            <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.76rem', marginTop: 14 }}>
              Report also sent to {user?.email}
            </p>
            <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.73rem', marginTop: 8 }}>
              * This report assumes all investments were made exclusively through the provided account statements.
            </p>
          </div>
        )}

      </div>

      {/* ── OTP Sending Overlay ── */}
      {otpSending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,20,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: 'spin 0.9s linear infinite' }}>
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="4" />
            <path d="M 24 4 A 20 20 0 0 1 44 24" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <p style={{ color: '#94a3b8', marginTop: 16, fontSize: '0.9rem' }}>Sending verification code…</p>
        </div>
      )}

      {/* ── Upload / Validation Overlay ── */}
      {isUploading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,20,0.93)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)' }}>

          {/* Stock chart */}
          <div style={{ width: 300, marginBottom: 28, animation: 'chartFadeIn 0.4s ease forwards' }}>
            <svg viewBox="0 0 300 100" width="300" height="100" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(245,158,11,0.22)" />
                  <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                </linearGradient>
                <clipPath id="chartClip">
                  <rect x="0" y="0" width="300" height="100" />
                </clipPath>
              </defs>

              {/* Grid lines */}
              {[20, 45, 70, 95].map(y => (
                <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}

              {/* Fill area under line */}
              <path
                d="M 0,75 L 25,68 L 40,72 L 55,58 L 70,62 L 90,48 L 110,52 L 125,42 L 145,50 L 165,35 L 185,40 L 205,28 L 225,34 L 248,20 L 270,25 L 290,16 L 300,18 L 300,100 L 0,100 Z"
                fill="url(#chartFill)"
                clipPath="url(#chartClip)"
              />

              {/* Animated line — loops continuously */}
              <path
                d="M 0,75 L 25,68 L 40,72 L 55,58 L 70,62 L 90,48 L 110,52 L 125,42 L 145,50 L 165,35 L 185,40 L 205,28 L 225,34 L 248,20 L 270,25 L 290,16 L 300,18"
                fill="none"
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: 420, strokeDashoffset: 420, animation: 'drawLineLoop 3s ease-in-out infinite' }}
              />

              {/* Pulsing tip dot */}
              <circle cx="300" cy="18" r="4" fill={GOLD}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'chartTipPulse 1.1s ease-in-out infinite' }} />
              <circle cx="300" cy="18" r="11" fill="rgba(245,158,11,0.18)"
                style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'chartTipGlow 1.1s ease-in-out infinite' }} />
            </svg>
          </div>

          {/* Status text */}
          <p style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
            {uploadPhase === 'uploading' ? 'Uploading your files…' : 'Please wait, validating your files…'}
          </p>
          <p style={{ margin: '0 0 22px', fontSize: '0.8rem', color: '#475569' }}>
            This may take a few seconds
          </p>

          {/* Scrolling ticker */}
          <div style={{ width: 300, overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '7px 0' }}>
            <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'tickerScroll 14s linear infinite' }}>
              {[0, 1].map(i => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 16, paddingRight: 32, fontSize: '0.72rem', fontFamily: 'monospace' }}>
                  <span style={{ color: '#10b981' }}>NIFTY50 ▲ 1.24%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#ef4444' }}>BANKNIFTY ▼ 0.34%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#10b981' }}>SENSEX ▲ 0.87%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#10b981' }}>RELIANCE ▲ 2.10%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#ef4444' }}>TCS ▼ 0.43%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#10b981' }}>HDFCBANK ▲ 1.05%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#10b981' }}>INFY ▲ 0.66%</span>
                  <span style={{ color: '#334155' }}>·</span>
                  <span style={{ color: '#ef4444' }}>WIPRO ▼ 0.19%</span>
                  <span style={{ color: '#334155' }}>·</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Processing Error Modal ── */}
      {processingError && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, width: '100%', maxWidth: 420, padding: '36px 32px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.4rem' }}>
              ⚠
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>Something went wrong</h2>
            <p style={{ margin: '0 0 28px', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6 }}>{processingError}</p>
            <button
              onClick={() => setProcessingError('')}
              style={{ ...btnPrimary, width: '100%', padding: '13px', fontSize: '0.95rem' }}
            >
              ← Go Back &amp; Try Again
            </button>
          </div>
        </div>
      )}

      {/* ── Download Guide Modal ── */}
      {showDownloadGuide && (
        <div
          onClick={() => setShowDownloadGuide(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>How to download your ledger</h2>
              <button onClick={() => setShowDownloadGuide(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 300 }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, padding: '16px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {([
                { key: 'zerodha', label: 'Zerodha', letter: 'Z', color: GOLD, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
                { key: 'groww',   label: 'Groww',   letter: 'G', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
                { key: 'fyers',   label: 'Fyers',   letter: 'F', color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
              ] as const).map(({ key, label, letter, color, bg, border }) => {
                const active = activeGuideTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveGuideTab(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: '8px 8px 0 0',
                      border: 'none', cursor: 'pointer',
                      background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                      color: active ? '#ffffff' : '#64748b',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.88rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: active ? bg : 'transparent', border: active ? `1px solid ${border}` : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: active ? color : '#475569', transition: 'all 0.15s' }}>{letter}</span>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div style={{ padding: '24px 28px' }}>

              {/* Zerodha */}
              {activeGuideTab === 'zerodha' && (
                <div>
                  <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: '#64748b' }}>XLSX format · no password required</p>
                  {[
                    <><a href="https://console.zerodha.com/funds/statement?segment=equity&src=kiteweb" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 700 }}>Open Zerodha Statement →</a> (logs in automatically if you're signed in)</>,
                    <>Select <strong style={{ color: '#e2e8f0' }}>All Segments</strong> as category</>,
                    <>Set date range — <strong style={{ color: '#e2e8f0' }}>from your first investment till today</strong></>,
                    <>Click the <strong style={{ color: '#e2e8f0' }}>blue arrow →</strong> then click <strong style={{ color: '#e2e8f0' }}>XLSX</strong></>,
                  ].map((item, i, arr) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                      <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: GOLD, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>{item}</p>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>✓ One XLSX covers all years &nbsp;·&nbsp; Password: not required</p>
                  </div>
                </div>
              )}

              {/* Groww */}
              {activeGuideTab === 'groww' && (
                <div>
                  <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: '#64748b' }}>PDF format · password: your PAN (uppercase)</p>

                  {/* Method 1 */}
                  <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>Method 1</span>
                      <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(16,185,129,0.3)' }}>RECOMMENDED</span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>— Groww Balance Statement</span>
                    </div>
                    {[
                      <><a href="https://groww.in/user/profile/report" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 700 }}>Open Groww Reports →</a> (logs in automatically if you&apos;re signed in)</>,
                      <>Scroll to <strong style={{ color: '#e2e8f0' }}>Transactions → Groww Balance Statement</strong></>,
                      <>Choose format: select <strong style={{ color: '#e2e8f0' }}>PDF</strong> (not Excel)</>,
                      <>Set date range → click <strong style={{ color: '#e2e8f0' }}>Download</strong></>,
                    ].map((item, i, arr) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 12 : 0 }}>
                        <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>{item}</p>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <p style={{ fontSize: '0.77rem', color: '#475569', margin: 0 }}>✓ All transactions in a single file</p>
                      <p style={{ fontSize: '0.77rem', color: '#92400e', margin: 0 }}>⚠ As of Feb 2026, only available from 1 Apr 2023 in-app. For earlier history, contact Groww support via chat or email to request your full statement.</p>
                    </div>
                  </div>

                  {/* Method 2 */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Method 2</span>
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)' }}>ALTERNATIVE</span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>— Annual Statements</span>
                    </div>
                    {[
                      <><a href="https://groww.in/user/balance/inr" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 700 }}>Open Groww Balance →</a> (logs in automatically if you&apos;re signed in)</>,
                      <>Click <strong style={{ color: '#e2e8f0' }}>All Transactions</strong></>,
                      <>Click <strong style={{ color: '#e2e8f0' }}>Download statement</strong> (top right button)</>,
                      <>Select date range (max 1 year) → <strong style={{ color: '#e2e8f0' }}>Download</strong></>,
                      <><strong style={{ color: '#e2e8f0' }}>Repeat for all years</strong> from first investment till today</>,
                    ].map((item, i, arr) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 12 : 0 }}>
                        <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>{item}</p>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: '0.77rem', color: '#92400e', margin: 0 }}>⚠ Download one PDF per year — repeat for each year separately</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fyers */}
              {activeGuideTab === 'fyers' && (
                <div>
                  <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: '#64748b' }}>CSV format · no password required</p>
                  {[
                    <><a href="https://fyers.in/web/reports/ledger" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontWeight: 700 }}>Open Fyers Ledger →</a> (logs in automatically if you&apos;re signed in)</>,
                    <>Select the <strong style={{ color: '#e2e8f0' }}>Financial Year</strong></>,
                    <>Click <strong style={{ color: '#e2e8f0' }}>Generate</strong></>,
                    <>Click <strong style={{ color: '#e2e8f0' }}>Download CSV</strong></>,
                    <><strong style={{ color: '#e2e8f0' }}>Repeat for all years</strong> from first investment till today</>,
                  ].map((item, i, arr) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                      <span style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>{item}</p>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 4px' }}>✓ Password: not required</p>
                    <p style={{ fontSize: '0.78rem', color: '#92400e', margin: 0 }}>⚠ Download one CSV per financial year for the full period</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
