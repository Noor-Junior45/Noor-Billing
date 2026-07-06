import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, CartItem, Customer, Sale, Tag, StoreSettings, Tab } from '../types';
import { StoreService } from '../services/storeService';
import { generateInvoicePDF } from '../services/pdfService';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { History } from './History';
import { Search, ShoppingCart, Trash2, User, CreditCard, Printer, Scan, Plus, X, Clock, ChevronDown, CircleCheck, Package, MoreVertical, FileText, RotateCcw, ArrowLeft, Save, CircleAlert, MapPin, Mail, Phone, ChevronRight, Calculator, Factory, Layers, Scale, AlertTriangle, Box, Tag as TagIcon, Percent, CheckSquare, Square, LayoutGrid, List as ListIcon, Receipt, Banknote, Smartphone, Share2, Pencil, Edit3, CheckCircle, UserPlus, Info, Star } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { playBeep } from '../utils/audio';

// Extended interface for local POS state to handle discounts and custom pricing
interface POSCartItem extends CartItem {
  discount: number; // Cash discount per row
}

const UNITS = [
  'pcs', 'kg', 'g', 'l', 'ml', 'pack', 'box', 'dozen', 'm', 'cm', 
  'mg', 'tablet', 'strip', 'capsule', 'syrup', 'vial', 'ampoule', 'kit'
];

type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Pay Later';

// Simple WhatsApp Logo Component
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="mr-2">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface POSProps {
  currentUser?: any;
  initialViewMode?: 'POS' | 'HISTORY';
  settings?: StoreSettings | null;
}

export const POS: React.FC<POSProps> = ({ currentUser, initialViewMode = 'POS', settings: settingsProp }) => {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
      storeName: '',
      storeAddress: '',
      storePhone: '',
      notificationsEnabled: true,
      expiryAlertDays: 7, 
      lowStockDefault: 10, 
      soundEnabled: true, 
      currencySymbol: '₹',
      recycleBinRetentionDays: 30,
      directPrintEnabled: false,
      scannerPreference: 'both',
      taxRateDefault: 18
  });
  
  // Cart & Transaction State
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [partialPaidAmount, setPartialPaidAmount] = useState<string>(''); 
  
  // Quick Customer
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  // UI State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);

  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  const [inlineSearch, setInlineSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewMode, setViewMode] = useState<'POS' | 'HISTORY'>(initialViewMode);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  useEffect(() => {
    if (settingsProp) {
      setSettings(settingsProp);
    }
  }, [settingsProp]);
  const [showProductLookup, setShowProductLookup] = useState(false);

  // Product Creation State
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [showScanError, setShowScanError] = useState(false);
  const [lastScannedSku, setLastScannedSku] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', sku: '', stock: 0, unit: 'pcs', capacity: '', 
    buyPrice: 0, sellPrice: 0, wholesalePrice: 0, 
    lowStockThreshold: 10, location: '', taxRate: settings?.taxRateDefault ?? 0,
    expiryDate: '', manufacturingDate: ''
  });
  const [batchConfig, setBatchConfig] = useState({ packs: '', perPack: '' });

  // Refs
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const custNameRef = useRef<HTMLInputElement>(null);
  const custPhoneRef = useRef<HTMLInputElement>(null);
  const inlineSearchRef = useRef<HTMLInputElement>(null);
  const prodNameRef = useRef<HTMLInputElement>(null);
  const prodSkuRef = useRef<HTMLInputElement>(null);
  const prodSellRef = useRef<HTMLInputElement>(null);
  const prodBuyRef = useRef<HTMLInputElement>(null);
  const prodStockRef = useRef<HTMLInputElement>(null);
  const quickNameRef = useRef<HTMLInputElement>(null);

  // --- Browser/Gesture Back Navigation Handling ---
  useEffect(() => {
      const handleNavigationPop = (e: any) => {
          // Priority closing of POS sub-views
          if (showScanner) {
              setShowScanner(false);
              return;
          }
          if (showProductLookup) {
              setShowProductLookup(false);
              setIsCreatingProduct(false);
              return;
          }
          if (showCheckout) {
              setShowCheckout(false);
              return;
          }
          if (isNewCustomerMode) {
              setIsNewCustomerMode(false);
              return;
          }
          if (viewMode === 'HISTORY') {
              setViewMode('POS');
              return;
          }
      };

      window.addEventListener('app-navigation-pop' as any, handleNavigationPop);
      return () => window.removeEventListener('app-navigation-pop' as any, handleNavigationPop);
  }, [showScanner, showProductLookup, showCheckout, isNewCustomerMode, viewMode]);

  useEffect(() => {
    loadData();
    const draft = StoreService.getPOSDraft();
    if (draft) {
        if (draft.cart) setCart(draft.cart);
        if (draft.selectedCustomer) setSelectedCustomer(draft.selectedCustomer);
        if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
        if (draft.partialPaidAmount !== undefined) setPartialPaidAmount(draft.partialPaidAmount);
    }

    const handleStoreUpdate = (e: any) => {
      console.log("POS page: Store data updated in background, reloading...", e.detail);
      loadData();
    };

    window.addEventListener('store-data-updated', handleStoreUpdate);
    return () => {
      window.removeEventListener('store-data-updated', handleStoreUpdate);
    };
  }, []);

  useEffect(() => {
      StoreService.savePOSDraft({
          cart,
          selectedCustomer,
          paymentMethod,
          partialPaidAmount
      });
  }, [cart, selectedCustomer, paymentMethod, partialPaidAmount]);

  const openHistory = () => {
    window.history.pushState({ tab: Tab.POS, depth: 1 }, '');
    setViewMode('HISTORY');
    loadData(); 
  };

  const closeHistory = () => {
    setViewMode('POS');
    window.dispatchEvent(new CustomEvent('change-tab', { detail: Tab.POS }));
  };

  const loadData = async () => {
    const [p, c, s, t, st] = await Promise.all([
        StoreService.getInventory(),
        StoreService.getCustomers(),
        StoreService.getSales(),
        StoreService.getTags(),
        StoreService.getSettings()
    ]);
    setProducts(p);
    setCustomers(c);
    setRecentSales(s.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setTags(t);
    setSettings(st);
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLElement> | null, action?: () => void) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (nextRef && nextRef.current) (nextRef.current as any).focus();
          else if (action) action();
      }
  };

  const filteredCustomers = useMemo(() => {
      if (!customerSearch) return [];
      const lower = customerSearch.toLowerCase();
      return customers.filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower)).slice(0, 5);
  }, [customers, customerSearch]);

  const handleCustomerSelect = (customer: Customer) => {
      setSelectedCustomer(customer);
      setCustomerSearch('');
      setShowCustomerDropdown(false);
      setIsNewCustomerMode(false);
      if (customer.isWholesaler) {
          setCart(prevCart => prevCart.map(item => {
              const originalProduct = products.find(p => p.id === item.id);
              if (originalProduct && originalProduct.wholesalePrice && originalProduct.wholesalePrice > 0) {
                  return { ...item, customPrice: originalProduct.wholesalePrice, discount: (originalProduct.sellPrice - originalProduct.wholesalePrice) * item.quantity };
              }
              return item;
          }));
      } else {
          setCart(prevCart => prevCart.map(item => {
              const originalProduct = products.find(p => p.id === item.id);
              if (originalProduct && item.customPrice === originalProduct.wholesalePrice) {
                  return { ...item, customPrice: originalProduct.sellPrice, discount: 0 };
              }
              return item;
          }));
      }
  };

  const handleTriggerNewCustomer = () => {
    const trimmed = customerSearch.trim();
    if (!trimmed) return;
    const hasAlphabets = /[a-zA-Z]/.test(trimmed);
    window.history.pushState({ tab: Tab.POS, depth: 1 }, '');
    setIsNewCustomerMode(true);
    setShowCustomerDropdown(false);
    if (hasAlphabets) { setNewCustName(trimmed); setNewCustPhone(''); setTimeout(() => custPhoneRef.current?.focus(), 150); }
    else { setNewCustPhone(trimmed); setNewCustName(''); setTimeout(() => custNameRef.current?.focus(), 150); }
  };

  const handleCreateCustomer = async () => {
      if (!newCustName || !newCustPhone) return;
      const phoneFormatted = newCustPhone.startsWith('+') ? newCustPhone : `+91 ${newCustPhone}`;
      const newCust = await StoreService.upsertCustomer({ name: newCustName, phone: phoneFormatted, location: newCustAddress, email: newCustEmail, totalSpent: 0, totalDues: 0, visitCount: 1, history: [] });
      setCustomers(prev => [...prev, newCust]);
      setSelectedCustomer(newCust);
      setIsNewCustomerMode(false);
      setNewCustName(''); setNewCustPhone(''); setNewCustAddress(''); setNewCustEmail('');
      window.history.back();
  };

  const addToCart = (product: Product) => {
    if (settings.soundEnabled) {
      playBeep('scan');
    }
    let appliedPrice = product.sellPrice;
    let appliedDiscount = 0;
    if (selectedCustomer?.isWholesaler && product.wholesalePrice && product.wholesalePrice > 0) {
        appliedPrice = product.wholesalePrice;
        appliedDiscount = product.sellPrice - product.wholesalePrice;
    }
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, discount: appliedDiscount * (item.quantity + 1) } : item);
      }
      return [...prev, { ...product, quantity: 1, discount: appliedDiscount, customPrice: appliedPrice }];
    });
    setInlineSearch('');
    setTimeout(() => inlineSearchRef.current?.focus(), 10);
  };

  const updateCartItem = (id: string, field: keyof POSCartItem, value: any) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const filteredInlineProducts = useMemo(() => {
      if (!inlineSearch) return [];
      const term = inlineSearch.toLowerCase();
      const matches = products.filter(p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
      return matches.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aStarts = aName.startsWith(term);
          const bStarts = bName.startsWith(term);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aName.localeCompare(bName);
      }).slice(0, 15);
  }, [products, inlineSearch]);

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.sellPrice) return;
    const created = await StoreService.addProduct(newProduct as Product);
    setProducts(prev => [...prev, created]);
    addToCart(created);
    setNewProduct({ name: '', sku: '', stock: 0, unit: 'pcs', capacity: '', buyPrice: 0, sellPrice: 0, wholesalePrice: 0, lowStockThreshold: settings.lowStockDefault, location: '', taxRate: settings.taxRateDefault ?? 0, expiryDate: '', manufacturingDate: '' });
    setBatchConfig({ packs: '', perPack: '' });
    setIsCreatingProduct(false);
    setShowProductLookup(false);
    window.history.back();
  };

  const totals = useMemo(() => {
      let gross = 0; let totalDiscount = 0; let totalTax = 0;
      cart.forEach(item => {
          const price = item.customPrice ?? item.sellPrice;
          const lineGross = price * item.quantity;
          const lineDisc = item.discount || 0;
          const taxRate = item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== 0 
              ? item.taxRate 
              : (settings?.taxRateDefault ?? 0);
          gross += lineGross;
          totalDiscount += lineDisc;
          totalTax += lineGross * (taxRate / 100);
      });
      if (selectedCustomer?.isWholesaler) {
          let standardGross = 0; let wholesaleNet = 0;
          cart.forEach(item => {
              const original = products.find(p => p.id === item.id);
              const sellP = original ? original.sellPrice : (item.customPrice || 0);
              standardGross += sellP * item.quantity;
              wholesaleNet += (item.customPrice || sellP) * item.quantity;
          });
          return { gross: standardGross, discount: standardGross - wholesaleNet, tax: totalTax, net: wholesaleNet + totalTax };
      }
      return { gross, discount: totalDiscount, tax: totalTax, net: gross + totalTax };
  }, [cart, selectedCustomer, products, settings]);

  useEffect(() => {
      if (showCheckout) {
          if (!partialPaidAmount || parseFloat(partialPaidAmount) === 0) setPartialPaidAmount(totals.net.toFixed(2));
          setQuickCustName(''); setQuickCustPhone(''); setShowCheckoutWarning(false); setShakeError(false);
      }
  }, [showCheckout, totals.net]);

  const handlePaymentMethodClick = (method: PaymentMethod) => {
      setPaymentMethod(method);
      if (method === 'Pay Later') setPartialPaidAmount('0');
      else setPartialPaidAmount(totals.net.toFixed(2));
  };

  const handleCheckout = async (action: 'save' | 'print' | 'share') => {
    if (cart.length === 0) return;
    const paidAmountValue = parseFloat(partialPaidAmount) || 0;
    if (paidAmountValue < 0) {
        alert("Amount paid cannot be negative.");
        return;
    }
    let activeCustomer = selectedCustomer;
    if (!activeCustomer && (quickCustName || (totals.net - paidAmountValue) > 1)) {
        if (!quickCustName || ((totals.net - paidAmountValue) > 1 && !quickCustPhone)) { triggerErrorState(); return; }
        const phoneFormatted = quickCustPhone ? (quickCustPhone.startsWith('+') ? quickCustPhone : `+91 ${quickCustPhone}`) : '';
        activeCustomer = await StoreService.upsertCustomer({ name: quickCustName, phone: phoneFormatted, totalSpent: 0, totalDues: 0, visitCount: 0, history: [] });
        setCustomers(prev => [...prev, activeCustomer!]);
    }
    const sale = await StoreService.createSale({
        items: cart.map(i => ({ ...i, sellPrice: i.customPrice ?? i.sellPrice, discount: i.discount })),
        customerName: activeCustomer ? activeCustomer.name : 'Walk-in Customer',
        customerId: activeCustomer?.id,
        subtotal: totals.gross,
        tax: totals.tax,
        total: totals.net,
        amountPaid: paidAmountValue,
        paymentMethod,
        servedBy: currentUser?.name || 'Staff'
    });
    if (settings.soundEnabled) {
      playBeep('success');
    }
    if (action === 'print') generateInvoicePDF(sale);
    else if (action === 'share') {
        if (activeCustomer && activeCustomer.phone) {
            const itemsList = sale.items.map(i => `• ${i.name} x${i.quantity}`).join('%0A');
            const link = `${window.location.origin}/?invoice=${sale.id}`; 
            const message = `*${settings.storeName || "Noor Store"}*%0A%0A*Items:*%0A${itemsList}%0A%0A*Total: ₹${sale.total.toFixed(0)}*%0A*Invoice Link:* ${link}`;
            const url = `https://wa.me/${activeCustomer.phone.replace(/[^0-9]/g, '')}?text=${message}`;
            try {
                window.open(url, '_blank');
            } catch (e) {
                console.warn("window.open blocked by sandbox context. Emulating fallback click.", e);
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }
    }
    setCart([]); setShowCheckout(false); setSelectedCustomer(null); setPaymentMethod('Cash'); setQuickCustName(''); setQuickCustPhone('');
    StoreService.clearPOSDraft();
    window.history.back();
    loadData();
  };

  const triggerErrorState = () => {
      if (settings.soundEnabled) {
          playBeep('error');
      }
      setShowCheckoutWarning(true); setShakeError(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => setShakeError(false), 500);
      quickNameRef.current?.focus();
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    
    if (showScanner && hasMediaDevices) {
        const timeoutId = setTimeout(() => {
            if (!document.getElementById("pos-reader")) return;
            try {
                html5QrCode = new Html5Qrcode("pos-reader");
                html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, (decodedText) => {
                        if (settings.soundEnabled) playBeep('scan');
                        const product = products.find(p => p.sku === decodedText || p.id === decodedText);
                        if (product) { addToCart(product); setShowScanner(false); window.history.back(); }
                        else { 
                            if (settings.autoOpenAddProduct !== false) {
                                setShowScanner(false); 
                                setNewProduct(prev => ({ ...prev, sku: decodedText })); 
                                setIsCreatingProduct(true); 
                                setShowProductLookup(true); 
                            } else {
                                setShowScanner(false);
                                window.history.back();
                                setLastScannedSku(decodedText);
                                setShowScanError(true);
                                setTimeout(() => {
                                    setShowScanError(false);
                                }, 1000);
                            }
                        }
                    }, () => {}).catch(err => {
                        console.warn("Html5Qrcode scanner failed to start:", err);
                    });
            } catch (err) {
                console.warn("Html5Qrcode initialization failed:", err);
            }
        }, 100);
        return () => { clearTimeout(timeoutId); html5QrCode?.isScanning && html5QrCode.stop(); };
    }
  }, [showScanner, products, settings]);

  if (viewMode === 'HISTORY') {
      return (
          <History
              currentUser={currentUser}
              closeHistory={closeHistory}
              recentSales={recentSales}
              loadData={loadData}
              settings={settings}
          />
      );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] md:p-6 pb-32 animate-in fade-in relative">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
        .shake-element { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
      <div className="w-full max-w-5xl mx-auto bg-white md:rounded-xl md:shadow-xl md:border border-gray-100 min-h-[60vh] md:min-h-0 flex flex-col">
          <div className="p-4 md:p-8 border-b border-gray-100 flex flex-row justify-between items-center gap-4 relative z-30">
              <div><div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold font-serif text-lg">N</div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">INVOICE</h1></div><p className="text-gray-400 text-sm">#{new Date().getTime().toString().slice(-6)}</p></div>
              <div className="flex gap-3"></div>
          </div>
          <div className="p-4 md:px-8 bg-gray-50/50 border-b border-gray-100">
              <div className="flex-1 max-w-md relative group">
                  {!selectedCustomer ? (
                      <div>
                          <label className="text-xs font-semibold text-black uppercase tracking-wider mb-2 block">Bill To:</label>
                          {!isNewCustomerMode && (
                              <div className="relative z-50">
                                  <Search className="absolute left-3 top-3 text-gray-400" size={16}/><input ref={customerSearchInputRef} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" placeholder="Type Name or Phone..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => setShowCustomerDropdown(true)} onKeyDown={(e) => { if (e.key === 'Enter') { if (filteredCustomers.length > 0) handleCustomerSelect(filteredCustomers[0]); else handleTriggerNewCustomer(); } }} />
                                  {showCustomerDropdown && customerSearch && (
                                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto z-50">{filteredCustomers.length > 0 ? filteredCustomers.map(c => (<button key={c.id} onClick={() => handleCustomerSelect(c)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 flex justify-between items-center group"><div><div className="font-bold text-gray-800 text-sm group-hover:text-blue-700 flex items-center gap-1">{c.name} {c.isWholesaler && <Star size={10} className="text-amber-500 fill-amber-500"/>}</div><div className="text-xs text-gray-400">{c.phone}</div></div><ChevronRight size={14} className="text-gray-300"/></button>)) : <div className="p-3 text-center"><button onClick={handleTriggerNewCustomer} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-md transition-colors">+ Create "{customerSearch}"</button></div>}</div>
                                  )}
                              </div>
                          )}
                          {isNewCustomerMode && (
                              <div className="mt-4 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(59,130,246,0.1)] border border-blue-100 p-5 animate-in slide-in-from-top-2"><div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50"><h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">NEW CUSTOMER</h4><button onClick={() => { setIsNewCustomerMode(false); window.history.back(); }} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 rounded-full p-1"><X size={16}/></button></div><div className="space-y-4"><div><label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Full Name</label><div className="relative"><User size={16} className="absolute left-3 top-3 text-blue-400" /><input ref={custNameRef} className="w-full pl-9 pr-3 py-2.5 bg-blue-50/10 border-b-2 border-blue-100 rounded-t-lg focus:border-blue-500 outline-none text-sm" placeholder="Type name..." value={newCustName} onChange={e => setNewCustName(e.target.value)} onKeyDown={(e) => handleKeyDown(e, custPhoneRef)} autoFocus /></div></div><div><label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Phone Number</label><div className="relative"><Phone size={16} className="absolute left-3 top-3 text-blue-400" /><input ref={custPhoneRef} className="w-full pl-9 pr-3 py-2.5 bg-blue-50/10 border-b-2 border-blue-100 rounded-t-lg focus:border-blue-500 outline-none text-sm" placeholder="Type phone..." value={newCustPhone} onChange={e => setNewCustPhone(e.target.value.replace(/[^\d+ ]/g, ''))} onKeyDown={(e) => handleKeyDown(e, null, handleCreateCustomer)} /></div></div></div><div className="flex justify-end mt-6"><Button size="sm" onClick={handleCreateCustomer} className="bg-blue-600 px-6">Save</Button></div></div>
                          )}
                      </div>
                  ) : (
                      <div className="relative h-full flex flex-col justify-center"><button onClick={() => setSelectedCustomer(null)} className="absolute top-0 right-0 p-2.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm active:scale-95" title="Remove Customer"><Trash2 size={16} /></button><label className="text-xs font-semibold text-black uppercase tracking-wider mb-1 block">Bill To:</label><div className="font-bold text-xl text-gray-900 flex items-center gap-2">{selectedCustomer.name} {selectedCustomer.isWholesaler && <Star size={16} className="text-amber-500 fill-amber-500"/>}</div><div className="mt-1 text-sm text-gray-600">{selectedCustomer.phone}</div></div>
                  )}
              </div>
          </div>
          <div className="px-4 md:px-8 py-3 bg-white"><button onClick={() => { window.history.pushState({ tab: Tab.POS, depth: 1 }, ''); setShowScanner(true); }} className="w-full flex items-center justify-center gap-2 py-3 bg-black hover:bg-zinc-900 text-white rounded-lg shadow-sm active:scale-95 transition-all"><Scan size={20}/><span className="font-bold text-sm">Scan Barcode</span></button></div>
          <div className="overflow-x-auto min-h-[220px] max-h-[340px] overflow-y-auto flex flex-col">
              <div className="min-w-[600px] w-full"><div className="grid grid-cols-[40px_2fr_80px_60px_60px_80px_40px] gap-2 px-4 md:px-8 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-20"><div className="text-center">#</div><div>Item Details</div><div className="text-right">Price</div><div className="text-center">Qty</div><div className="text-center">Dis</div><div className="text-right">Total</div><div></div></div><div className="divide-y divide-gray-100">{cart.map((item, index) => (<div key={item.id} className="grid grid-cols-[40px_2fr_80px_60px_60px_80px_40px] gap-2 items-center px-4 md:px-8 py-3 hover:bg-gray-50/50 transition-colors group"><div className="text-center text-gray-400 font-medium text-sm">{index + 1}</div><div><input className="w-full font-bold text-gray-900 text-sm bg-transparent border-b border-transparent focus:border-blue-500 outline-none" value={item.name} onChange={(e) => updateCartItem(item.id, 'name', e.target.value)} />{(item.size || item.color) && (<div className="flex gap-1.5 mt-0.5">{item.size && <span className="inline-block text-[9px] font-black uppercase text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">{item.size}</span>}{item.color && <span className="inline-block text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{item.color}</span>}</div>)}</div><div className="text-right"><input type="number" className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm font-medium" value={item.customPrice ?? item.sellPrice} onChange={(e) => updateCartItem(item.id, 'customPrice', parseFloat(e.target.value) || 0)} /></div><div className="px-1"><input type="number" className="w-full text-center bg-gray-50 rounded py-1 outline-none text-sm font-bold" value={item.quantity} onChange={(e) => updateCartItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></div><div className="px-1"><input type="number" className="w-full text-center bg-transparent border-b border-transparent focus:border-red-500 outline-none text-sm text-red-500" value={item.discount || ''} onChange={(e) => updateCartItem(item.id, 'discount', parseFloat(e.target.value) || 0)} /></div><div className="text-right font-extrabold text-gray-900 text-sm">₹{((item.customPrice ?? item.sellPrice) * item.quantity).toFixed(0)}</div><div className="text-right"><button onClick={() => removeFromCart(item.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button></div></div>))}<div className="grid grid-cols-[40px_2fr_80px_60px_60px_80px_40px] gap-2 items-start px-4 md:px-8 py-3 bg-white relative"><div className="text-center text-gray-300 font-medium text-sm pt-2">{cart.length + 1}</div><div className="relative"><input ref={inlineSearchRef} className="w-full py-2 border-b-2 border-blue-100 outline-none text-sm font-medium focus:border-blue-500" placeholder="Type item name..." value={inlineSearch} onChange={(e) => setInlineSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && filteredInlineProducts.length > 0) addToCart(filteredInlineProducts[0]); }} />{inlineSearch && (<div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border z-50 overflow-y-auto max-h-60">{filteredInlineProducts.length > 0 ? filteredInlineProducts.map(p => (<button key={p.id} onClick={() => addToCart(p)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b flex justify-between items-center text-sm"><div className="flex flex-col"><span className="font-bold text-gray-800">{p.name} {p.size ? `(${p.size})` : ''} {p.color ? `[${p.color}]` : ''}</span><span className="text-[10px] text-gray-400">Stock: {p.stock} {p.unit} {p.expiryDate ? `• Exp: ${p.expiryDate}` : ''}</span></div><span className="font-extrabold text-blue-600">₹{p.sellPrice}</span></button>)) : (settings?.autoOpenAddProduct !== false ? (<button onClick={() => { window.history.pushState({ tab: Tab.POS, depth: 1 }, ''); setIsCreatingProduct(true); setNewProduct({ ...newProduct, name: inlineSearch }); setShowProductLookup(true); setInlineSearch(''); }} className="w-full text-left px-4 py-3 text-sm text-blue-600 font-bold hover:bg-blue-50">+ Add "{inlineSearch}"</button>) : (<div className="p-4 text-center text-xs font-semibold text-gray-500">No matching items found</div>))}</div>)}</div><div className="text-right pt-2 text-gray-300 text-sm">-</div><div className="text-center pt-2 text-gray-300 text-sm">-</div><div className="text-center pt-2 text-gray-300 text-sm">-</div><div className="text-right pt-2 text-gray-300 text-sm">-</div></div></div></div>
          </div>
          <div className="bg-gray-50 p-6 md:p-8 border-t border-gray-200"><div className="flex flex-col md:flex-row gap-8 items-end justify-between"><div className="hidden md:block text-xs text-gray-400">Thank you for your business.</div><div className="w-full md:w-80 space-y-3"><div className="flex justify-between text-sm text-gray-600"><span>Gross Total</span><span>₹{totals.gross.toFixed(2)}</span></div>{totals.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Savings</span><span>-₹{totals.discount.toFixed(2)}</span></div>}<div className="flex justify-between text-sm text-gray-600"><span>Tax (GST {settings?.taxRateDefault ?? 0}%)</span><span>₹{totals.tax.toFixed(2)}</span></div><div className="pt-4 border-t flex justify-between items-center"><span className="font-bold text-gray-900 text-lg">Net Payable</span><span className="font-extrabold text-2xl text-green-700">₹{totals.net.toFixed(2)}</span></div><Button variant="success" onClick={() => { window.history.pushState({ tab: Tab.POS, depth: 1 }, ''); setShowCheckout(true); }} disabled={cart.length === 0} className="w-full py-4 mt-4 font-bold text-white text-base shadow-lg tracking-wide hover:bg-green-700 bg-green-600">Complete Sale</Button></div></div></div>
      </div>

      <Modal isOpen={showProductLookup && isCreatingProduct} onClose={() => { setShowProductLookup(false); setIsCreatingProduct(false); window.history.back(); }} title="Add New Product" className="!max-w-2xl"><div className="animate-in fade-in slide-in-from-right-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"><div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Product Name</label><Input ref={prodNameRef} onKeyDown={(e) => handleKeyDown(e, prodSkuRef)} value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} autoFocus /></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Barcode / SKU</label><div className="relative w-full"><Input ref={prodSkuRef} onKeyDown={(e) => handleKeyDown(e, prodSellRef)} value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="pr-12" /><button onClick={() => { window.history.pushState({ tab: Tab.POS, depth: 2 }, ''); setShowScanner(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-200/50 transition-all flex items-center justify-center"><Scan size={18}/></button></div></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Sell Price</label><Input ref={prodSellRef} onKeyDown={(e) => handleKeyDown(e, prodBuyRef)} type="number" min="0" value={newProduct.sellPrice || ''} onChange={e => { const val = parseFloat(e.target.value) || 0; setNewProduct({...newProduct, sellPrice: Math.max(0, val)}); }} /></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Buy Price</label><Input ref={prodBuyRef} onKeyDown={(e) => handleKeyDown(e, prodStockRef)} type="number" min="0" value={newProduct.buyPrice || ''} onChange={e => { const val = parseFloat(e.target.value) || 0; setNewProduct({...newProduct, buyPrice: Math.max(0, val)}); }} /></div><div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Stock</label><Input ref={prodStockRef} onKeyDown={(e) => handleKeyDown(e, null, handleSaveProduct)} type="number" min="0" value={newProduct.stock || ''} onChange={e => { const val = parseInt(e.target.value) || 0; setNewProduct({...newProduct, stock: Math.max(0, val)}); }} /></div></div><div className="flex justify-end gap-3 pt-4 border-t"><Button variant="neutral" onClick={() => { setIsCreatingProduct(false); setShowProductLookup(false); window.history.back(); }}>Cancel</Button><Button onClick={handleSaveProduct} className="bg-green-600">Save & Add</Button></div></div></Modal>
      <Modal isOpen={showCheckout} onClose={() => { setShowCheckout(false); window.history.back(); }} title="Payment" className="!max-w-md bg-white border-2 border-slate-300 shadow-2xl !p-4"><div className="text-center pb-2"><div className="bg-slate-100 border-2 border-slate-200 rounded-xl p-3 mb-3 text-center"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Total Amount Due</span><h2 className="text-3xl font-black text-slate-900">₹{totals.net.toFixed(2)}</h2></div><div className={`bg-slate-50 rounded-xl p-3 text-left space-y-2 mb-3 border-2 ${showCheckoutWarning ? 'border-red-400 bg-red-50/50' : 'border-slate-200'} ${shakeError ? 'shake-element' : ''}`}>{selectedCustomer ? <div className="flex justify-between items-center text-xs font-bold text-slate-800"><span className="flex items-center gap-1 text-slate-900 text-sm"><User size={14} className="text-indigo-600 shrink-0" />{selectedCustomer.name} {selectedCustomer.isWholesaler && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0"/>}</span><span className="text-slate-500 text-xs font-mono">{selectedCustomer.phone}</span></div> : <div className="space-y-2"><span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Quick Customer Details</span><div className="relative"><User size={12} className="absolute left-2.5 top-2.5 text-slate-400" /><input ref={quickNameRef} className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-400" placeholder="Customer Name" value={quickCustName} onChange={(e) => setQuickCustName(e.target.value)} /></div><div className="relative"><Phone size={12} className="absolute left-2.5 top-2.5 text-slate-400" /><input className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-400" placeholder="Phone Number" value={quickCustPhone} onChange={(e) => setQuickCustPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} /></div></div>}</div><div className="space-y-3 mb-3.5"><div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 text-left"><label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block mb-1">Paying Now</label><div className="flex items-center relative"><span className="absolute left-3 text-xl font-black text-slate-400">₹</span><input type="number" min="0" step="any" className="w-full pl-8 pr-3 py-1.5 text-2xl font-black bg-white border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900" value={partialPaidAmount} onChange={(e) => { const val = e.target.value; if (val.includes('-')) return; setPartialPaidAmount(val); }} /></div></div><div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 text-left"><label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block mb-1">Payment Method</label><div className="grid grid-cols-4 gap-1.5">{[{ id: 'Cash', icon: Banknote }, { id: 'UPI', icon: Smartphone }, { id: 'Card', icon: CreditCard }, { id: 'Pay Later', icon: Clock }].map(method => { const isSelected = paymentMethod === method.id; return (<button key={method.id} onClick={() => handlePaymentMethodClick(method.id as PaymentMethod)} className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}><method.icon size={16} className={`mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`}/><span className="text-[10px] font-black uppercase tracking-wider">{method.id}</span></button>); })}</div></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><Button onClick={() => handleCheckout('print')} className="py-2 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"><Printer size={16}/><span>Print Bill</span></Button><Button onClick={() => handleCheckout('share')} className="py-2 px-3 text-xs font-bold bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"><WhatsAppLogo /><span>WhatsApp</span></Button><Button onClick={() => handleCheckout('save')} className="py-2 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={16}/><span>Save Only</span></Button></div></div></Modal>
      <Modal isOpen={showScanner} onClose={() => { setShowScanner(false); window.history.back(); }} title="Scan Barcode">
        <div className="relative bg-black rounded-xl overflow-hidden min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-white">
          {(!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) ? (
            <div className="space-y-4 max-w-xs animate-in fade-in duration-200">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <CircleAlert size={24} />
              </div>
              <h3 className="font-bold text-base text-gray-200">Camera Access Not Supported</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your browser, security settings, or iframe sandbox does not permit camera access. Please enter the SKU/barcode or product name manually.
              </p>
            </div>
          ) : (
            <div id="pos-reader" className="w-full h-full"></div>
          )}
        </div>
      </Modal>

      <Modal isOpen={showScanError} onClose={() => setShowScanError(false)} title="Product Not Found" className="!max-w-xs text-center">
        <div className="flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-bold text-base text-gray-900 mb-1">Item Not Found</h3>
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            No item matched the barcode/SKU:
          </p>
          <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-mono font-bold text-gray-700 select-all">
            {lastScannedSku}
          </div>
        </div>
      </Modal>
    </div>
  );
};
