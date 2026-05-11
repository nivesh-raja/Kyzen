import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types & Interfaces ---

type UserRole = 'admin' | 'analyst';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

type VerificationStatus = 'Verified' | 'Pending' | 'Rejected';

interface DocumentRecord {
  id: string;
  timestamp: number;
  fileName: string;
  documentType: string;
  applicantName: string;
  applicantId: string;
  status: VerificationStatus;
  matchScore: number;
  livenessScore?: number;
  riskScore: 'Low' | 'Medium' | 'High';
  reason: string;
  extractedData?: {
    name: string;
    dob: string;
    idNumber: string;
    expiryDate?: string;
    address?: string;
  };
}

interface KYCFormData {
  fullName: string;
  dob: string;
  idNumber: string;
  address: string;
  documentType: string;
  kycType: 'Basic' | 'Full';
}

// --- Icons (Lucide-style SVGs) ---

const Icons = {
  Loader: ({ className }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  Upload: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  CheckCircle: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertTriangle: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Camera: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  LayoutDashboard: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  ),
  FileText: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  ),
  History: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  LogOut: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
  ),
  Trash2: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
  ),
  ShieldCheck: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Search: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  ),
  ChevronRight: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  ),
  Fingerprint: ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  ),
  Eye: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  ),
  ThumbsUp: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
  ),
  ThumbsDown: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
  ),
  Moon: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
  ),
  Sun: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ),
  UserCheck: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  ),
};

// --- Mock Data & Helpers ---

const MOCK_HISTORY: DocumentRecord[] = [
  {
    id: 'KYC-1001',
    timestamp: Date.now() - 86400000 * 2,
    fileName: 'aadhaar_sample.jpg',
    documentType: 'Aadhaar',
    applicantName: 'Rahul Sharma',
    applicantId: '4455 8899 1122',
    status: 'Verified',
    matchScore: 98,
    livenessScore: 99,
    riskScore: 'Low',
    reason: 'Document verified successfully. Face match confirmed.',
    extractedData: { name: 'Rahul Sharma', dob: '1990-05-15', idNumber: '4455 8899 1122', address: '123, MG Road, Bangalore' }
  },
  {
    id: 'KYC-1002',
    timestamp: Date.now() - 3600000 * 4,
    fileName: 'pan_card.jpg',
    documentType: 'PAN',
    applicantName: 'Priya Singh',
    applicantId: 'ABCDE1234F',
    status: 'Pending',
    matchScore: 75,
    livenessScore: 88,
    riskScore: 'Medium',
    reason: 'Slight name mismatch. Manual review recommended.',
    extractedData: { name: 'Priya K. Singh', dob: '1995-08-22', idNumber: 'ABCDE1234F' }
  }
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

// --- Components ---

// 1. Login Page
const LoginPage = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const performLogin = (u: string, p: string) => {
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      if (u === 'admin@demo.com' && p === 'Admin@123') {
        onLogin({ id: '1', name: 'Admin User', email: u, role: 'admin' });
      } else if (u === 'analyst@demo.com' && p === 'Analyst@123') {
        onLogin({ id: '2', name: 'Analyst User', email: u, role: 'analyst' });
      } else {
        setError('Invalid credentials. Try admin@demo.com / Admin@123');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primarySoft via-bgSoft to-white dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="glass-panel p-10 rounded-xl2 w-full max-w-md animate-fade-in relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-4 rounded-2xl shadow-lg shadow-primary/30 mb-4 transform hover:scale-105 transition-transform duration-300">
               <Icons.Fingerprint className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-navy dark:text-white tracking-tight">Kyzen</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Secure Identity Verification</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm border border-red-100 dark:border-red-800 text-danger rounded-xl text-sm flex items-center shadow-sm">
              <Icons.AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Email</label>
              <input 
                type="email" 
                required
                className="soft-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="soft-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="primary-btn w-full mt-4 flex justify-center items-center text-lg"
            >
              {loading ? <><Icons.Loader className="w-5 h-5 mr-2" /> Authenticating...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10">
            <p className="text-xs text-slate-400 text-center font-medium uppercase tracking-wide mb-4">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => performLogin('admin@demo.com', 'Admin@123')}
                className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-primary border border-blue-100 dark:border-blue-800 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:shadow-md transition-all text-center"
              >
                Login as Admin
              </button>
              <button 
                type="button"
                onClick={() => performLogin('analyst@demo.com', 'Analyst@123')}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-md transition-all text-center"
              >
                Login as Analyst
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. KYC Wizard (Upload & Verify)
const UploadKYCWizard = ({ onVerificationComplete }: { onVerificationComplete: (result: DocumentRecord) => void }) => {
  const [step, setStep] = useState<number>(1); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<KYCFormData>({ fullName: '', dob: '', idNumber: '', address: '', documentType: 'Aadhaar', kycType: 'Basic' });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  const [addressPreview, setAddressPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null); 
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [result, setResult] = useState<DocumentRecord | null>(null);
  const [isDraggingId, setIsDraggingId] = useState(false);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleFileSelect = (file: File, type: 'id' | 'address' | 'selfie') => {
    if (file.size > 5 * 1024 * 1024) return alert("File too large (>5MB)");
    const previewUrl = URL.createObjectURL(file);
    if (type === 'id') { setIdFile(file); setIdPreview(previewUrl); } 
    else if (type === 'address') { setAddressFile(file); setAddressPreview(previewUrl); }
    else { setSelfieFile(file); setSelfiePreview(previewUrl); }
  };
  
  const handleRemoveFile = (type: 'id' | 'address' | 'selfie') => {
    if (type === 'id') { setIdFile(null); setIdPreview(null); } 
    else if (type === 'address') { setAddressFile(null); setAddressPreview(null); }
    else { setSelfieFile(null); setSelfiePreview(null); }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera.");
      setIsCameraOpen(false);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setSelfiePreview(dataUrl);
      stopCamera();
      // Convert dataURL to File object for consistency
      fetch(dataUrl).then(res => res.blob()).then(blob => {
          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          setSelfieFile(file);
      });
    }
  };

  const handleVerify = async () => {
    if (!idFile || (!selfiePreview && !selfieFile)) { setError("Missing document or selfie."); return; }
    setLoading(true); setStep(4); setError('');
    try {
      const idBase64 = await fileToBase64(idFile);
      const selfieBlob = selfieFile ? selfieFile : await (await fetch(selfiePreview!)).blob();
      const selfieBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(selfieBlob);
      });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Analyze this KYC request.
        User Data: Name: "${formData.fullName}", DOB: "${formData.dob}", ID: "${formData.idNumber}", Type: "${formData.documentType}", Address: "${formData.address}", KYC Level: "${formData.kycType}"
        
        Tasks: 
        1. OCR: Extract Name, DOB, ID, Address from the ID document. 
        2. ID Integrity: Check for tampering/editing on the ID. 
        3. Face Match: Compare the face in the Selfie vs the ID photo.
        4. Liveness Check: Analyze the Selfie image. Determine if it is a live capture or a spoof (screen, printed photo, etc.). Return a livenessScore (0-100).
        5. Data Validation: Compare extracted data with User Data.
        
        Return JSON: { 
          "extractedData": { "name": string, "dob": string, "idNumber": string, "address": string }, 
          "matchScore": number (0-100) (Face match confidence), 
          "livenessScore": number (0-100) (Probability of live person),
          "status": "Verified"|"Pending"|"Rejected", 
          "riskScore": "Low"|"Medium"|"High", 
          "reason": string (Include notes on liveness if low)
        }
      `;

      const parts: any[] = [
          { text: prompt }, 
          { inlineData: { mimeType: idFile.type === 'application/pdf' ? 'application/pdf' : idFile.type, data: idBase64 } }, 
          { inlineData: { mimeType: selfieFile?.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg', data: selfieBase64 } }
      ];
      if (addressFile) {
        const addressBase64 = await fileToBase64(addressFile);
        parts.push({ inlineData: { mimeType: addressFile.type === 'application/pdf' ? 'application/pdf' : addressFile.type, data: addressBase64 } });
      }

      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts }], config: { responseMimeType: "application/json" } });
      const data = JSON.parse(response.text);
      
      let finalStatus = data.status || 'Pending';
      let finalReason = data.reason || 'AI Processing';
      const livenessScore = data.livenessScore || 0;

      if (livenessScore < 80) {
        finalStatus = 'Rejected';
        if (!finalReason.toLowerCase().includes('liveness') && !finalReason.toLowerCase().includes('spoof')) {
            finalReason = `Liveness check failed (Score: ${livenessScore}%). Potential spoof detected. ` + finalReason;
        }
      }

      const newRecord: DocumentRecord = {
        id: `KYC-${Date.now().toString().slice(-4)}`, timestamp: Date.now(), fileName: idFile.name, documentType: formData.documentType, applicantName: formData.fullName, applicantId: formData.idNumber,
        status: finalStatus, matchScore: data.matchScore || 0, livenessScore: livenessScore, riskScore: data.riskScore || 'Medium', reason: finalReason, extractedData: data.extractedData
      };
      setResult(newRecord); onVerificationComplete(newRecord); setStep(5);
    } catch (err) {
      console.error(err); setError("Verification failed. Try again."); setStep(3);
    } finally { setLoading(false); }
  };

  const resetWizard = () => {
    setStep(1); setFormData({ fullName: '', dob: '', idNumber: '', address: '', documentType: 'Aadhaar', kycType: 'Basic' });
    setIdFile(null); setIdPreview(null); setAddressFile(null); setAddressPreview(null); setSelfieFile(null); setSelfiePreview(null); setResult(null); setError('');
  };

  const handleDragId = (e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingId(active);
  };

  const handleDropId = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingId(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0], 'id');
    }
  };

  return (
    <div className="glass-panel rounded-xl2 overflow-hidden animate-slide-up">
      {/* Stepper */}
      <div className="bg-white/50 dark:bg-white/5 border-b border-white/60 dark:border-white/10 px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full -z-10"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-accent rounded-full -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>

          {['Details', 'Documents', 'Selfie', 'Result'].map((label, i) => {
             const stepNum = i + 1;
             const isActive = step >= stepNum;
             const isCurrent = step === stepNum;
             return (
               <div key={label} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-2 rounded-full z-10">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-glow' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                   {isActive ? <Icons.CheckCircle className="w-5 h-5" /> : stepNum}
                 </div>
                 <span className={`text-xs font-semibold ${isCurrent ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
               </div>
             )
          })}
        </div>
      </div>

      <div className="p-8 min-h-[450px]">
        {/* Step 1: User Details */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <h3 className="text-xl font-heading font-bold text-navy dark:text-white mb-1">Applicant Information</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Please enter details exactly as they appear on your ID.</p>
              </div>

              {/* KYC Type Selection */}
              <div className="md:col-span-2 mb-2">
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Verification Type</label>
                 <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => setFormData({...formData, kycType: 'Basic'})} 
                         className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${formData.kycType === 'Basic' ? 'border-primary bg-primary/5 dark:bg-primary/20 ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                       <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${formData.kycType === 'Basic' ? 'border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.kycType === 'Basic' && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                       </div>
                       <div>
                          <div className={`text-sm font-bold ${formData.kycType === 'Basic' ? 'text-primary' : 'text-navy dark:text-white'}`}>Basic KYC</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Standard Identity Verification with ID Proof & Selfie.</div>
                       </div>
                    </div>
                    <div onClick={() => setFormData({...formData, kycType: 'Full'})} 
                         className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${formData.kycType === 'Full' ? 'border-primary bg-primary/5 dark:bg-primary/20 ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                       <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${formData.kycType === 'Full' ? 'border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                          {formData.kycType === 'Full' && <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>}
                       </div>
                       <div>
                          <div className={`text-sm font-bold ${formData.kycType === 'Full' ? 'text-primary' : 'text-navy dark:text-white'}`}>Full KYC</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Comprehensive check with Address Proof & Risk Scoring.</div>
                       </div>
                    </div>
                 </div>
              </div>
              
              <div className="group">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Full Name</label>
                <input name="fullName" value={formData.fullName} onChange={handleInputChange} className="soft-input" placeholder="e.g. Thikash" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="soft-input" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Document Type</label>
                <div className="relative">
                  <select name="documentType" value={formData.documentType} onChange={handleInputChange} className="soft-input appearance-none">
                    <option>Aadhaar</option><option>PAN Card</option><option>Passport</option><option>Driving License</option>
                  </select>
                  <Icons.ChevronRight className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">ID Number</label>
                <input name="idNumber" value={formData.idNumber} onChange={handleInputChange} className="soft-input" placeholder="XXXX XXXX XXXX" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Full Address</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} className="soft-input min-h-[100px]" placeholder="Residential Address..." />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button disabled={!formData.fullName || !formData.idNumber} onClick={() => setStep(2)} className="primary-btn flex items-center gap-2">
                Next Step <Icons.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
               <h3 className="text-xl font-heading font-bold text-navy dark:text-white">Document Upload</h3>
               <p className="text-slate-500 dark:text-slate-400 text-sm">Upload clear images or PDFs of your documents.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
               {/* ID Proof */}
               <div className="space-y-3">
                  <div className="flex justify-between text-sm font-semibold text-navy dark:text-white px-1"><span>ID Proof</span><span className="text-danger">*</span></div>
                  {!idPreview ? (
                    <div 
                      onDragOver={(e) => handleDragId(e, true)}
                      onDragLeave={(e) => handleDragId(e, false)}
                      onDrop={handleDropId}
                      className={`h-48 border-2 border-dashed rounded-xl2 flex flex-col items-center justify-center cursor-pointer transition-all group relative ${isDraggingId ? 'border-primary bg-blue-50 dark:bg-blue-900/30 scale-[1.02] ring-4 ring-primary/10' : 'border-primary/30 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary'}`}
                    >
                       <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'id')} className="absolute inset-0 opacity-0 cursor-pointer" />
                       <div className={`w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-soft flex items-center justify-center text-primary mb-3 transition-transform ${isDraggingId ? 'scale-110' : 'group-hover:scale-110'}`}>
                          <Icons.Upload className="w-6 h-6" />
                       </div>
                       <span className="text-primary font-medium text-sm">{isDraggingId ? 'Drop to Upload ID' : 'Click to Upload or Drag & Drop'}</span>
                       <span className="text-xs text-slate-400 mt-1">JPG, PNG, PDF</span>
                    </div>
                  ) : (
                    <div className="h-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl2 relative overflow-hidden group shadow-sm">
                       {idFile?.type === 'application/pdf' || idFile?.name.endsWith('.pdf') ? (
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                             <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full mb-2">
                                <Icons.FileText className="w-8 h-8 text-red-500" />
                             </div>
                             <p className="text-xs font-bold text-navy dark:text-white truncate w-full px-4 mb-0.5" title={idFile.name}>{idFile.name}</p>
                             <p className="text-[10px] text-slate-400 mb-2">{(idFile.size / 1024).toFixed(0)} KB</p>
                             <span className="status-pill bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 text-[10px]">Ready for Verification</span>
                          </div>
                       ) : (
                          <img src={idPreview} className="w-full h-full object-cover" />
                       )}
                       <button onClick={() => handleRemoveFile('id')} className="absolute top-2 right-2 bg-white/80 dark:bg-black/50 backdrop-blur p-2 rounded-full text-danger hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm z-10"><Icons.Trash2 /></button>
                    </div>
                  )}
               </div>

               {/* Address Proof */}
               <div className="space-y-3">
                  <div className="flex justify-between text-sm font-semibold text-navy dark:text-white px-1"><span>Address Proof</span><span className="text-slate-400 text-xs font-normal">Optional</span></div>
                  {!addressPreview ? (
                    <div className="h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-xl2 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 transition-all group relative">
                       <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'address')} className="absolute inset-0 opacity-0 cursor-pointer" />
                       <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-300 mb-3 group-hover:text-navy dark:group-hover:text-white transition-colors">
                          <Icons.FileText className="w-6 h-6" />
                       </div>
                       <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Click to Upload</span>
                    </div>
                  ) : (
                    <div className="h-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl2 relative overflow-hidden group shadow-sm">
                       {addressFile?.type === 'application/pdf' || addressFile?.name.endsWith('.pdf') ? (
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                             <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full mb-2">
                                <Icons.FileText className="w-8 h-8 text-red-500" />
                             </div>
                             <p className="text-xs font-bold text-navy dark:text-white truncate w-full px-4 mb-0.5" title={addressFile.name}>{addressFile.name}</p>
                             <p className="text-[10px] text-slate-400 mb-2">{(addressFile.size / 1024).toFixed(0)} KB</p>
                             <span className="status-pill bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 text-[10px]">Ready for Verification</span>
                          </div>
                       ) : (
                          <img src={addressPreview} className="w-full h-full object-cover" />
                       )}
                       <button onClick={() => handleRemoveFile('address')} className="absolute top-2 right-2 bg-white/80 dark:bg-black/50 backdrop-blur p-2 rounded-full text-danger hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm z-10"><Icons.Trash2 /></button>
                    </div>
                  )}
               </div>
            </div>
            
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-semibold hover:text-navy dark:hover:text-white transition-colors">Back</button>
              <button disabled={!idFile} onClick={() => setStep(3)} className="primary-btn flex items-center gap-2">Next Step <Icons.ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* Step 3: Selfie */}
        {step === 3 && (
           <div className="max-w-xl mx-auto text-center animate-fade-in">
             <h3 className="text-xl font-heading font-bold text-navy dark:text-white mb-2">Liveness Check</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Position your face within the frame or upload a live photo/PDF.</p>
             
             <div className="relative aspect-video bg-navy rounded-xl2 overflow-hidden shadow-card mb-8 mx-auto border-4 border-white dark:border-slate-700 ring-1 ring-slate-200 dark:ring-slate-600">
                {selfiePreview ? (
                   selfieFile?.type === 'application/pdf' || selfieFile?.name.endsWith('.pdf') ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 bg-white dark:bg-slate-800">
                         <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-3">
                            <Icons.FileText className="w-10 h-10 text-red-500" />
                         </div>
                         <p className="text-sm font-bold text-navy dark:text-white">{selfieFile.name}</p>
                         <p className="text-xs text-slate-400">{(selfieFile.size / 1024).toFixed(0)} KB</p>
                         <span className="mt-2 status-pill bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800">Ready</span>
                      </div>
                   ) : (
                    <img src={selfiePreview} className="w-full h-full object-cover" />
                   )
                ) : isCameraOpen ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                     <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3"><Icons.Camera className="w-8 h-8" /></div>
                     <span>Camera Off</span>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {isCameraOpen && !selfiePreview && (
                   <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                      <button onClick={captureSelfie} className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-glow hover:scale-110 transition-transform"></button>
                   </div>
                )}
             </div>

             <div className="flex justify-center gap-4 flex-wrap">
                {!isCameraOpen && !selfiePreview && (
                   <>
                    <button onClick={startCamera} className="primary-btn flex items-center gap-2"><Icons.Camera /> Open Camera</button>
                    <div className="relative overflow-hidden">
                        <button className="px-6 py-3 rounded-full border border-slate-300 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                           <Icons.Upload className="w-4 h-4" /> Upload
                        </button>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'selfie')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                   </>
                )}
                {selfiePreview && (
                   <button onClick={() => { setSelfiePreview(null); setSelfieFile(null); }} className="px-6 py-3 rounded-full border border-slate-300 dark:border-slate-600 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Retake / Clear</button>
                )}
                {selfiePreview && (
                   <button onClick={handleVerify} className="primary-btn flex items-center gap-2">Verify Identity <Icons.ShieldCheck /></button>
                )}
             </div>
             {!isCameraOpen && !selfiePreview && (
                <button onClick={() => {stopCamera(); setStep(2)}} className="mt-6 text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm">Go Back</button>
             )}
           </div>
        )}
        
        {/* Step 4: Loading */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center h-[400px] animate-fade-in">
             <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-primarySoft rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Icons.ShieldCheck className="w-12 h-12 text-primary animate-pulse" />
                </div>
             </div>
             <h3 className="text-2xl font-heading font-bold text-navy dark:text-white">Analyzing Data</h3>
             <p className="text-slate-500 dark:text-slate-400 mt-2">AI is verifying document authenticity and biometrics...</p>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 5 && result && (
           <div className="max-w-3xl mx-auto animate-fade-in">
              <div className="text-center mb-10">
                 <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-lg font-bold mb-4 ${result.status === 'Verified' ? 'bg-green-100 text-green-700 border border-green-200' : result.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                    {result.status === 'Verified' ? <Icons.CheckCircle /> : result.status === 'Rejected' ? <Icons.XCircle /> : <Icons.AlertTriangle />}
                    {result.status}
                 </div>
                 <h2 className="text-3xl font-heading font-bold text-navy dark:text-white mb-2">Verification Complete</h2>
                 <p className="text-slate-500 dark:text-slate-400">{result.reason}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                 {/* Score Card */}
                 <div className="glass-panel p-6 rounded-xl2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <div className="w-24 h-24 rounded-full border-8 border-primarySoft flex items-center justify-center mb-3 relative">
                       <div className="text-2xl font-bold text-navy dark:text-white">{result.matchScore}%</div>
                       <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="46" fill="none" stroke="#3A6BFF" strokeWidth="8" strokeDasharray="289" strokeDashoffset={289 - (289 * result.matchScore) / 100} strokeLinecap="round" />
                       </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Confidence Score</span>
                    {result.livenessScore !== undefined && (
                        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold border ${result.livenessScore > 80 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'}`}>
                          Liveness: {result.livenessScore}%
                        </div>
                    )}
                 </div>

                 {/* OCR Data */}
                 <div className="md:col-span-2 glass-panel p-6 rounded-xl2 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Extracted Information</h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                       <div><label className="text-xs text-slate-400 block">Full Name</label><span className="font-semibold text-navy dark:text-white">{result.extractedData?.name}</span></div>
                       <div><label className="text-xs text-slate-400 block">Document ID</label><span className="font-semibold text-navy dark:text-white">{result.extractedData?.idNumber}</span></div>
                       <div><label className="text-xs text-slate-400 block">Date of Birth</label><span className="font-semibold text-navy dark:text-white">{result.extractedData?.dob}</span></div>
                       <div><label className="text-xs text-slate-400 block">Address</label><span className="font-semibold text-navy dark:text-white truncate block">{result.extractedData?.address || formData.address}</span></div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-center">
                 <button onClick={resetWizard} className="primary-btn px-10 shadow-glow">Process Another Application</button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

// 3. Dashboard & History Components
const DashboardStats = ({ documents }: { documents: DocumentRecord[] }) => {
  const stats = useMemo(() => ({
    total: documents.length,
    verified: documents.filter(d => d.status === 'Verified').length,
    pending: documents.filter(d => d.status === 'Pending').length,
    score: documents.length ? Math.round(documents.reduce((a, c) => a + c.matchScore, 0) / documents.length) : 0
  }), [documents]);

  const StatCard = ({ label, value, color, icon: Icon }: any) => (
    <div className="glass-panel p-6 rounded-xl2 relative overflow-hidden group transition-all hover:translate-y-[-4px]">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${color}`}></div>
      <div className="relative z-10">
         <div className="flex justify-between items-start mb-2">
           <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
           <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-current`}><Icon className="w-5 h-5" /></div>
         </div>
         <div className="text-3xl font-heading font-bold text-navy dark:text-white">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
       <StatCard label="Total Checks" value={stats.total} color="bg-blue-500 text-blue-600 dark:text-blue-400" icon={Icons.FileText} />
       <StatCard label="Verified" value={stats.verified} color="bg-accent text-accent dark:text-teal-400" icon={Icons.CheckCircle} />
       <StatCard label="Pending" value={stats.pending} color="bg-warning text-warning dark:text-yellow-400" icon={Icons.AlertTriangle} />
       <StatCard label="Avg Score" value={`${stats.score}%`} color="bg-primary text-primary dark:text-blue-400" icon={Icons.ShieldCheck} />
    </div>
  );
};

const HistoryTable = ({ documents }: { documents: DocumentRecord[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            doc.applicantId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || doc.documentType === filterType;
      const matchesStatus = filterStatus === 'All' || doc.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, searchTerm, filterType, filterStatus]);

  const handleExportCSV = () => {
    if (filteredDocs.length === 0) return;

    const headers = ['ID', 'Date', 'Applicant Name', 'Document Type', 'ID Number', 'Status', 'Match Score', 'Risk Score', 'Reason'];
    const csvRows = [headers.join(',')];

    for (const doc of filteredDocs) {
      const row = [
        doc.id,
        new Date(doc.timestamp).toLocaleDateString(),
        `"${doc.applicantName.replace(/"/g, '""')}"`,
        `"${doc.documentType}"`,
        `"${doc.applicantId}"`,
        doc.status,
        `"${doc.matchScore}%"`,
        doc.riskScore,
        `"${(doc.reason || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyc_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

   return (
     <div className="glass-panel rounded-xl2 overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
           <h3 className="text-lg font-heading font-bold text-navy dark:text-white">Recent Verifications</h3>
           
           <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                 <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white/50 dark:bg-slate-800 text-navy dark:text-white w-40 md:w-56"
                 />
              </div>

              {/* Type Filter */}
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)} 
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white/50 dark:bg-slate-800 text-navy dark:text-white"
              >
                 <option value="All">All Types</option>
                 <option value="Aadhaar">Aadhaar</option>
                 <option value="PAN Card">PAN Card</option>
                 <option value="Passport">Passport</option>
                 <option value="Driving License">Driving License</option>
              </select>

              {/* Status Filter */}
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)} 
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white/50 dark:bg-slate-800 text-navy dark:text-white"
              >
                 <option value="All">All Status</option>
                 <option value="Verified">Verified</option>
                 <option value="Pending">Pending</option>
                 <option value="Rejected">Rejected</option>
              </select>

              <button onClick={handleExportCSV} className="text-sm text-primary font-semibold hover:underline ml-2">Export CSV</button>
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
                 <tr>
                    <th className="px-6 py-4">Applicant</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                 {filteredDocs.length > 0 ? (
                   filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                       <td className="px-6 py-4">
                          <div className="font-bold text-navy dark:text-white">{doc.applicantName}</div>
                          <div className="text-xs text-slate-400">{doc.documentType}</div>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`status-pill ${doc.status === 'Verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : doc.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                             <span className={`w-2 h-2 rounded-full ${doc.status === 'Verified' ? 'bg-green-500' : doc.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                             {doc.status}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${doc.matchScore > 80 ? 'bg-accent' : 'bg-warning'}`} style={{ width: `${doc.matchScore}%` }}></div>
                             </div>
                             <span className="text-xs font-bold text-navy dark:text-white">{doc.matchScore}%</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(doc.timestamp).toLocaleDateString()}</td>
                       <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-primary"><Icons.ChevronRight /></button>
                       </td>
                    </tr>
                 ))
                 ) : (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            No records found matching your filters.
                        </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
     </div>
   );
};

// 4. Admin Dashboard Component
const AdminView = ({ documents, onUpdateStatus }: { documents: DocumentRecord[], onUpdateStatus: (id: string, status: VerificationStatus, reason: string) => void }) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDocType, setFilterDocType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const history = localStorage.getItem('kyc_admin_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const saveSearchToHistory = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('kyc_admin_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('kyc_admin_search_history');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveSearchToHistory(searchTerm);
      setShowHistory(false);
    }
  };

  const filteredDocs = useMemo(() => {
      return documents.filter(doc => {
        const matchesSearch = doc.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.applicantId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDocType = filterDocType === 'All' || doc.documentType === filterDocType;
        const matchesStatus = filterStatus === 'All' || doc.status === filterStatus;
        return matchesSearch && matchesDocType && matchesStatus;
      });
  }, [documents, searchTerm, filterDocType, filterStatus]);

  const stats = useMemo(() => {
    const total = filteredDocs.length;
    const verified = filteredDocs.filter(d => d.status === 'Verified').length;
    const pending = filteredDocs.filter(d => d.status === 'Pending').length;
    const rejected = filteredDocs.filter(d => d.status === 'Rejected').length;
    
    return {
        total,
        verified,
        pending,
        rejected
    };
  }, [filteredDocs]);

  const handleStatusAction = (status: VerificationStatus) => {
    if (selectedDoc) {
       onUpdateStatus(selectedDoc.id, status, rejectReason || (status === 'Verified' ? 'Manually approved by admin' : 'Rejected by admin'));
       setSelectedDoc(null);
       setRejectReason('');
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Admin Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="glass-panel p-6 rounded-xl2 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Icons.LayoutDashboard /></div>
            <div><div className="text-2xl font-bold text-navy dark:text-white">{stats.total}</div><div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Total Applications</div></div>
         </div>
         <div className="glass-panel p-6 rounded-xl2 flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><Icons.CheckCircle /></div>
            <div><div className="text-2xl font-bold text-navy dark:text-white">{stats.verified}</div><div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Verified</div></div>
         </div>
         <div className="glass-panel p-6 rounded-xl2 flex items-center gap-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg"><Icons.AlertTriangle /></div>
            <div><div className="text-2xl font-bold text-navy dark:text-white">{stats.pending}</div><div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Pending Review</div></div>
         </div>
         <div className="glass-panel p-6 rounded-xl2 flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><Icons.XCircle /></div>
            <div><div className="text-2xl font-bold text-navy dark:text-white">{stats.rejected}</div><div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Rejected</div></div>
         </div>
      </div>

      {/* Admin Review Table */}
      <div className="glass-panel rounded-xl2 overflow-hidden">
         <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-lg font-heading font-bold text-navy dark:text-white">Pending Review Queue</h3>
            
            <div className="flex items-center gap-3">
               {/* Filters */}
                <select 
                  value={filterDocType} 
                  onChange={(e) => setFilterDocType(e.target.value)} 
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white/50 dark:bg-slate-800 text-navy dark:text-white"
                >
                   <option value="All">All Types</option>
                   <option value="Aadhaar">Aadhaar</option>
                   <option value="PAN Card">PAN Card</option>
                   <option value="Passport">Passport</option>
                   <option value="Driving License">Driving License</option>
                </select>

                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)} 
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white/50 dark:bg-slate-800 text-navy dark:text-white"
                >
                   <option value="All">All Status</option>
                   <option value="Verified">Verified</option>
                   <option value="Pending">Pending</option>
                   <option value="Rejected">Rejected</option>
                </select>

                <div className="relative">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search applicant..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setShowHistory(true)}
                      onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                      onKeyDown={handleSearchKeyDown}
                      className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white/50 dark:bg-slate-800 text-navy dark:text-white w-64"
                    />
                    {showHistory && searchHistory.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden animate-fade-in">
                            <div className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Recent Searches</span>
                                <button onClick={clearHistory} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase">Clear</button>
                            </div>
                            {searchHistory.map((term, idx) => (
                                <div 
                                    key={idx} 
                                    className="px-3 py-2 text-sm text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer truncate flex items-center gap-2"
                                    onClick={() => { setSearchTerm(term); setShowHistory(false); }}
                                >
                                    <Icons.History className="w-3 h-3 text-slate-400" /> {term}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
         </div>
         <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
               <tr>
                  <th className="px-6 py-4">Applicant Name</th>
                  <th className="px-6 py-4">Document Type</th>
                  <th className="px-6 py-4">ID Number</th>
                  <th className="px-6 py-4">Risk Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
               {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                     <td className="px-6 py-4">
                        <div className="font-bold text-navy dark:text-white">{doc.applicantName}</div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="text-navy dark:text-white">{doc.documentType}</div>
                     </td>
                     <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{doc.applicantId}</td>
                     <td className="px-6 py-4">
                        <span className={`status-pill ${doc.riskScore === 'Low' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : doc.riskScore === 'High' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                           {doc.riskScore} Risk
                        </span>
                     </td>
                     <td className="px-6 py-4">
                         <span className={`status-pill ${doc.status === 'Verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : doc.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                             {doc.status}
                          </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedDoc(doc)} className="text-primary font-semibold hover:underline text-xs uppercase tracking-wide">Review</button>
                     </td>
                  </tr>
               ))}
               {filteredDocs.length === 0 && (
                 <tr><td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">No applications found matching your search.</td></tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Review Modal */}
      {selectedDoc && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel w-full max-w-2xl rounded-xl2 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-white/5">
                  <h3 className="text-xl font-heading font-bold text-navy dark:text-white">Review Application: {selectedDoc.applicantName}</h3>
                  <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"><Icons.XCircle className="text-slate-400" /></button>
               </div>
               
               <div className="p-8 overflow-y-auto flex-1 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div>
                         <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Document Type</label>
                         <div className="text-navy dark:text-white font-bold">{selectedDoc.documentType}</div>
                      </div>
                      <div>
                         <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">ID Number</label>
                         <div className="text-navy dark:text-white font-bold font-mono">{selectedDoc.applicantId}</div>
                      </div>
                      <div>
                         <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">AI Match Score</label>
                         <div className={`text-lg font-bold ${selectedDoc.matchScore > 80 ? 'text-accent' : 'text-warning'}`}>{selectedDoc.matchScore}%</div>
                      </div>
                      <div>
                         <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Risk Assessment</label>
                         <div className={`text-lg font-bold ${selectedDoc.riskScore === 'Low' ? 'text-accent' : 'text-danger'}`}>{selectedDoc.riskScore} Risk</div>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                     <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">AI Analysis Reason</label>
                     <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedDoc.reason}</p>
                  </div>

                  <div>
                     <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Extracted Data</label>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"><span className="text-slate-400 block text-xs">Name</span><span className="dark:text-white">{selectedDoc.extractedData?.name || 'N/A'}</span></div>
                        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"><span className="text-slate-400 block text-xs">DOB</span><span className="dark:text-white">{selectedDoc.extractedData?.dob || 'N/A'}</span></div>
                        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"><span className="text-slate-400 block text-xs">ID No.</span><span className="dark:text-white">{selectedDoc.extractedData?.idNumber || 'N/A'}</span></div>
                        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"><span className="text-slate-400 block text-xs">Address</span><span className="dark:text-white">{selectedDoc.extractedData?.address || 'N/A'}</span></div>
                     </div>
                  </div>
               </div>

               <div className="p-6 border-t border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 space-y-4">
                  <textarea 
                     className="soft-input text-sm min-h-[80px]" 
                     placeholder="Add a reason for rejection or admin notes..." 
                     value={rejectReason}
                     onChange={(e) => setRejectReason(e.target.value)}
                  ></textarea>
                  <div className="flex gap-4">
                     <button onClick={() => handleStatusAction('Rejected')} className="flex-1 py-3 rounded-full border border-red-200 bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                        <Icons.ThumbsDown className="w-4 h-4" /> Reject
                     </button>
                     <button onClick={() => handleStatusAction('Verified')} className="flex-1 primary-btn flex items-center justify-center gap-2">
                        <Icons.ThumbsUp className="w-4 h-4" /> Approve Application
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

// 5. Main App Component
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState<DocumentRecord[]>(MOCK_HISTORY);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('kyc_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.body.classList.add('dark');
      localStorage.setItem('kyc_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('kyc_theme', 'light');
    }
  };

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);

  const handleVerificationComplete = (newDoc: DocumentRecord) => {
    setDocuments([newDoc, ...documents]);
    setActiveTab('dashboard');
  };

  const handleStatusUpdate = (id: string, status: VerificationStatus, reason: string) => {
    setDocuments(documents.map(d => d.id === id ? { ...d, status, reason } : d));
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primarySoft via-bgSoft to-white dark:from-slate-950 dark:via-slate-900 dark:to-black transition-colors duration-300">
      {/* Sidebar */}
      <aside className="fixed left-4 top-4 bottom-4 w-64 glass-panel rounded-xl2 flex flex-col z-20 hidden md:flex shadow-2xl dark:shadow-black/50">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-blue-600 p-2.5 rounded-xl shadow-glow">
            <Icons.Fingerprint className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-heading font-bold text-navy dark:text-white tracking-tight">Kyzen</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', label: 'Admin Dashboard', icon: Icons.LayoutDashboard, role: 'admin' },
            { id: 'dashboard', label: 'Dashboard', icon: Icons.LayoutDashboard, role: 'analyst' },
            { id: 'kyc', label: 'Verify Identity', icon: Icons.Upload },
            { id: 'history', label: 'Verifications', icon: Icons.History },
          ].filter(item => !item.role || item.role === user.role).map(item => (
            <button
              key={item.id + (item.role || '')}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-primary text-white shadow-glow' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-navy dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-primary dark:group-hover:text-white'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Icons.LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header & Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-10 animate-fade-in">
          <div className="md:hidden flex items-center gap-3">
             <div className="bg-primary p-2 rounded-lg"><Icons.Fingerprint className="w-6 h-6 text-white" /></div>
             <span className="text-xl font-bold text-navy dark:text-white">Kyzen</span>
          </div>

          <div className="hidden md:block">
             <h2 className="text-2xl font-heading font-bold text-navy dark:text-white">
               {activeTab === 'dashboard' ? (user.role === 'admin' ? 'Admin Overview' : 'Dashboard') : 
                activeTab === 'kyc' ? 'New Verification' : 'History'}
             </h2>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Welcome back, {user.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full border border-emerald-100 dark:border-emerald-900/30">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">System Online</span>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme} 
              className="glass-panel p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors shadow-sm border border-white/50 dark:border-white/5"
              aria-label="Toggle Dark Mode"
            >
                {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3 pl-3 md:border-l border-slate-200 dark:border-white/10">
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-navy to-primary flex items-center justify-center text-white font-bold shadow-lg text-sm ring-2 ring-white dark:ring-slate-800">
                  {user.name.charAt(0)}
               </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
           {activeTab === 'dashboard' && (
             user.role === 'admin' 
               ? <AdminView documents={documents} onUpdateStatus={handleStatusUpdate} /> 
               : <DashboardStats documents={documents} />
           )}
           {activeTab === 'kyc' && <UploadKYCWizard onVerificationComplete={handleVerificationComplete} />}
           {activeTab === 'history' && <HistoryTable documents={documents} />}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);