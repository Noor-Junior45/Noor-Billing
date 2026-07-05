import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { StoreService } from '../services/storeService';
import {
  Loader2,
  AlertTriangle,
  User as UserIcon,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Store,
  MapPin,
  Phone,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onOpenPrivacy, onOpenTerms }) => {
  // Navigation & Form Views
  const [selectedRole, setSelectedRole] = useState<'admin' | 'staff' | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Auth Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Staff Login Fields
  const [staffId, setStaffId] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  
  // Password Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  // Onboarding Wizard Fields
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('general');
  const [shopLocation, setShopLocation] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const testSupabase = async () => {
      try {
        const { error } = await supabase.from('settings').select('*').limit(1);
        if (error) {
          const errMsg = error.message || '';
          if (errMsg.toLowerCase().includes('suspended') || errMsg.toLowerCase().includes('permission')) {
            setError('Cloud service is temporarily suspended. Please use the "Run Sandbox Demo Mode" button below to access your local offline database.');
          }
        }
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        if (errMsg.toLowerCase().includes('suspended') || errMsg.toLowerCase().includes('permission')) {
          setError('Cloud service is temporarily suspended. Please use the "Run Sandbox Demo Mode" button below to access your local offline database.');
        }
      }
    };
    testSupabase();
  }, []);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !staffPin) {
      setError('Please enter both your Staff ID and PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await StoreService.loginStaff(adminEmail.trim(), staffId.trim(), staffPin.trim());
      if (result) {
        // Validation: A staff member with staffRole === 'pos' lands on POS.
        // A staff member with staffRole === 'inventory' has no access to this app.
        if (result.staff.role === 'inventory') {
          setError('You are registered as "inventory" role. You are not authorized for this app (billing companion). Please use the main warehouse app instead.');
          setLoading(false);
          return;
        }

        localStorage.setItem('noor_user_uid', result.adminUid);
        const staffUser: User = {
          id: result.staff.id,
          name: result.staff.name,
          username: result.staff.id,
          pin: result.staff.pin,
          role: 'staff',
          staffRole: result.staff.role
        };
        localStorage.setItem('noor_staff_user', JSON.stringify(staffUser));
        onLogin(staffUser);
      } else {
        setError('Verification failed. Invalid Staff ID/PIN combination or Admin email mismatch.');
      }
    } catch (err: any) {
      setError('Staff login failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Check if settings already exist in Supabase for this uid
  const checkIfNewUser = async (uid: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('user_id', uid);
      if (error) throw error;
      return !data || data.length === 0;
    } catch (err) {
      console.error('Error checking new user settings:', err);
      return false; // Safe default
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (isSignUp && !name) {
      setError('Please enter your name to register.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim()
            }
          }
        });
        if (error) throw error;
        
        const supabaseUser = data.user;
        if (!supabaseUser) throw new Error('Failed to retrieve user after sign up.');
        
        const user: User = {
          id: supabaseUser.id,
          username: (supabaseUser.email || '').split('@')[0],
          name: name.trim(),
          email: supabaseUser.email || undefined,
          role: 'admin',
          pin: ''
        };
        // Prefill onboarding fields
        setShopName(`${name.trim()}'s Warehouse`);
        setShopEmail(email.trim());
        setOnboardingUser(user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;

        const supabaseUser = data?.user;
        if (!supabaseUser) throw new Error('No user returned from login.');

        const user: User = {
          id: supabaseUser.id,
          username: (supabaseUser.email || '').split('@')[0],
          name: supabaseUser.user_metadata?.name || (supabaseUser.email || '').split('@')[0],
          email: supabaseUser.email || undefined,
          role: 'admin',
          pin: '',
          photoURL: supabaseUser.user_metadata?.avatar_url || undefined
        };
        const isNew = await checkIfNewUser(supabaseUser.id);
        if (isNew) {
          setShopName(user.name ? `${user.name}'s Warehouse` : 'My Warehouse');
          setShopEmail(email.trim());
          setOnboardingUser(user);
        } else {
          onLogin(user);
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed. Please check your credentials.';
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('suspended') || errMsg.toLowerCase().includes('permission')) {
        msg = 'Cloud service is temporarily suspended. Please use the "Run Sandbox Demo Mode" button below to access your local offline database.';
      } else if (err.status === 400 || errMsg.includes('Invalid login credentials')) {
        msg = 'Invalid login credentials. If you do not have an account yet, please click "Don\'t have an account? Sign Up" below to register, or click "Run Sandbox Demo Mode" to run offline.';
      } else if (errMsg.includes('User already registered')) {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (errMsg.includes('Password should be at least')) {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (errMsg.includes('valid email')) {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (skip: boolean = false) => {
    if (!onboardingUser) return;
    setLoading(true);
    setError('');
    
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const uid = session?.user?.id || onboardingUser.id;
      const settingsId = Math.random().toString(36).substring(2, 9);
      
      const customSettings = {
        storeName: skip ? (onboardingUser.name ? `${onboardingUser.name}'s Warehouse` : 'My Warehouse') : (shopName || 'My Warehouse'),
        storeAddress: skip ? '' : shopLocation,
        storePhone: skip ? '' : shopPhone,
        storeEmail: skip ? (onboardingUser.id.includes('@') ? onboardingUser.id : '') : shopEmail,
        logo: onboardingUser.photoURL || '',
        expiryAlertDays: 7,
        lowStockDefault: 10,
        soundEnabled: true,
        notificationsEnabled: false,
        currencySymbol: '₹',
        recycleBinRetentionDays: 30,
        directPrintEnabled: false,
        scannerPreference: 'both',
        nasUrl: '',
        syncToNas: false,
        warehouseType: skip ? 'general' : shopCategory,
        salesTarget: 50000,
        receiptHeader: 'Thank you for your business!',
        receiptFooter: 'Please visit us again!',
        showLogoOnReceipt: true,
        taxRateDefault: 18
      };

      // Always write to local storage first so that custom settings are immediately saved offline
      try {
        const LS_BACKUP_KEY = 'noor_offline_store_v1';
        const local = localStorage.getItem(LS_BACKUP_KEY);
        const currentData = local ? JSON.parse(local) : {
          products: [],
          tags: [],
          sales: [],
          customers: [],
          users: [],
          deletedItems: [],
          settings: {}
        };
        currentData.settings = {
          ...currentData.settings,
          ...customSettings
        };
        localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(currentData));
        localStorage.setItem('noor_last_sync', new Date().toISOString());
        localStorage.setItem('noor_user_uid', uid);
      } catch (localErr) {
        console.warn("Failed to write onboarding settings to local storage fallback:", localErr);
      }

      // Try writing to Supabase settings table but do not block the user if it fails
      try {
        const { error } = await supabase.from('settings').upsert({
          id: settingsId,
          user_id: uid,
          store_name: customSettings.storeName,
          store_address: customSettings.storeAddress,
          store_phone: customSettings.storePhone,
          store_email: customSettings.storeEmail,
          logo: customSettings.logo,
          warehouse_type: customSettings.warehouseType,
          expiry_alert_days: customSettings.expiryAlertDays,
          low_stock_default: customSettings.lowStockDefault,
          sound_enabled: customSettings.soundEnabled,
          notifications_enabled: customSettings.notificationsEnabled,
          currency_symbol: customSettings.currencySymbol,
          recycle_bin_retention_days: customSettings.recycleBinRetentionDays,
          direct_print_enabled: customSettings.directPrintEnabled,
          scanner_preference: customSettings.scannerPreference,
          nas_url: customSettings.nasUrl,
          sync_to_nas: customSettings.syncToNas,
          sales_target: customSettings.salesTarget,
          receipt_header: customSettings.receiptHeader,
          receipt_footer: customSettings.receiptFooter,
          show_logo_on_receipt: customSettings.showLogoOnReceipt,
          tax_rate_default: customSettings.taxRateDefault,
        });
        if (error) {
          console.warn("Supabase settings upsert failed (will continue using offline local storage):", error.message);
        }
      } catch (cloudErr: any) {
        console.warn("Could not reach cloud database during onboarding (will continue using offline local storage):", cloudErr.message || cloudErr);
      }
      
      // Continue to application
      onLogin(onboardingUser);
    } catch (err: any) {
      console.error("Critical onboarding error, continuing with local fallback:", err);
      onLogin(onboardingUser);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser: User = {
      id: 'guest_user',
      username: 'guest',
      name: 'Guest Administrator',
      role: 'admin',
      pin: ''
    };
    onLogin(guestUser);
  };

  // --- RENDERING ONBOARDING WIZARD ---
  if (onboardingUser) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-[#FAF7F2] p-6 font-sans text-[#1A1A18] antialiased">
        <div className="w-full max-w-[500px] mx-auto animate-in fade-in duration-300">
          <div className="text-center mb-8">
            <span className="inline-flex p-4 bg-white rounded-2xl text-black mb-3 border border-[#1A1A18]/10 shadow-sm">
              <Store size={32} />
            </span>
            <h1 className="text-3xl font-serif font-semibold text-black tracking-tight">Configure Your Warehouse</h1>
            <p className="text-black/60 mt-2 text-sm font-medium">Configure store settings to suit your inventory</p>
          </div>

          <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-[#1A1A18]/10">
            <div className="space-y-6">
              
              {/* Warehouse Name */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Warehouse / Shop Name</label>
                <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                    <Store size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="E.g. Noor Enterprise"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-8"
                  />
                </div>
              </div>

              {/* Warehouse Type / Category */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Warehouse Category</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { id: 'general', label: 'General / Hardware' },
                    { id: 'pharma', label: 'Pharmaceuticals' },
                    { id: 'grocery', label: 'Grocery / Foods' },
                    { id: 'electronics', label: 'Electronics & Tech' },
                    { id: 'clothing', label: 'Clothing & Apparel' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setShopCategory(cat.id)}
                      className={`py-2.5 px-3 rounded-md text-left border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        shopCategory === cat.id 
                          ? 'border-[#2D5A27] bg-[#2D5A27]/10 text-[#2D5A27]' 
                          : 'border-black/15 bg-transparent text-black/60 hover:text-black hover:border-black'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {shopCategory === cat.id && <Check size={14} className="text-[#2D5A27]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Location / Address</label>
                <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                    <MapPin size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={shopLocation}
                    onChange={e => setShopLocation(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-8"
                  />
                </div>
              </div>

              {/* Basic details: Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Phone Number</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <Phone size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="+91 XXXXX XXXXX"
                      value={shopPhone}
                      onChange={e => setShopPhone(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Store Contact Email</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      placeholder="store@email.com"
                      value={shopEmail}
                      onChange={e => setShopEmail(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold border border-red-100 rounded-lg flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => handleCompleteOnboarding(true)}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-white hover:bg-[#FAF7F2] text-black font-mono uppercase text-xs tracking-widest transition-all border border-black/15 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Skip Setup</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteOnboarding(false)}
                  disabled={loading}
                  className="flex-1 bg-black hover:bg-black/90 text-white font-mono uppercase text-xs tracking-widest py-3.5 rounded-none transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <Check size={16} />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING GENERAL AUTHENTICATION ---
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF7F2] text-[#1A1A18] font-sans antialiased selection:bg-[#2D5A27] selection:text-[#F8F7F4]">
      {/* Left Panel: Editorial Brand Hero */}
      <section className="w-full md:w-1/2 bg-[#FAF7F2] p-8 md:p-12 lg:p-16 flex flex-col justify-between relative min-h-[40vh] md:min-h-screen overflow-hidden select-none">
        {/* Background Radial Dots */}
        <div className="absolute inset-0 bg-[radial-gradient(#1a1a18_1px,transparent_0)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10">
          <img 
            src="https://lh3.googleusercontent.com/p/AF1QipPlp0QUwcp2FOnTGiGNf5fqWnskinCj4QxRKa3o=s1360-w1360-h1020-rw" 
            alt="Logo" 
            className="w-14 h-14 rounded-lg object-cover border border-[#1A1A18]/10 shadow-sm mb-6 shrink-0"
          />
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.85] tracking-[-0.04em] text-[#1A1A18]">
            Noor<br />Billing
          </h1>
          <p className="font-sans text-sm md:text-base leading-relaxed text-[#1A1A18]/60 mt-6 max-w-sm">
            Cloud-based Enterprise Warehouse System. Optimized for high-throughput logistics management and global supply chain visibility.
          </p>
        </div>

        <div className="relative z-10 mt-12 md:mt-0 flex items-center gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#1A1A18]/60">
            EST. 2024 &copy; CLOUD ENTERPRISE
          </p>
        </div>
      </section>

      {/* Right Panel: Clean Authentication Box */}
      <section className="w-full md:w-1/2 bg-white p-4 md:p-8 lg:p-12 flex flex-col justify-center border-t md:border-t-0 md:border-l border-[#1A1A18]/10 min-h-[60vh] md:min-h-screen">
        <div className="w-full max-w-[420px] mx-auto flex flex-col justify-center p-8 md:p-10 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Portal Navigation */}
          <div className="grid grid-cols-2 bg-[#1A1A18]/5 gap-1 p-1 mb-10 rounded-md">
            <button
              type="button"
              onClick={() => { setSelectedRole('admin'); setError(''); }}
              className={`py-2.5 text-[10px] font-mono uppercase tracking-[0.15em] transition-all cursor-pointer border-0 rounded-sm ${
                selectedRole === 'admin' || selectedRole === null
                  ? 'bg-white text-black font-extrabold shadow-sm border border-[#1A1A18]/10'
                  : 'bg-transparent text-black/50 hover:text-black'
              }`}
            >
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('staff'); setError(''); }}
              className={`py-2.5 text-[10px] font-mono uppercase tracking-[0.15em] transition-all cursor-pointer border-0 rounded-sm ${
                selectedRole === 'staff'
                  ? 'bg-white text-black font-extrabold shadow-sm border border-[#1A1A18]/10'
                  : 'bg-transparent text-black/50 hover:text-black'
              }`}
            >
              Staff Portal
            </button>
          </div>

          <div className="form-section">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] mb-10 text-black text-center font-black">
              {selectedRole === 'staff' ? 'Staff Sign In' : isSignUp ? 'Create Admin Account' : 'Admin Sign In'}
            </h2>

            {selectedRole === 'staff' ? (
              /* --- STAFF LOGIN VIEW --- */
              <form onSubmit={handleStaffLogin} className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Admin's Email / User ID</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. admin@example.com"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Staff Unique ID No.</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <UserIcon size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. 1001"
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Enter PIN</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1 flex items-center">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <Lock size={15} />
                    </span>
                    <input
                      type={showPin ? "text" : "password"}
                      placeholder="••••"
                      maxLength={6}
                      value={staffPin}
                      onChange={e => setStaffPin(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans text-center tracking-[0.25em] font-black px-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black focus:outline-none p-1 cursor-pointer transition-colors bg-transparent border-0 flex items-center justify-center"
                      title={showPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold border border-red-200/50 rounded-none flex items-start gap-2.5 leading-relaxed my-4">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-black/90 font-mono text-xs uppercase tracking-[0.2em] py-4 border-0 cursor-pointer flex items-center justify-center gap-2 mt-6 active:scale-[0.99] transition-all"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <>
                      <span>Staff Sign In</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* --- ADMIN EMAIL & PASSWORD LOGIN FORM --- */
              <form onSubmit={handleAuth} className="space-y-6">
                {isSignUp && (
                  <div className="space-y-2 text-left">
                    <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Full Name</label>
                    <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                        <UserIcon size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Email Address</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-black font-black">Password</label>
                  <div className="relative border-b border-black/15 focus-within:border-black transition-colors py-1 flex items-center">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black/30">
                      <Lock size={15} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-base text-black placeholder-black/30 font-sans pl-7 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black focus:outline-none p-1 cursor-pointer transition-colors bg-transparent border-0 flex items-center justify-center"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold border border-red-200/50 rounded-none flex items-start gap-2.5 leading-relaxed my-4">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-black/90 font-mono text-xs uppercase tracking-[0.2em] py-4 border-0 cursor-pointer flex items-center justify-center gap-2 mt-6 active:scale-[0.99] transition-all"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <>
                      <span>{isSignUp ? 'Register Account' : 'Sign In'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="bg-transparent border-0 text-black/60 hover:text-black font-mono text-[10px] uppercase tracking-[0.1em] py-1 cursor-pointer hover:underline text-center"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="relative my-8 flex justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10"></div>
              </div>
              <span className="relative px-3 bg-white font-mono text-[9px] uppercase tracking-[0.15em] text-black/30">Terminal Access</span>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full border border-black/15 bg-transparent py-3.5 px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-black/70 hover:text-black hover:border-black/30 transition-all cursor-pointer"
            >
              Run Sandbox Demo Mode
            </button>
          </div>

          <footer className="mt-12 lg:mt-auto pt-8 flex justify-between items-center font-mono text-[9px] text-[#1A1A18]/40 border-t border-[#1A1A18]/5 w-full">
            <div className="version-tag">NOOR_WMS_V1.7</div>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={onOpenPrivacy} 
                className="bg-transparent border-0 p-0 text-[#1A1A18]/40 hover:text-[#1A1A18] transition-colors cursor-pointer font-mono text-[9px]"
              >
                Privacy Policy
              </button>
              <button 
                type="button" 
                onClick={onOpenTerms} 
                className="bg-transparent border-0 p-0 text-[#1A1A18]/40 hover:text-[#1A1A18] transition-colors cursor-pointer font-mono text-[9px]"
              >
                Terms
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
};
