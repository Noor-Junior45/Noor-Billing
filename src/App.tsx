import React, { useState, useEffect, useRef } from 'react';
import { Tab, User, Customer, Sale, StoreSettings } from './types';
import { StoreService } from './services/storeService';
import { supabase } from './services/supabase';
import { Auth } from './pages/Auth';
import { POS } from './pages/POS';
import { Customers as CRM } from './pages/Customers';
import { Profile } from './pages/Profile';
import { 
  ShoppingBag, 
  Users, 
  User as UserIcon, 
  LogOut, 
  Store, 
  Wallet, 
  ArrowLeft, 
  CheckCircle2, 
  QrCode, 
  Smartphone, 
  Upload, 
  ChevronRight, 
  Receipt,
  FileText,
  MapPin,
  Mail,
  Phone,
  Printer,
  Calendar,
  IndianRupee,
  HelpCircle,
  Eye,
  Camera,
  Star,
  Sparkles,
  Settings,
  Volume2,
  Bell,
  Copy,
  Check,
  Lock,
  ChevronDown,
  Download,
  Scan,
  Scale,
  History,
  Image as ImageIcon,
  Shield,
  PlusCircle
} from 'lucide-react';
import { Card, Button, Input, Modal } from './components/UI';
import { PrivacyPolicy, TermsOfService } from './components/legal/LegalDocuments';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.POS);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'privacy') return 'privacy';
    if (params.get('view') === 'terms') return 'terms';
    
    const path = window.location.pathname;
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    
    const hash = window.location.hash;
    if (hash === '#/privacy' || hash === '#privacy') return 'privacy';
    if (hash === '#/terms' || hash === '#terms') return 'terms';
    
    return null;
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      const hash = window.location.hash;
      
      if (params.get('view') === 'privacy' || path === '/privacy' || hash === '#/privacy' || hash === '#privacy') {
        setLegalView('privacy');
      } else if (params.get('view') === 'terms' || path === '/terms' || hash === '#/terms' || hash === '#terms') {
        setLegalView('terms');
      } else {
        setLegalView(null);
      }
    };
    
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleOpenPrivacy = () => {
    window.history.pushState({}, '', '?view=privacy');
    setLegalView('privacy');
  };

  const handleOpenTerms = () => {
    window.history.pushState({}, '', '?view=terms');
    setLegalView('terms');
  };

  const handleCloseLegalView = () => {
    window.history.pushState({}, '', window.location.pathname);
    setLegalView(null);
  };

  // PWA download / installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(true); // Default true so they can always trigger the guide/download instructions
  const [showInstallGuide, setShowInstallGuide] = useState(false);



  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already in standalone mode (installed as an app)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    if (!isProfileOpen) {
      setShowSignOutConfirm(false);
    }
  }, [isProfileOpen]);

  useEffect(() => {
    const handleChangeTab = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('change-tab' as any, handleChangeTab);
    return () => window.removeEventListener('change-tab' as any, handleChangeTab);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await StoreService.getRawData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noor_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      try {
        const json = JSON.parse(readerEvent.target?.result as string);
        if (window.confirm("Are you sure you want to overwrite your current store database with this backup file? This action is permanent and cannot be undone.")) {
          await StoreService.importData(json);
          alert("Store database imported and restored successfully!");
          window.location.reload();
        }
      } catch (err) { 
        alert("Invalid file format."); 
      }
    };
    reader.readAsText(file);
  };

  // --- Parse Custom Routing paths ---
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  const isCustomerPortal = path.startsWith('/c/') || searchParams.has('c') || hash.startsWith('#/c/');
  const isInvoiceView = path.startsWith('/invoice/') || searchParams.has('invoice') || hash.startsWith('#/invoice/');

  let targetId: string | null = null;
  if (isCustomerPortal) {
    if (path.startsWith('/c/')) {
      targetId = path.split('/c/')[1];
    } else if (searchParams.has('c')) {
      targetId = searchParams.get('c');
    } else if (hash.startsWith('#/c/')) {
      targetId = hash.split('#/c/')[1];
    }
  } else if (isInvoiceView) {
    if (path.startsWith('/invoice/')) {
      targetId = path.split('/invoice/')[1].replace('.html', '');
    } else if (searchParams.has('invoice')) {
      targetId = searchParams.get('invoice');
    } else if (hash.startsWith('#/invoice/')) {
      targetId = hash.split('#/invoice/')[1].replace('.html', '');
    }
  }

  useEffect(() => {
    async function initApp() {
      try {
        // Check if there's a cached staff user or active Supabase session
        let restoredUser: User | null = null;
        const staffSession = localStorage.getItem('noor_staff_user');
        if (staffSession) {
          restoredUser = JSON.parse(staffSession);
        } else {
          // Check Supabase authentication
          let session = null;
          try {
            const { data } = await supabase.auth.getSession();
            session = data?.session;
          } catch (err) {
            console.warn("Failed to retrieve Supabase session:", err);
          }

          if (session?.user) {
            const supabaseUser = session.user;
            restoredUser = {
              id: supabaseUser.id,
              username: (supabaseUser.email || '').split('@')[0],
              name: supabaseUser.user_metadata?.name || (supabaseUser.email || '').split('@')[0],
              email: supabaseUser.email || undefined,
              role: 'admin',
              pin: ''
            };
            localStorage.setItem('noor_user_uid', restoredUser.id);
            localStorage.setItem('noor_user_name', restoredUser.name);
            if (restoredUser.email) {
              localStorage.setItem('noor_user_email', restoredUser.email);
            }
          } else {
            const uid = localStorage.getItem('noor_user_uid');
            if (uid && uid !== 'guest') {
              restoredUser = {
                id: uid,
                username: localStorage.getItem('noor_user_name')?.toLowerCase().replace(/\s+/g, '') || 'admin',
                name: localStorage.getItem('noor_user_name') || 'Administrator',
                email: localStorage.getItem('noor_user_email') || undefined,
                role: 'admin',
                pin: ''
              };
            }
          }
        }

        if (restoredUser) {
          setUser(restoredUser);
        }

        // Load initial settings AFTER user/session has been determined and initialized
        const loadedSettings = await StoreService.getSettings();
        setSettings(loadedSettings);
      } catch (e) {
        console.warn('Authentication restore failed:', e);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  const handleLogin = async (newUser: User) => {
    StoreService.clearCache();
    setUser(newUser);
    localStorage.setItem('noor_user_name', newUser.name);
    localStorage.setItem('noor_user_uid', newUser.id);
    if (newUser.email) {
      localStorage.setItem('noor_user_email', newUser.email);
    }
    try {
      const loadedSettings = await StoreService.getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      console.warn("Failed to load settings after login:", err);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of Noor Companion?')) {
      await StoreService.logout();
      setUser(null);
    }
  };

  const handleUpdateSettings = async (updates: Partial<StoreSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    await StoreService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleToggleNotifications = async () => {
    if (!settings) return;
    const newState = !settings.notificationsEnabled;
    if (newState) {
      if (!("Notification" in window)) {
        alert("Browser does not support notifications");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Permission denied.");
        return;
      }
    }
    await handleUpdateSettings({ notificationsEnabled: newState });
  };

  // --- RENDER CUSTOMER PORTAL VIEW ---
  if (isCustomerPortal && targetId) {
    return <CustomerPortalView customerId={targetId} />;
  }

  // --- RENDER DIGITAL INVOICE VIEW ---
  if (isInvoiceView && targetId) {
    return <DigitalInvoiceView saleId={targetId} />;
  }

  // --- RENDER STANDALONE COMPLIANCE PAGES (OAuth friendly) ---
  if (legalView) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900 animate-in fade-in duration-300">
        <header className="sticky top-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-4 md:px-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img 
                src="https://lh3.googleusercontent.com/p/AF1QipPlp0QUwcp2FOnTGiGNf5fqWnskinCj4QxRKa3o=s1360-w1360-h1020-rw" 
                alt="Noor Billing Logo" 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover border border-[#1A1A18]/10 shadow-sm shrink-0"
              />
              <span className="font-serif font-extrabold tracking-tight text-slate-900 text-sm md:text-base uppercase">
                Noor Billing
              </span>
            </div>
            <button
              onClick={handleCloseLegalView}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-sm transition-all cursor-pointer border-0"
            >
              Back to Sign In
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-16 md:px-8">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-md p-6 md:p-12">
            {legalView === 'privacy' ? <PrivacyPolicy standalone /> : <TermsOfService standalone />}
          </div>
        </main>

        <footer className="bg-slate-50 border-t border-slate-200/60 py-8 px-4 text-center text-[10px] font-mono text-slate-400">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© {new Date().getFullYear()} Noor Billing. All rights reserved.</div>
            <div className="flex gap-4">
              <button onClick={() => { window.history.pushState({}, '', '?view=privacy'); setLegalView('privacy'); }} className="text-slate-400 hover:text-slate-900 transition-colors bg-transparent border-0 font-mono text-[10px] cursor-pointer">Privacy Policy</button>
              <button onClick={() => { window.history.pushState({}, '', '?view=terms'); setLegalView('terms'); }} className="text-slate-400 hover:text-slate-900 transition-colors bg-transparent border-0 font-mono text-[10px] cursor-pointer">Terms of Service</button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center font-sans text-[#1A1A18] antialiased">
        <div className="w-12 h-12 rounded-full border-4 border-t-black border-black/10 animate-spin mb-4"></div>
        <p className="text-xs font-mono font-bold tracking-widest uppercase animate-pulse">Initializing Noor Companion...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth 
          onLogin={handleLogin} 
          onOpenPrivacy={handleOpenPrivacy} 
          onOpenTerms={handleOpenTerms} 
        />

        {/* Privacy Policy Modal */}
        <Modal 
          isOpen={showPrivacyPolicy} 
          onClose={() => setShowPrivacyPolicy(false)} 
          title="Privacy Policy"
          className="!max-w-2xl"
        >
          <PrivacyPolicy />
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <Button onClick={() => setShowPrivacyPolicy(false)} className="bg-black text-white hover:bg-black/90 font-bold px-5">
              Close
            </Button>
          </div>
        </Modal>

        {/* Terms of Service Modal */}
        <Modal 
          isOpen={showTermsOfService} 
          onClose={() => setShowTermsOfService(false)} 
          title="Terms of Service"
          className="!max-w-2xl"
        >
          <TermsOfService />
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <Button onClick={() => setShowTermsOfService(false)} className="bg-black text-white hover:bg-black/90 font-bold px-5">
              Close
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#1A1A18] flex flex-col font-sans select-none overflow-x-hidden pb-4">
      {/* Top Main App Bar & Navbar in Crisp Pristine White */}
      <header className="bg-white border-b border-slate-200 px-4 pt-3.5 pb-0 flex flex-col gap-3 sticky top-0 z-40 w-full animate-in fade-in duration-200">
        {/* Row 1: Store info on left, Profile on right */}
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Left Side: Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="bg-white p-1 rounded-lg border border-[#1A1A18]/10 shadow-sm shrink-0">
              <img 
                src={settings?.logo || "https://lh3.googleusercontent.com/p/AF1QipPlp0QUwcp2FOnTGiGNf5fqWnskinCj4QxRKa3o=s1360-w1360-h1020-rw"} 
                alt="Store Logo" 
                className="w-8 h-8 rounded-md object-cover"
              />
            </div>
            <div className="text-left">
              <h1 className="text-xs md:text-sm font-serif font-extrabold tracking-tight leading-none text-[#1A1A18] uppercase">
                {settings?.storeName || 'Noor Warehouse'}
              </h1>
            </div>
          </div>

          {/* Right Side: Profile Avatar Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`relative w-9 h-9 rounded-full overflow-hidden transition-all cursor-pointer border ${
                isProfileOpen 
                  ? 'border-black ring-2 ring-[#2D5A27]/20' 
                  : 'border-[#1A1A18]/15 hover:border-[#1A1A18] hover:shadow-sm'
              }`}
              title="Profile & Store Settings"
            >
              {settings?.logo ? (
                <img src={settings.logo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Integrated Tabs Navbar */}
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 py-2.5 w-full">
          {/* POS Tab */}
          <button
            onClick={() => {
              setActiveTab(Tab.POS);
              setIsProfileOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-0 rounded-full ${
              activeTab === Tab.POS && !isProfileOpen
                ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50'
                : 'text-slate-600 hover:text-black hover:bg-slate-50'
            }`}
          >
            <ShoppingBag size={14} className={`stroke-[2.5px] ${activeTab === Tab.POS && !isProfileOpen ? 'text-emerald-600 fill-emerald-200/30' : 'text-emerald-500'}`} />
            <span>POS</span>
          </button>

          {/* Vertical Separator */}
          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* History Tab */}
          <button
            onClick={() => {
              setActiveTab(Tab.HISTORY);
              setIsProfileOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-0 rounded-full ${
              activeTab === Tab.HISTORY && !isProfileOpen
                ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-100/50'
                : 'text-slate-600 hover:text-black hover:bg-slate-50'
            }`}
          >
            <History size={14} className={`stroke-[2.5px] ${activeTab === Tab.HISTORY && !isProfileOpen ? 'text-blue-600' : 'text-blue-500'}`} />
            <span>History</span>
          </button>

          {/* Vertical Separator */}
          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* CRM Tab */}
          <button
            onClick={() => {
              setActiveTab(Tab.CUSTOMERS);
              setIsProfileOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-0 rounded-full ${
              activeTab === Tab.CUSTOMERS && !isProfileOpen
                ? 'bg-amber-50 text-amber-800 shadow-sm border border-amber-100/50'
                : 'text-slate-600 hover:text-black hover:bg-slate-50'
            }`}
          >
            <Users size={14} className={`stroke-[2.5px] ${activeTab === Tab.CUSTOMERS && !isProfileOpen ? 'text-amber-600 fill-amber-200/30' : 'text-amber-500'}`} />
            <span>CRM</span>
          </button>
        </div>
      </header>

      {/* Profile Dropdown Card Styled like Template */}
      {isProfileOpen && (
        <>
          {/* Back Overlay to dismiss the dropdown easily */}
          <div 
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-[9998]" 
            onClick={() => setIsProfileOpen(false)} 
          />

          <div className="fixed right-4 top-16 w-[calc(100%-2rem)] max-w-[380px] bg-[#F5F3EC] text-slate-800 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-slate-300/40 z-[9999] p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            {/* Close Button */}
            <button 
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-slate-300/30 hover:bg-slate-300/60 text-slate-600 hover:text-slate-900 rounded-full transition-all cursor-pointer border-0 flex items-center justify-center z-10"
              title="Close"
            >
              <span className="text-xl font-medium leading-none">×</span>
            </button>
            
            {/* User Credentials (Gmail Settings Style) */}
            <div className="flex flex-col items-center text-center mt-6 mb-6 w-full px-1">
              <div className="flex flex-col items-center gap-2 justify-center">
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-extrabold border border-indigo-200 uppercase tracking-wider shrink-0">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                  Supabase Secure
                </span>
                <span className="text-base font-extrabold text-slate-900 tracking-tight">{user.name}</span>
              </div>
              
              <div className="flex flex-col items-center gap-1.5 mt-2.5">
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-500 shrink-0" />
                  {user.email || `${user.username}@supabase.com`}
                </span>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(user.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="group/btn text-[10px] text-slate-500 font-bold hover:text-slate-700 transition-colors flex items-center gap-1.5 bg-slate-300/40 hover:bg-slate-300/60 px-2.5 py-1 rounded-lg border-0 cursor-pointer"
                  title="Click to copy Supabase ID"
                >
                  <span className="font-mono text-[9px]">ID: {user.id}</span>
                  {copiedId ? (
                    <Check size={11} className="text-emerald-700" />
                  ) : (
                    <Copy size={11} className="text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-300/60 w-full mb-5" />

            {/* SECTION: Alerts & Reminders */}
            <div className="w-full text-left mb-5">
              <span className="text-[10px] font-black text-[#0E9F6E] uppercase tracking-wider block mb-3.5">
                Alerts & Reminders
              </span>

              <div className="space-y-3.5">
                {/* Sound Effects Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <Volume2 size={18} className="text-[#3B82F6] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Sound Effects</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Audio feedback on POS actions</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ soundEnabled: !settings?.soundEnabled })}
                    className={`w-10 h-5 rounded-full transition-all duration-300 relative shrink-0 border-0 cursor-pointer ${settings?.soundEnabled ? 'bg-[#0E9F6E]' : 'bg-slate-400'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow ${settings?.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Push Notifications Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <Bell size={18} className="text-[#0E9F6E] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Push Notifications</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Local browser stock warnings</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleNotifications}
                    className={`w-10 h-5 rounded-full transition-all duration-300 relative shrink-0 border-0 cursor-pointer ${settings?.notificationsEnabled ? 'bg-[#0E9F6E]' : 'bg-slate-400'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow ${settings?.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Auto-open Add Product Form Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <PlusCircle size={18} className="text-[#3F83F8] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Add product form</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Show add form when scan isn't found</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ autoOpenAddProduct: settings?.autoOpenAddProduct === false ? true : false })}
                    className={`w-10 h-5 rounded-full transition-all duration-300 relative shrink-0 border-0 cursor-pointer ${settings?.autoOpenAddProduct !== false ? 'bg-[#0E9F6E]' : 'bg-slate-400'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow ${settings?.autoOpenAddProduct !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Currency Symbol setting */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <IndianRupee size={18} className="text-[#F59E0B] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Currency Symbol</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Symbol in prices & invoices</span>
                    </div>
                  </div>
                  <input 
                    type="text"
                    maxLength={3}
                    value={settings?.currencySymbol || '₹'} 
                    onChange={(e) => handleUpdateSettings({ currencySymbol: e.target.value })} 
                    className="w-12 text-center font-black text-xs bg-slate-300/40 border border-slate-300/80 rounded-lg py-1 px-1.5 outline-none focus:border-[#0E9F6E] focus:bg-white transition-all text-left" 
                  />
                </div>
              </div>
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-300/60 w-full mb-5" />

            {/* SECTION: Hardware & Layout */}
            <div className="w-full text-left mb-5">
              <span className="text-[10px] font-black text-[#6366F1] uppercase tracking-wider block mb-3.5">
                Hardware & Layout
              </span>

              <div className="space-y-3.5">
                {/* Direct thermal printing switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <Printer size={18} className="text-[#6366F1] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Direct Thermal Print</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Skip print dialogs instantly</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ directPrintEnabled: !settings?.directPrintEnabled })}
                    className={`w-10 h-5 rounded-full transition-all duration-300 relative shrink-0 border-0 cursor-pointer ${settings?.directPrintEnabled ? 'bg-[#0E9F6E]' : 'bg-slate-400'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow ${settings?.directPrintEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Embed Store Logo on Receipts switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <ImageIcon size={18} className="text-[#EC4899] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Logo on Receipt</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Embed logo header in PDF</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ showLogoOnReceipt: !settings?.showLogoOnReceipt })}
                    className={`w-10 h-5 rounded-full transition-all duration-300 relative shrink-0 border-0 cursor-pointer ${settings?.showLogoOnReceipt ? 'bg-[#0E9F6E]' : 'bg-slate-400'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow ${settings?.showLogoOnReceipt ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Barcode scanner input preference */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <Scan size={18} className="text-[#06B6D4] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Barcode Scanner</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Preferred scanner method</span>
                    </div>
                  </div>
                  <select 
                    value={settings?.scannerPreference || 'both'}
                    onChange={(e) => handleUpdateSettings({ scannerPreference: e.target.value as any })}
                    className="text-xs font-bold bg-slate-300/40 border border-slate-300/80 rounded-lg py-1 px-1.5 outline-none focus:border-[#0E9F6E] focus:bg-white text-slate-700 cursor-pointer"
                  >
                    <option value="phone">Cam Scan</option>
                    <option value="machine">Laser Gun</option>
                    <option value="both">Hybrid</option>
                  </select>
                </div>

                {/* Default Tax Rate select */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3.5">
                    <Scale size={18} className="text-[#F59E0B] mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">Default GST Rate</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">Standard tax on checkouts</span>
                    </div>
                  </div>
                  <select 
                    value={settings?.taxRateDefault ?? 0}
                    onChange={(e) => handleUpdateSettings({ taxRateDefault: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-bold bg-slate-300/40 border border-slate-300/80 rounded-lg py-1 px-1.5 outline-none focus:border-[#0E9F6E] focus:bg-white text-slate-700 cursor-pointer"
                  >
                    <option value={0}>0% Free</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-300/60 w-full mb-5" />

            {/* SECTION: Custom Templates */}
            <div className="w-full text-left mb-5">
              <span className="text-[10px] font-black text-[#8B5CF6] uppercase tracking-wider block mb-3.5">
                Custom Templates & Slogans
              </span>

              <div className="space-y-3.5">
                {/* Receipt Tagline */}
                <div className="flex flex-col gap-1.5 text-left">
                  <span className="font-bold text-slate-700 text-xs">Receipt Tagline (Header)</span>
                  <input 
                    type="text"
                    placeholder="e.g. Thanks for shopping with us!"
                    value={settings?.receiptHeader || ''}
                    onChange={(e) => handleUpdateSettings({ receiptHeader: e.target.value })}
                    className="w-full text-xs font-semibold bg-slate-300/40 border border-slate-300/80 rounded-lg py-1.5 px-3 outline-none focus:border-[#0E9F6E] focus:bg-white transition-all text-slate-800" 
                  />
                </div>

                {/* Receipt Footer */}
                <div className="flex flex-col gap-1.5 text-left">
                  <span className="font-bold text-slate-700 text-xs">Receipt Footer (Policies)</span>
                  <input 
                    type="text"
                    placeholder="e.g. Items returnable within 7 days"
                    value={settings?.receiptFooter || ''}
                    onChange={(e) => handleUpdateSettings({ receiptFooter: e.target.value })}
                    className="w-full text-xs font-semibold bg-slate-300/40 border border-slate-300/80 rounded-lg py-1.5 px-3 outline-none focus:border-[#0E9F6E] focus:bg-white transition-all text-slate-800" 
                  />
                </div>
              </div>
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-300/60 w-full mb-5" />

            {/* SECTION: Backup & Database */}
            <div className="w-full text-left mb-6">
              <span className="text-[10px] font-black text-[#EC4899] uppercase tracking-wider block mb-3.5">
                Local Database & Backup
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleExport} 
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-300/40 hover:bg-slate-300/60 border-0 rounded-xl text-slate-800 font-bold hover:text-slate-900 transition-colors cursor-pointer text-xs"
                >
                  <Download size={13} className="text-blue-600"/>
                  <span>Export Backup</span>
                </button>
                <button 
                  onClick={handleImportClick} 
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-300/40 hover:bg-slate-300/60 border-0 rounded-xl text-slate-800 font-bold hover:text-slate-900 transition-colors cursor-pointer text-xs"
                >
                  <Upload size={13} className="text-purple-600"/>
                  <span>Import Backup</span>
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-300/60 w-full mb-5" />

            {/* SECTION: Legal & Compliance */}
            <div className="w-full text-left mb-6">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-3.5">
                Legal & Compliance
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setShowPrivacyPolicy(true); setIsProfileOpen(false); }} 
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-300/40 hover:bg-slate-300/60 border-0 rounded-xl text-slate-800 font-bold hover:text-slate-900 transition-colors cursor-pointer text-xs"
                >
                  <Shield size={13} className="text-[#0E9F6E] fill-emerald-100/10"/>
                  <span>Privacy Policy</span>
                </button>
                <button 
                  onClick={() => { setShowTermsOfService(true); setIsProfileOpen(false); }} 
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-300/40 hover:bg-slate-300/60 border-0 rounded-xl text-slate-800 font-bold hover:text-slate-900 transition-colors cursor-pointer text-xs"
                >
                  <FileText size={13} className="text-blue-600"/>
                  <span>Terms of Service</span>
                </button>
              </div>
            </div>

            {/* Divider line */}
            <div className="border-t border-slate-300/60 w-full mb-6" />

            {/* Red Sign Out button at bottom of dropdown menu */}
            {!showSignOutConfirm ? (
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full py-4 bg-[#E54B35] hover:bg-[#d43f29] text-white font-bold text-sm rounded-[24px] border-0 cursor-pointer shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="w-full flex gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-3 bg-slate-300/80 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-[20px] border-0 cursor-pointer shadow-sm transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsProfileOpen(false);
                    setShowSignOutConfirm(false);
                    await StoreService.logout();
                    setUser(null);
                  }}
                  className="flex-1 py-3 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-[20px] border-0 cursor-pointer shadow-md transition-all text-center"
                >
                  Confirm Sign Out
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 relative">
        {(activeTab === Tab.POS || activeTab === Tab.HISTORY) && (
          <POS 
            currentUser={user} 
            initialViewMode={activeTab === Tab.HISTORY ? 'HISTORY' : 'POS'} 
            settings={settings}
          />
        )}
        {activeTab === Tab.CUSTOMERS && <CRM />}
        {activeTab === Tab.PROFILE && (
          <div className="max-w-2xl mx-auto">
            <Profile 
              key={`${settings?.notificationsEnabled}-${settings?.soundEnabled}-${settings?.currencySymbol}`}
              user={user} 
              onLogin={handleLogin} 
              onLogout={handleLogout} 
              onSettingsChange={handleUpdateSettings}
            />
          </div>
        )}
      </main>

      {/* Privacy Policy Modal */}
      <Modal 
        isOpen={showPrivacyPolicy} 
        onClose={() => setShowPrivacyPolicy(false)} 
        title="Privacy Policy"
        className="!max-w-2xl"
      >
        <PrivacyPolicy />
        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <Button onClick={() => setShowPrivacyPolicy(false)} className="bg-black text-white hover:bg-black/90 font-bold px-5">
            Close
          </Button>
        </div>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal 
        isOpen={showTermsOfService} 
        onClose={() => setShowTermsOfService(false)} 
        title="Terms of Service"
        className="!max-w-2xl"
      >
        <TermsOfService />
        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <Button onClick={() => setShowTermsOfService(false)} className="bg-black text-white hover:bg-black/90 font-bold px-5">
            Close
          </Button>
        </div>
      </Modal>

      {/* Install PWA App Guide Modal */}
      <Modal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        title="Download / Install Noor Billing"
        className="!max-w-md"
      >
        <div className="space-y-4 text-slate-700 text-xs">
          <div className="flex justify-center pb-2">
            <img 
              src="https://lh3.googleusercontent.com/p/AF1QipPlp0QUwcp2FOnTGiGNf5fqWnskinCj4QxRKa3o=s1360-w1360-h1020-rw" 
              alt="Noor Billing Logo" 
              className="w-16 h-16 rounded-xl object-cover border border-[#1A1A18]/10 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-center font-bold text-slate-950 text-sm">Download Noor Billing onto your Device</p>
          <p className="leading-relaxed">
            You can install Noor Billing as a fully offline-capable app on your computer, tablet, or smartphone.
          </p>
          
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 bg-black text-white text-[10px] rounded-full flex items-center justify-center">1</span>
                On Desktop (Chrome, Edge, Brave)
              </h4>
              <p className="pl-6 text-[11px] text-slate-600 leading-normal">
                Click the <strong className="text-slate-950">Install App</strong> button in the navbar, or look for the install icon (<strong className="text-slate-950">⊕</strong>) in your browser's address bar to download instantly.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 bg-black text-white text-[10px] rounded-full flex items-center justify-center">2</span>
                On iPhone & iPad (iOS Safari)
              </h4>
              <p className="pl-6 text-[11px] text-slate-600 leading-normal">
                Tap the <strong className="text-slate-950">Share</strong> button (box with an up arrow) at the bottom of Safari, scroll down and tap <strong className="text-slate-950">"Add to Home Screen"</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 bg-black text-white text-[10px] rounded-full flex items-center justify-center">3</span>
                On Android Phone & Tablet (Chrome)
              </h4>
              <p className="pl-6 text-[11px] text-slate-600 leading-normal">
                Tap the browser's menu button (three vertical dots) near the top-right, and tap <strong className="text-slate-950">"Install app"</strong> or <strong className="text-slate-950">"Add to Home screen"</strong>.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button onClick={() => setShowInstallGuide(false)} className="bg-black text-white hover:bg-black/90 font-bold px-5">
              Got It
            </Button>
          </div>
        </div>
      </Modal>


    </div>
  );
}

// ==========================================
// CUSTOMER SECURE PORTAL VIEW COMPONENT
// ==========================================
const compressBase64Image = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface PortalProps {
  customerId: string;
}

function CustomerPortalView({ customerId }: PortalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'pay' | 'update'>('bills');
  
  // Update Form fields
  const [portalName, setPortalName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [updateSubmitted, setUpdateSubmitted] = useState(false);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadPortalData() {
      try {
        const storeSettings = await StoreService.getSettings();
        setSettings(storeSettings);

        const customersList = await StoreService.getCustomers();
        const foundCustomer = customersList.find(c => c.id === customerId);
        if (foundCustomer) {
          setCustomer(foundCustomer);
          setPortalName(foundCustomer.name || '');
          setEmail(foundCustomer.email || '');
          setLocation(foundCustomer.location || '');
          setProofAmount(foundCustomer.totalDues.toString());
        }

        const salesList = await StoreService.getSales();
        setSales(salesList);
      } catch (err) {
        console.warn('Error loading portal details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPortalData();
  }, [customerId]);

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<Customer> = {
        ...customer,
        pendingUpdates: {
          name: portalName.trim(),
          email: email.trim(),
          location: location.trim(),
          timestamp: new Date().toISOString()
        }
      };
      await StoreService.upsertCustomer(payload);
      setUpdateSubmitted(true);
      
      // Refresh local customer state
      const updated = await StoreService.getCustomers().then(list => list.find(c => c.id === customerId));
      if (updated) setCustomer(updated);
    } catch (err) {
      alert('Failed to submit contact updates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressBase64Image(reader.result as string);
        setProofFile(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRecordProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !proofAmount) return;
    const amount = parseFloat(proofAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive settlement amount.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Partial<Customer> = {
        ...customer,
        pendingUpdates: {
          ...customer.pendingUpdates,
          timestamp: new Date().toISOString(),
          pendingPayment: {
            amount,
            method: 'UPI Online',
            note: proofNote || 'UPI proof of settlement submitted by customer',
            date: new Date().toISOString().split('T')[0],
            receiptImage: proofFile || undefined,
            timestamp: new Date().toISOString()
          }
        }
      };
      await StoreService.upsertCustomer(payload);
      setPaymentSubmitted(true);
      
      // Refresh local customer state
      const updated = await StoreService.getCustomers().then(list => list.find(c => c.id === customerId));
      if (updated) setCustomer(updated);
    } catch (err) {
      alert('Failed to register payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center text-[#1A1A18] antialiased">
        <div className="w-10 h-10 rounded-full border-4 border-t-black border-black/10 animate-spin mb-4"></div>
        <p className="text-[10px] font-mono uppercase font-bold tracking-widest">Loading Customer Portal...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-6 flex flex-col justify-center items-center text-center text-[#1A1A18] antialiased">
        <HelpCircle size={48} className="text-black/30 mb-3 animate-pulse" />
        <h2 className="text-lg font-serif font-extrabold uppercase tracking-wider">Invalid Portal URL</h2>
        <p className="text-black/60 text-xs mt-1.5 max-w-xs leading-relaxed font-semibold">
          This secure link seems to be incorrect or expired. Please contact the warehouse representative to request a valid dashboard link.
        </p>
      </div>
    );
  }

  // Find invoices belonging to this customer
  const myInvoices = sales.filter(s => s.customerId === customer.id || (customer.history && customer.history.includes(s.id)))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // UPI deep link construction
  const rawUpiId = settings?.upiId || '';
  const upiLink = rawUpiId 
    ? `upi://pay?pa=${rawUpiId}&pn=${encodeURIComponent(settings?.storeName || 'Noor Store')}&am=${customer.totalDues}&cu=INR&tn=${encodeURIComponent('Balance Settlement')}`
    : '';
  const qrCodeUrl = upiLink 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(upiLink)}`
    : '';

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1A1A18] font-sans pb-16 flex flex-col items-center selection:bg-[#2D5A27] selection:text-[#F8F7F4] antialiased">
      {/* Top Header Card */}
      <header className="w-full max-w-lg bg-[#FAF9F6] p-6 rounded-b-[2rem] shadow-sm text-left border-b border-[#1A1A18]/10 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EAE9E4] text-[#1A1A18] font-serif font-bold text-xl flex items-center justify-center border border-[#1A1A18]/15 relative shadow-sm shrink-0">
            {customer.name.charAt(0).toUpperCase()}
            {customer.isWholesaler && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-stone-200 shadow-sm">
                <Star size={11} className="text-amber-600 fill-amber-500" />
              </div>
            )}
          </div>
          <div>
            <span className="text-[8px] uppercase font-mono tracking-widest bg-[#2D5A27]/10 text-[#2D5A27] px-2.5 py-0.5 rounded-sm">Verified Customer</span>
            <h2 className="text-lg font-serif font-extrabold text-[#1A1A18] mt-1">{customer.name}</h2>
            <p className="text-[9px] text-[#1A1A18]/50 font-mono uppercase tracking-wider">{settings?.storeName || 'Noor Warehouse'}</p>
          </div>
        </div>

        {/* Highlight Outstanding Dues */}
        <div className="mt-6 bg-[#EAE9E4] p-5 rounded-sm border border-[#1A1A18]/5 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[8px] uppercase font-mono text-[#1A1A18]/60 block tracking-[0.15em]">Outstanding Balance</span>
            <span className="text-2xl font-sans font-bold text-[#1A1A18] mt-1 block">₹{customer.totalDues.toLocaleString()}</span>
          </div>
          <button 
            onClick={() => setActiveSubTab('pay')}
            className="px-4 py-2 bg-[#1A1A18] hover:bg-[#1A1A18]/90 text-[#F8F7F4] text-[10px] font-mono uppercase tracking-[0.12em] rounded-sm transition-all cursor-pointer border-0 shadow-sm"
          >
            Settle Balance
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="w-full max-w-lg px-4 mt-6 flex-1">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 bg-[#1A1A18]/5 p-1 rounded-sm border border-[#1A1A18]/10 mb-6 font-mono text-center">
          <button 
            onClick={() => setActiveSubTab('bills')}
            className={`py-2 text-[10px] uppercase transition-all cursor-pointer border-0 rounded-sm ${activeSubTab === 'bills' ? 'bg-[#FAF9F6] text-[#1A1A18] font-bold shadow-sm' : 'text-[#1A1A18]/50 hover:text-[#1A1A18]'}`}
          >
            Invoices ({myInvoices.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('pay')}
            className={`py-2 text-[10px] uppercase transition-all cursor-pointer border-0 rounded-sm ${activeSubTab === 'pay' ? 'bg-[#FAF9F6] text-[#1A1A18] font-bold shadow-sm' : 'text-[#1A1A18]/50 hover:text-[#1A1A18]'}`}
          >
            Pay UPI
          </button>
          <button 
            onClick={() => setActiveSubTab('update')}
            className={`py-2 text-[10px] uppercase transition-all cursor-pointer border-0 rounded-sm ${activeSubTab === 'update' ? 'bg-[#FAF9F6] text-[#1A1A18] font-bold shadow-sm' : 'text-[#1A1A18]/50 hover:text-[#1A1A18]'}`}
          >
            Update Info
          </button>
        </div>

        {/* Tab 1: Purchase & Invoices List */}
        {activeSubTab === 'bills' && (
          <div className="space-y-4 text-left">
            <h3 className="text-[9px] font-mono text-[#1A1A18]/50 uppercase tracking-widest px-1">Invoice Record Register</h3>
            {myInvoices.length === 0 ? (
              <div className="py-12 bg-[#FAF9F6] rounded-sm border border-[#1A1A18]/10 text-center text-[#1A1A18]/40 font-mono">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">No active invoice logs found.</p>
              </div>
            ) : (
              myInvoices.map(invoice => (
                <a 
                  key={invoice.id} 
                  href={`/?invoice=${invoice.id}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="block bg-[#FAF9F6] p-4 rounded-sm border border-[#1A1A18]/10 hover:border-[#1A1A18]/25 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-sm bg-[#1A1A18]/5 text-[#1A1A18] border border-[#1A1A18]/10 flex items-center justify-center shrink-0">
                         <Receipt size={16} />
                       </div>
                       <div>
                         <h4 className="text-xs font-mono text-[#1A1A18]">Invoice #{invoice.id.slice(0, 6).toUpperCase()}</h4>
                         <span className="text-[9px] text-[#1A1A18]/50 font-mono uppercase mt-0.5 block">{new Date(invoice.timestamp).toLocaleDateString()}</span>
                       </div>
                     </div>
                     <div className="text-right">
                       <span className="text-xs font-bold text-[#1A1A18]">₹{invoice.total.toLocaleString()}</span>
                       <span className="text-[8px] text-[#2D5A27] font-mono block uppercase font-bold mt-0.5">{invoice.paymentMethod || 'Paid'}</span>
                     </div>
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Scan & Pay UPI */}
        {activeSubTab === 'pay' && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            {customer.totalDues === 0 ? (
              <div className="p-6 bg-[#2D5A27]/10 rounded-sm border border-[#2D5A27]/15 text-center">
                <CheckCircle2 size={32} className="text-[#2D5A27] mx-auto mb-3" />
                <h4 className="text-sm font-serif font-bold text-[#1A1A18] uppercase">No Outstanding Balance</h4>
                <p className="text-[11px] text-[#2D5A27] mt-1 font-semibold">Your account is fully balanced!</p>
              </div>
            ) : (
              <>
                {/* QR Display Card */}
                {rawUpiId ? (
                  <div className="bg-[#FAF9F6] text-[#1A1A18] rounded-sm p-6 border border-[#1A1A18]/10 shadow-sm text-center flex flex-col items-center">
                    <span className="text-[8px] uppercase font-mono text-[#1A1A18]/50 tracking-[0.15em] block mb-4">Secure Payment Desk</span>
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 border border-[#1A1A18]/10 p-2 rounded-sm bg-white" />
                    <div className="mt-4">
                      <h4 className="font-serif font-bold text-base text-[#1A1A18]">Scan to Pay via UPI App</h4>
                      <p className="text-[10px] text-[#1A1A18]/60 mt-2 max-w-[250px] leading-relaxed">
                        Scan this QR with BHIM, GPay, PhonePe, Paytm, or any banking app to settle outstanding balance.
                      </p>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[#1A1A18]/10 w-full flex items-center justify-center gap-2">
                      <Smartphone size={15} className="text-[#2D5A27] shrink-0" />
                      <span className="text-[10px] font-mono font-bold text-[#1A1A18] select-all">UPI ID: {rawUpiId}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-50 rounded-sm border border-amber-200/50 text-center">
                    <HelpCircle size={28} className="text-amber-700 mx-auto mb-2 animate-pulse" />
                    <h4 className="text-xs font-mono text-[#1A1A18] uppercase font-bold">UPI Merchant Not Linked</h4>
                    <p className="text-[10px] text-amber-700/80 mt-1 max-w-xs mx-auto leading-relaxed font-semibold">
                      This warehouse has not configured their merchant UPI ID in settings yet. Please upload a receipt manually below or contact the store manager.
                    </p>
                  </div>
                )}

                {/* Upload proof of payment */}
                <form onSubmit={handleRecordProof} className="bg-[#FAF9F6] p-5 rounded-sm border border-[#1A1A18]/10 space-y-4">
                  <h4 className="text-xs font-mono text-[#1A1A18] uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1A18]/5 pb-2">
                    <Upload size={14} className="text-[#2D5A27]" /> Upload Transaction Slip
                  </h4>
                  <p className="text-[10px] text-[#1A1A18]/60 font-semibold leading-relaxed">
                    Have you paid offline or transferred online? Upload the screenshot or receipt details to get it verified.
                  </p>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[#1A1A18]/50 block mb-1">Settlement Amount (₹)</label>
                      <input 
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="0.00"
                        value={proofAmount}
                        onChange={e => {
                          const val = e.target.value;
                          if (val.includes('-')) return;
                          setProofAmount(val);
                        }}
                        className="w-full px-3 py-2 bg-transparent border border-[#1A1A18]/10 focus:border-[#1A1A18] rounded-none outline-none text-xs text-[#1A1A18]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[#1A1A18]/50 block mb-1">Verification Note / UTR No.</label>
                      <input 
                        type="text"
                        placeholder="UTR or transaction reference number"
                        value={proofNote}
                        onChange={e => setProofNote(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent border border-[#1A1A18]/10 focus:border-[#1A1A18] rounded-none outline-none text-xs text-[#1A1A18]"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-mono tracking-wider text-[#1A1A18]/50 block mb-1">Receipt Screenshot</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden" 
                        id="portal-receipt-upload"
                      />
                      <label 
                        htmlFor="portal-receipt-upload"
                        className="w-full h-16 bg-[#F8F7F4] border border-dashed border-[#1A1A18]/15 hover:border-[#1A1A18]/30 rounded-none flex items-center justify-center cursor-pointer transition-all gap-2"
                      >
                        {proofFile ? (
                          <div className="flex items-center gap-2 text-[#2D5A27] font-mono font-bold text-xs">
                            <CheckCircle2 size={15} /> Screenshot Attached
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#1A1A18]/40 font-mono text-xs">
                            <Camera size={15} /> Snap Payment Proof
                          </div>
                        )}
                      </label>
                    </div>

                    {paymentSubmitted ? (
                      <div className="p-3 bg-[#2D5A27]/10 text-[#2D5A27] text-xs font-semibold rounded-none border border-[#2D5A27]/15 flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0" />
                        <span>Receipt uploaded successfully! Awaiting verification.</span>
                      </div>
                    ) : (
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#1A1A18] hover:bg-[#1A1A18]/90 text-[#F8F7F4] py-3.5 rounded-none font-mono uppercase text-xs tracking-widest mt-2 border-0 cursor-pointer flex items-center justify-center"
                      >
                        {isSubmitting ? 'Registering...' : 'Submit Settlement Proof'}
                      </Button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Update Personal Info */}
        {activeSubTab === 'update' && (
          <form onSubmit={handleUpdateContact} className="bg-[#FAF9F6] p-5 rounded-sm border border-[#1A1A18]/10 space-y-4 text-left animate-in fade-in duration-200">
            <h3 className="text-xs font-mono text-[#1A1A18] uppercase tracking-wider border-b border-[#1A1A18]/5 pb-2">Update Contact Registration</h3>
            <p className="text-[10px] text-[#1A1A18]/60 font-semibold leading-relaxed">
              Correct or modify your registered name, active delivery records, or email. Any update will be submitted directly to the billing register for review.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[9px] uppercase font-mono tracking-wider text-[#1A1A18]/50 block mb-1">Customer Name</label>
                <div className="relative border-b border-[#1A1A18]/10 focus-within:border-[#1A1A18] transition-colors py-1">
                  <input 
                    type="text"
                    placeholder="e.g. John Doe"
                    value={portalName}
                    onChange={e => { setPortalName(e.target.value); setUpdateSubmitted(false); }}
                    className="w-full bg-transparent border-0 outline-none text-xs text-[#1A1A18]"
                    required
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#1A1A18]/30">
                    <UserIcon size={15} />
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase font-mono tracking-wider text-[#1A1A18]/50 block mb-1">Email Address</label>
                <div className="relative border-b border-[#1A1A18]/10 focus-within:border-[#1A1A18] transition-colors py-1">
                  <input 
                    type="email"
                    placeholder="e.g. support@domain.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setUpdateSubmitted(false); }}
                    className="w-full bg-transparent border-0 outline-none text-xs text-[#1A1A18]"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#1A1A18]/30">
                    <Mail size={15} />
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase font-mono tracking-wider text-[#1A1A18]/50 block mb-1">Registered Address (Shipping)</label>
                <div className="relative border-b border-[#1A1A18]/10 focus-within:border-[#1A1A18] transition-colors py-1">
                  <input 
                    type="text"
                    placeholder="Area, State, Pincode"
                    value={location}
                    onChange={e => { setLocation(e.target.value); setUpdateSubmitted(false); }}
                    className="w-full bg-transparent border-0 outline-none text-xs text-[#1A1A18]"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#1A1A18]/30">
                    <MapPin size={15} />
                  </span>
                </div>
              </div>

              {updateSubmitted ? (
                <div className="p-3.5 bg-[#2D5A27]/10 text-[#2D5A27] text-xs font-semibold rounded-none border border-[#2D5A27]/15 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>Update request filed! Store administrators will verify this shortly.</span>
                </div>
              ) : (
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1A1A18] hover:bg-[#1A1A18]/90 text-[#F8F7F4] py-3.5 rounded-none font-mono uppercase text-xs tracking-widest mt-2 border-0 cursor-pointer flex items-center justify-center"
                >
                  {isSubmitting ? 'Filing Update...' : 'Submit Profile Updates'}
                </Button>
              )}
            </div>
          </form>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-12 text-center text-[9px] text-[#1A1A18]/40 font-mono tracking-wider">
        Noor Secure Portal Service &bull; Encrypted Session
      </footer>
    </div>
  );
}

// ==========================================
// DIGITAL RECEIPT / INVOICE VIEW COMPONENT
// ==========================================
interface InvoiceProps {
  saleId: string;
}

function DigitalInvoiceView({ saleId }: InvoiceProps) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      try {
        const storeSettings = await StoreService.getSettings();
        setSettings(storeSettings);

        const salesList = await StoreService.getSales();
        const foundSale = salesList.find(s => s.id === saleId);
        if (foundSale) {
          setSale(foundSale);
        }
      } catch (err) {
        console.warn('Error loading invoice details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [saleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 rounded-full border-4 border-t-blue-500 border-slate-200 animate-spin mb-4"></div>
        <p className="text-xs uppercase font-bold tracking-widest font-mono">Loading digital invoice...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center text-center">
        <HelpCircle size={48} className="text-slate-400 mb-3" />
        <h2 className="text-lg font-black text-slate-900 uppercase">Invoice Not Found</h2>
        <p className="text-slate-500 text-xs mt-1.5 max-w-xs leading-relaxed font-semibold">
          This digital invoice link could not be located. It may have been purged or moved to the Recycle Bin.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] py-12 px-4 font-sans text-[#1A1A18] selection:bg-[#2D5A27] selection:text-[#F8F7F4] antialiased">
      <div className="w-full max-w-md mx-auto bg-[#FAF9F6] rounded-sm p-6 md:p-8 shadow-sm border border-[#1A1A18]/10 text-left relative">
        
        {/* Receipt Header */}
        <div className="text-center pb-6 border-b-2 border-dashed border-[#1A1A18]/10">
          {settings?.logo && settings.showLogoOnReceipt && (
            <img 
              src={settings.logo} 
              alt="Logo" 
              className="w-16 h-16 rounded-md object-cover mx-auto mb-3 border border-[#1A1A18]/10 grayscale opacity-90"
            />
          )}
          <h2 className="text-lg font-serif font-extrabold text-[#1A1A18] leading-tight uppercase tracking-tight">{settings?.storeName || 'Noor Warehouse'}</h2>
          {settings?.storeAddress && <p className="text-[9px] text-[#1A1A18]/60 font-mono mt-1.5">{settings.storeAddress}</p>}
          {settings?.storePhone && <p className="text-[9px] text-[#1A1A18]/60 font-mono mt-0.5">Phone: {settings.storePhone}</p>}
          
          <div className="mt-4 inline-flex items-center gap-1.5 bg-[#2D5A27]/10 text-[#2D5A27] text-[9px] font-mono uppercase tracking-wider px-3 py-1 rounded-sm border border-[#2D5A27]/15">
            <CheckCircle2 size={11} /> Electronic Invoice
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="py-4 border-b border-[#1A1A18]/10 grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-mono text-[#1A1A18]/60">
          <div>
            <span className="text-[8px] uppercase tracking-wider text-[#1A1A18]/40 block">Invoice ID</span>
            <span className="text-[#1A1A18] font-bold uppercase">{sale.id.slice(0, 10)}</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] uppercase tracking-wider text-[#1A1A18]/40 block">Timestamp</span>
            <span className="text-[#1A1A18] font-bold">{new Date(sale.timestamp).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-wider text-[#1A1A18]/40 block">Customer Name</span>
            <span className="text-[#1A1A18] font-bold flex items-center gap-1">
              {sale.customerName}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] uppercase tracking-wider text-[#1A1A18]/40 block">Served By</span>
            <span className="text-[#1A1A18] font-bold">{sale.servedBy || 'Staff'}</span>
          </div>
        </div>

        {/* Item Rows */}
        <div className="py-5 space-y-4">
          <h4 className="text-[9px] font-mono text-[#1A1A18]/40 uppercase tracking-widest block">Purchased Products</h4>
          <div className="space-y-3.5">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="max-w-[70%]">
                  <h5 className="text-xs font-serif font-extrabold text-[#1A1A18] truncate">{item.name}</h5>
                  <p className="text-[10px] text-[#1A1A18]/50 mt-0.5 font-mono">
                    {item.quantity} {item.unit || 'pcs'} × ₹{(item.customPrice || item.sellPrice).toLocaleString()}
                    {item.discount && item.discount > 0 ? (
                      <span className="text-red-700 bg-red-50 border border-red-100/50 rounded-sm px-1.5 py-0.5 text-[8px] font-bold ml-1.5 uppercase">
                        -₹{item.discount} Disc
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-[#1A1A18]">
                    ₹{(((item.customPrice || item.sellPrice) - (item.discount || 0)) * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subtotal, Tax, and Total Summary */}
        <div className="py-4 border-t-2 border-dashed border-[#1A1A18]/15 space-y-2 text-[#1A1A18]/70 text-xs font-mono">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="text-[#1A1A18] font-bold">₹{sale.subtotal.toLocaleString()}</span>
          </div>
          {sale.tax > 0 && (
            <div className="flex justify-between">
              <span>Tax (GST):</span>
              <span className="text-[#1A1A18] font-bold">₹{sale.tax.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 text-sm text-[#1A1A18] border-t border-[#1A1A18]/10 mt-2 font-bold font-serif">
            <span>Total Invoice Amount:</span>
            <span className="font-mono text-base font-extrabold">₹{sale.total.toLocaleString()}</span>
          </div>
          {sale.amountPaid !== undefined && (
            <div className="flex justify-between text-[10px] pt-1">
              <span>Amount Paid:</span>
              <span className="text-[#2D5A27] font-bold">₹{sale.amountPaid.toLocaleString()}</span>
            </div>
          )}
          {sale.amountPaid !== undefined && sale.total - sale.amountPaid > 0 && (
            <div className="flex justify-between text-[10px] text-red-700 bg-red-50 p-2.5 rounded-sm border border-red-200/50 mt-2">
              <span>Outstanding Balance Due:</span>
              <span className="font-bold">₹{(sale.total - sale.amountPaid).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Receipt Footer Message */}
        <div className="pt-6 border-t border-[#1A1A18]/10 text-center space-y-3">
          {settings?.receiptHeader && <p className="text-[9px] text-[#1A1A18]/40 font-mono uppercase tracking-wider">{settings.receiptHeader}</p>}
          {settings?.receiptFooter && <p className="text-[11px] text-[#2D5A27] font-serif italic">"{settings.receiptFooter}"</p>}
          
          <button 
            onClick={() => window.print()}
            className="w-full py-3.5 bg-[#1A1A18] hover:bg-[#1A1A18]/90 text-[#F8F7F4] rounded-none text-[10px] font-mono uppercase tracking-[0.15em] flex items-center justify-center gap-1.5 transition-all mt-4 print:hidden cursor-pointer border-0 shadow-sm"
          >
            <Printer size={13} /> Print Receipt copy
          </button>
        </div>
      </div>
    </div>
  );
}
