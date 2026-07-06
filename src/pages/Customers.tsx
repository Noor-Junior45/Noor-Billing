import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Sale, Payment, Tab } from '../types';
import { StoreService } from '../services/storeService';
import { generateInvoicePDF } from '../services/pdfService';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { Search, MapPin, Phone, User, Clock, Pencil, Trash2, Plus, X, Mail, ArrowLeft, Contact, Phone as PhoneIcon, MessageCircle, Share2, AlertTriangle, CheckCircle2, Banknote, CreditCard, Smartphone, Printer, Star, Receipt, ChevronDown, Wallet, Image as ImageIcon, Loader2, Eye } from 'lucide-react';

interface CustomersProps {
  initialAction?: string;
  onClearAction?: () => void;
}

export const Customers: React.FC<CustomersProps> = ({ initialAction, onClearAction }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [shakeTrigger, setShakeTrigger] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [copiedPortal, setCopiedPortal] = useState(false);

  const [zoomedReceipt, setZoomedReceipt] = useState<string | null>(null);
  const [verifyingCustomer, setVerifyingCustomer] = useState<Customer | null>(null);
  const [hasShownAutoPopup, setHasShownAutoPopup] = useState(false);

  // --- Navigation Gesture Hook ---
  useEffect(() => {
      const handleNavigationPop = (e: any) => {
          if (zoomedReceipt) {
              setZoomedReceipt(null);
              return;
          }
          if (verifyingCustomer) {
              setVerifyingCustomer(null);
              return;
          }
          if (showPaymentModal) {
              setShowPaymentModal(false);
              return;
          }
          if (showEditModal) {
              setShowEditModal(false);
              return;
          }
          if (selectedCustomer) {
              setSelectedCustomer(null);
              return;
          }
          if (viewingSale) {
              setViewingSale(null);
              return;
          }
      };
      window.addEventListener('app-navigation-pop' as any, handleNavigationPop);
      return () => window.removeEventListener('app-navigation-pop' as any, handleNavigationPop);
  }, [selectedCustomer, showEditModal, showPaymentModal, viewingSale, zoomedReceipt, verifyingCustomer]);

  const handleSelectCustomer = (c: Customer) => {
      window.history.pushState({ tab: Tab.CUSTOMERS, depth: 1 }, '');
      setSelectedCustomer(c);
  };

  const handleOpenAddModal = () => {
      window.history.pushState({ tab: Tab.CUSTOMERS, depth: 1 }, '');
      setFormData({
          name: '',
          phone: '',
          email: '',
          location: '',
          totalSpent: 0,
          totalDues: 0,
          visitCount: 0,
          history: [],
          payments: [],
          isWholesaler: false
      });
      setShowEditModal(true);
  };

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showDuesError, setShowDuesError] = useState(false);

  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (customers.length > 0 && !hasShownAutoPopup) {
      const pending = customers.find(c => c.pendingUpdates?.pendingPayment);
      if (pending) {
        setVerifyingCustomer(pending);
        setHasShownAutoPopup(true);
      }
    }
  }, [customers, hasShownAutoPopup]);

  useEffect(() => {
    if (initialAction === 'add') {
        handleOpenAddModal();
        if (onClearAction) onClearAction();
    }
  }, [initialAction]);

  const loadData = async () => {
    const cData = await StoreService.getCustomers();
    const sData = await StoreService.getSales();
    
    setCustomers(cData);
    setSales(sData);

    // Keep selected customer up-to-date with pendingUpdates
    if (selectedCustomer) {
        const updatedSelected = cData.find(c => c.id === selectedCustomer.id);
        if (updatedSelected) {
            setSelectedCustomer(updatedSelected);
        }
    }

    // Keep verifying customer up-to-date
    if (verifyingCustomer) {
        const updatedVerifying = cData.find(c => c.id === verifyingCustomer.id);
        setVerifyingCustomer(updatedVerifying || null);
    }
  };

  const handleApproveUpdate = async (customer: Customer) => {
      if (!customer.pendingUpdates) return;
      
      const updated: Customer = {
          ...customer,
          name: customer.pendingUpdates.name || customer.name,
          email: customer.pendingUpdates.email || customer.email,
          location: customer.pendingUpdates.location || customer.location
      };
      
      updated.pendingUpdates = undefined;
      
      await StoreService.upsertCustomer(updated);
      await loadData();
  };

  const handleRejectUpdate = async (customer: Customer) => {
      const updated: Customer = {
          ...customer
      };
      updated.pendingUpdates = undefined;
      
      await StoreService.upsertCustomer(updated);
      await loadData();
  };

  const handleApprovePayment = async (customer: Customer) => {
      const pendingPayment = customer.pendingUpdates?.pendingPayment;
      if (!pendingPayment) return;

      try {
          // Register the payment officially in the customer's payment list, which automatically reduces dues
          await StoreService.addCustomerPayment(
              customer.id,
              pendingPayment.amount,
              pendingPayment.method,
              pendingPayment.note || 'Approved verification',
              pendingPayment.date,
              pendingPayment.receiptImage || undefined
          );

          // Get the updated customer structure from local cache to keep other pending updates intact
          const updatedCustomers = await StoreService.getCustomers();
          const found = updatedCustomers.find(c => c.id === customer.id);
          if (found && found.pendingUpdates) {
              const cleanedUpdates = { ...found.pendingUpdates };
              delete cleanedUpdates.pendingPayment;
              
              // If there are no other pending fields, clear pendingUpdates entirely
              const hasRemainingFields = !!(cleanedUpdates.name || cleanedUpdates.email || cleanedUpdates.location);
              
              const finalCustomer = {
                  ...found,
                  pendingUpdates: hasRemainingFields ? cleanedUpdates : undefined
              };
              await StoreService.upsertCustomer(finalCustomer);
          }
          
          await loadData();
          setVerifyingCustomer(null); // Close the auto-popup if it was open
      } catch (err) {
          alert('Failed to approve payment.');
      }
  };

  const handleRejectPayment = async (customer: Customer) => {
      if (!customer.pendingUpdates) return;
      
      try {
          const cleanedUpdates = { ...customer.pendingUpdates };
          delete cleanedUpdates.pendingPayment;
          
          const hasRemainingFields = !!(cleanedUpdates.name || cleanedUpdates.email || cleanedUpdates.location);
          
          const finalCustomer = {
              ...customer,
              pendingUpdates: hasRemainingFields ? cleanedUpdates : undefined
          };
          await StoreService.upsertCustomer(finalCustomer);
          await loadData();
          setVerifyingCustomer(null); // Close the auto-popup if it was open
      } catch (err) {
          alert('Failed to reject payment.');
      }
  };

  const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEndAction = (action: () => void, direction: 'right' | 'down') => {
      if (!touchStart || !touchEnd) return;
      const xDiff = touchStart.x - touchEnd.x;
      const yDiff = touchStart.y - touchEnd.y;
      const absX = Math.abs(xDiff);
      const absY = Math.abs(yDiff);

      if (direction === 'right') {
          if (absX > absY && xDiff < -minSwipeDistance) { action(); }
      } else if (direction === 'down') {
          if (absY > absX && yDiff < -minSwipeDistance) { action(); }
      }
  };

  const handleEditClick = (customer: Customer) => {
    window.history.pushState({ tab: Tab.CUSTOMERS, depth: 1 }, '');
    const cleanPhone = customer.phone.replace(/^\+91\s?/, '');
    setFormData({ ...customer, phone: cleanPhone });
    setValidationErrors(new Set());
    setShowEditModal(true);
  };

  const validateForm = () => {
    const errors = new Set<string>();
    if (!formData.name?.trim()) errors.add('name');
    if (!formData.phone?.trim() && !formData.email?.trim()) { errors.add('phone'); errors.add('email'); }
    setValidationErrors(errors);
    if (errors.size > 0) {
      setShakeTrigger(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => setShakeTrigger(false), 500);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Clean and prefix phone number
    let rawPhone = (formData.phone || '').trim();
    let phoneToSave = rawPhone;
    if (rawPhone && !rawPhone.startsWith('+')) {
        phoneToSave = `+91 ${rawPhone}`;
    }
    
    // Ensure critical arrays are initialized to prevent rendering crashes
    const payload = {
        ...formData,
        phone: phoneToSave,
        history: formData.history || [],
        payments: formData.payments || [],
        totalSpent: formData.totalSpent || 0,
        totalDues: formData.totalDues || 0,
        visitCount: formData.visitCount || 0
    };

    const savedCustomer = await StoreService.upsertCustomer(payload);
    setSearchTerm('');
    setShowEditModal(false);
    
    // Refresh data and handle navigation
    await loadData();
    setSelectedCustomer(savedCustomer);
    window.history.back();
  };

  const handleDeleteClick = (customer: Customer) => {
      setCustomerToDelete(customer);
      if ((customer.totalDues || 0) > 0) setShowDuesError(true);
      else setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
      if (!customerToDelete) return;
      await StoreService.deleteCustomer(customerToDelete.id);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      setSelectedCustomer(null);
      loadData();
  };

  const getMailtoLink = (customer: Customer) => {
      const portalLink = `${window.location.origin}/?c=${customer.id}`;
      const subject = encodeURIComponent(`Your Noor Store Customer Portal & Statement`);
      const body = encodeURIComponent(
          `Hello ${customer.name},\n\n` +
          `Thank you for your business with Noor Store.\n\n` +
          `You can track your invoices, check outstanding dues, and upload UPI payment receipts securely using your unique customer portal link below:\n` +
          `${portalLink}\n\n` +
          `Current Statement:\n` +
          `- Outstanding Dues: ₹${customer.totalDues || 0}\n` +
          `- Total Purchases: ₹${customer.totalSpent.toLocaleString()}\n` +
          `- Total Visits: ${customer.visitCount}\n\n` +
          `Best regards,\n` +
          `Noor Store`
      );
      return `mailto:${customer.email}?subject=${subject}&body=${body}`;
  };

  const handleShareWhatsApp = (customer: Customer) => {
      const portalLink = `${window.location.origin}/?c=${customer.id}`;
      const message = `Hello ${customer.name},%0A%0AWe appreciate your business with Noor Store.%0A%0AHere is your unique customer portal link to track invoices, check outstanding dues, and pay securely:%0A${encodeURIComponent(portalLink)}`;
      const url = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${message}`;
      window.open(url, '_blank');
  };

  const handleNativeShare = async (customer: Customer) => {
      const portalLink = `${window.location.origin}/?c=${customer.id}`;
      const text = `Hello ${customer.name}, here is your unique customer portal link to track invoices, check outstanding dues, and pay securely: ${portalLink}`;
      
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `${customer.name} - Customer Portal`,
                  text: text,
                  url: portalLink
              });
          } catch (err) {
              console.log("Error sharing or cancelled:", err);
              if (err instanceof Error && err.name !== 'AbortError') {
                  navigator.clipboard.writeText(portalLink);
                  setCopiedPortal(true);
                  setTimeout(() => setCopiedPortal(false), 2000);
              }
          }
      } else {
          navigator.clipboard.writeText(portalLink);
          setCopiedPortal(true);
          setTimeout(() => setCopiedPortal(false), 2000);
      }
  };

  const openPaymentModal = (customer: Customer) => {
      setPaymentAmount(customer.totalDues.toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setPaymentNote('');
      setPaymentReceipt(null);
      window.history.pushState({ tab: Tab.CUSTOMERS, depth: 2 }, '');
      setShowPaymentModal(true);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setPaymentReceipt(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleRecordPayment = async () => {
      if (!selectedCustomer || !paymentAmount) return;
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) return;
      setIsProcessingPayment(true);
      try {
        await StoreService.addCustomerPayment(selectedCustomer.id, amount, paymentMethod, paymentNote, paymentDate, paymentReceipt || undefined);
        const updatedCustomers = await StoreService.getCustomers();
        const updatedSelf = updatedCustomers.find(c => c.id === selectedCustomer.id);
        setCustomers(updatedCustomers);
        if (updatedSelf) setSelectedCustomer(updatedSelf);
        setShowPaymentModal(false);
        window.history.back();
      } finally { setIsProcessingPayment(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement> | null, isSubmit = false) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (isSubmit) handleSave(); else nextRef?.current?.focus();
      }
  };

  const filteredAndSortedCustomers = useMemo(() => {
      return customers
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);

  const renderContacts = () => (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Top Fixed/Sticky Navbar */}
          <div id="crm-navbar" className="sticky top-0 z-30 -mx-4 -mt-4 px-4 py-3 md:-mx-6 md:-mt-6 md:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 mb-6 shadow-sm">
              {/* Left Side: Contacts Info */}
              <div id="crm-contacts-info" className="flex items-center gap-2.5 shrink-0 select-none">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/35"><Contact size={18} /></div>
                  <div className="text-left">
                      <h2 className="text-sm font-extrabold text-slate-800 leading-tight">Contacts</h2>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{filteredAndSortedCustomers.length} Active</p>
                  </div>
              </div>

              {/* Notification Button for Pending Payments */}
              {customers.some(c => c.pendingUpdates?.pendingPayment) && (
                  <button 
                      onClick={() => {
                          const first = customers.find(c => c.pendingUpdates?.pendingPayment);
                          if (first) setVerifyingCustomer(first);
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm animate-pulse shrink-0 cursor-pointer"
                  >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Pending Payment
                  </button>
              )}

              {/* Right Side: Search Bar */}
              <div id="crm-search-container" className="flex-1 max-w-sm relative">
                  <div className="relative flex items-center bg-white hover:bg-slate-50 focus-within:bg-white rounded-full transition-all duration-300 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 focus-within:shadow-sm h-10 px-3.5">
                        <Search className="text-blue-500 mr-2 shrink-0" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search name or phone..." 
                            className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 h-full outline-none" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0"><X size={16}/></button>}
                  </div>
              </div>
          </div>

          <div className="flex-1 flex gap-6 min-h-0 relative px-2">
               <div className={`w-full md:w-5/12 lg:w-1/3 overflow-y-auto pr-2 pb-24 shrink-0 ${selectedCustomer ? 'hidden md:block' : ''}`}>
                    {filteredAndSortedCustomers.length === 0 ? (
                        <div className="text-center py-20 text-gray-400"><User size={48} className="mx-auto mb-2 opacity-20"/><p>No customers found.</p></div>
                    ) : (
                        <div className="space-y-1">
                            {filteredAndSortedCustomers.map(c => (
                                <div key={c.id} onClick={() => handleSelectCustomer(c)} className={`group p-3 rounded-full md:rounded-xl transition-all cursor-pointer flex items-center gap-4 hover:bg-gray-100 ${selectedCustomer?.id === c.id ? 'bg-blue-50 border border-blue-100' : 'bg-transparent border border-transparent'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 relative ${selectedCustomer?.id === c.id ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                                        {c.name.charAt(0).toUpperCase()}
                                        {c.isWholesaler && <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100"><Star size={10} className="text-amber-500 fill-amber-500"/></div>}
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <div className="flex justify-between items-center pr-2">
                                            <span className="font-bold text-gray-900 truncate flex items-center gap-1">{c.name} {c.isWholesaler && <Star size={12} className="text-amber-500 fill-amber-500"/>}</span>
                                            {(c.totalDues || 0) > 0 && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 shrink-0 ml-2 whitespace-nowrap uppercase">Due: ₹{c.totalDues}</span>}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                                            <span className="truncate">{c.phone}</span>
                                            {c.pendingUpdates?.pendingPayment && (
                                                <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full animate-pulse ml-2 flex items-center gap-1 shrink-0 whitespace-nowrap uppercase">
                                                    <Wallet size={10} /> Settle: ₹{c.pendingUpdates.pendingPayment.amount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                         <button onClick={(e) => {e.stopPropagation(); handleEditClick(c)}} className="p-2 hover:bg-white rounded-full text-gray-500 shadow-sm border border-gray-100"><Pencil size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
               </div>
               <div className="hidden md:block flex-1 pl-4 border-l border-gray-100 h-full min-h-0 overflow-hidden">
                    {selectedCustomer ? renderCustomerDetails(selectedCustomer, false) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-30"><Contact size={64} className="mb-4"/><p className="font-bold uppercase tracking-widest text-xs">Select contact to view profile</p></div>
                    )}
               </div>
          </div>
      </div>
  );

  const renderCustomerDetails = (customer: Customer, isMobile: boolean) => {
      const historyItems: Array<{ type: 'sale' | 'payment', date: string, data: Sale | Payment }> = [];
      const customerHistory = customer.history || [];
      const customerPayments = customer.payments || [];

      customerHistory.forEach(saleId => { const sale = sales.find(s => s.id === saleId); if (sale) historyItems.push({ type: 'sale', date: sale.timestamp, data: sale }); });
      customerPayments.forEach(payment => { historyItems.push({ type: 'payment', date: payment.date, data: payment }); });
      
      historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return (
      <div className={`h-full bg-white overflow-y-auto ${isMobile ? 'animate-in slide-in-from-bottom-full duration-300' : 'rounded-2xl border border-gray-100 shadow-sm'}`}>
          <div className="p-4">
              {customer.pendingUpdates && (customer.pendingUpdates.name || customer.pendingUpdates.email || customer.pendingUpdates.location) && (
                  <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm text-left animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider mb-2">
                          <AlertTriangle size={16} className="text-amber-600 animate-pulse" />
                          <span>Pending Contact Updates</span>
                      </div>
                      <p className="text-xs text-amber-700/85 mb-3 font-medium">
                          This customer submitted update requests via their digital invoice. Review and approve to save to the database:
                      </p>
                      <div className="space-y-1.5 bg-white p-3 rounded-xl border border-amber-100/70 mb-3 text-xs text-gray-700 font-medium font-sans">
                          {customer.pendingUpdates.name && (
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-black text-gray-400 w-16">Name:</span>
                                  <span className="text-slate-900 font-bold bg-amber-50/50 px-2 py-0.5 rounded-md border border-amber-100/50">{customer.pendingUpdates.name}</span>
                              </div>
                          )}
                          {customer.pendingUpdates.email && (
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-black text-gray-400 w-16">Email:</span>
                                  <span className="text-slate-900 font-bold bg-amber-50/50 px-2 py-0.5 rounded-md border border-amber-100/50">{customer.pendingUpdates.email}</span>
                              </div>
                          )}
                          {customer.pendingUpdates.location && (
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-black text-gray-400 w-16">Address:</span>
                                  <span className="text-slate-900 font-bold bg-amber-50/50 px-2 py-0.5 rounded-md border border-amber-100/50">{customer.pendingUpdates.location}</span>
                              </div>
                          )}
                          <div className="text-[9px] text-slate-400 mt-1 italic">
                              Submitted on {new Date(customer.pendingUpdates.timestamp).toLocaleString()}
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => handleApproveUpdate(customer)}
                              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                          >
                              Approve & Save
                          </button>
                          <button 
                              onClick={() => handleRejectUpdate(customer)}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                              Ignore
                          </button>
                      </div>
                  </div>
              )}

              {customer.pendingUpdates?.pendingPayment && (
                  <div className="mb-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm text-left animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider mb-2">
                          <Banknote size={16} className="text-emerald-600 animate-bounce" />
                          <span>Pending Payment Verification</span>
                      </div>
                      <p className="text-xs text-emerald-700/85 mb-3 font-medium">
                          The customer submitted a payment proof of <strong>₹{customer.pendingUpdates.pendingPayment.amount}</strong> via their online UPI payment link. Please verify the payment on your UPI app and approve below:
                      </p>
                      
                      <div className="space-y-1.5 bg-white p-3 rounded-xl border border-emerald-100/70 mb-3 text-xs text-gray-700 font-medium font-sans">
                          <div className="flex justify-between items-center pb-1.5 border-b border-emerald-50/50 mb-1.5">
                              <span className="text-[10px] uppercase font-black text-gray-400">Settled Amount:</span>
                              <span className="text-emerald-700 font-black text-sm">₹{customer.pendingUpdates.pendingPayment.amount}</span>
                          </div>
                          {customer.pendingUpdates.pendingPayment.note && (
                              <div className="flex items-start gap-2">
                                  <span className="text-[10px] uppercase font-black text-gray-400 w-16 shrink-0">UTR / Note:</span>
                                  <span className="text-slate-800 font-bold bg-emerald-50/20 px-2 py-0.5 rounded-md border border-emerald-100/30 break-all">{customer.pendingUpdates.pendingPayment.note}</span>
                              </div>
                          )}
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-black text-gray-400 w-16">Date:</span>
                              <span className="text-slate-800 font-bold">{customer.pendingUpdates.pendingPayment.date}</span>
                          </div>
                          {customer.pendingUpdates.pendingPayment.receiptImage && (
                              <div className="mt-3">
                                  <span className="text-[10px] uppercase font-black text-gray-400 block mb-1">Receipt Screenshot:</span>
                                  <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-emerald-200 bg-gray-50 flex items-center justify-center cursor-pointer" onClick={() => setZoomedReceipt(customer.pendingUpdates?.pendingPayment?.receiptImage || null)}>
                                      <img src={customer.pendingUpdates.pendingPayment.receiptImage} className="w-full h-full object-cover" alt="Receipt Screenshot" />
                                      <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Eye size={16} className="mr-1" /> View Receipt
                                      </div>
                                  </div>
                              </div>
                          )}
                          <div className="text-[9px] text-slate-400 mt-2 italic">
                              Submitted on {new Date(customer.pendingUpdates.pendingPayment.timestamp || customer.pendingUpdates.timestamp).toLocaleString()}
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => handleApprovePayment(customer)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-1.5"
                          >
                              <CheckCircle2 size={14} /> Approve & Settle Dues
                          </button>
                          <button 
                              onClick={() => handleRejectPayment(customer)}
                              className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                              Reject
                          </button>
                      </div>
                  </div>
              )}
              <div className="flex justify-between items-start mb-2">
                  <button onClick={() => { setSelectedCustomer(null); if(isMobile) window.history.back(); }} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">{isMobile ? <ArrowLeft size={24} /> : <X size={24} />}</button>
                  <div className="flex gap-2 ml-auto">
                       <button onClick={() => handleEditClick(customer)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><Pencil size={18}/></button>
                       <button onClick={() => handleNativeShare(customer)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600" title="Share Portal Link"><Share2 size={18}/></button>
                       <button onClick={() => handleDeleteClick(customer)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><Trash2 size={18}/></button>
                  </div>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-purple-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-sm relative">{customer.name.charAt(0).toUpperCase()} {customer.isWholesaler && <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full border border-gray-100 shadow-sm"><Star size={16} className="text-amber-500 fill-amber-500"/></div>}</div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">{customer.name}</h2>
                  {customer.isWholesaler && <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mt-1">Wholesale Customer</span>}
                   <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                       <a href={`tel:${customer.phone}`} className="flex flex-col items-center gap-1 p-2 min-w-[65px] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"><div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 flex items-center justify-center shadow-sm"><PhoneIcon size={18}/></div><span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Call</span></a>
                       <button onClick={() => handleShareWhatsApp(customer)} className="flex flex-col items-center gap-1 p-2 min-w-[65px] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"><div className="w-9 h-9 rounded-full bg-green-50 text-green-600 group-hover:bg-green-100 flex items-center justify-center shadow-sm"><MessageCircle size={18}/></div><span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Chat</span></button>
                       <button 
                           onClick={() => handleNativeShare(customer)} 
                           className="flex flex-col items-center gap-1 p-2 min-w-[65px] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                       >
                           <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${copiedPortal ? 'bg-emerald-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                               {copiedPortal ? <CheckCircle2 size={18} /> : <Share2 size={18}/>}
                           </div>
                           <span className={`text-[10px] font-bold uppercase tracking-wide ${copiedPortal ? 'text-emerald-600 font-black' : 'text-indigo-600'}`}>
                               {copiedPortal ? 'Copied!' : 'Share'}
                           </span>
                       </button>
                       {customer.email && <a href={getMailtoLink(customer)} className="flex flex-col items-center gap-1 p-2 min-w-[65px] hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"><div className="w-9 h-9 rounded-full bg-red-50 text-red-600 group-hover:bg-red-100 flex items-center justify-center shadow-sm"><Mail size={18}/></div><span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Email</span></a>}
                       {(customer.totalDues || 0) > 0 && <button onClick={() => openPaymentModal(customer)} className="flex flex-col items-center gap-1 p-2 min-w-[65px] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer group"><div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:bg-emerald-700 animate-in zoom-in duration-300"><Wallet size={18}/></div><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Settle</span></button>}
                  </div>
              </div>
          </div>
          <div className="p-4 space-y-4 pt-0">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100 shadow-sm">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Contact Details</h3>
                   <div className="flex items-center gap-4"><div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400"><Phone size={18}/></div><div><div className="text-sm font-bold text-gray-900">{customer.phone}</div><div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Primary Mobile</div></div></div>
                   {customer.email && <div className="flex items-center gap-4"><div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400"><Mail size={18}/></div><div><div className="text-sm font-bold text-gray-900">{customer.email}</div><div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Business Email</div></div></div>}
                   {customer.location && <div className="flex items-center gap-4"><div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400"><MapPin size={18}/></div><div><div className="text-sm font-bold text-gray-900">{customer.location}</div><div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Shipping Address</div></div></div>}
              </div>

              <div className="bg-white rounded-2xl p-4 border-2 border-gray-50">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Financial Overview</h3>
                   <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-white rounded-2xl border border-gray-100 shadow-sm"><div className="text-[9px] text-gray-400 uppercase font-black mb-1">Spent</div><div className="font-black text-green-600 text-sm">₹{customer.totalSpent.toLocaleString()}</div></div>
                        <div className="text-center p-3 bg-white rounded-2xl border border-gray-100 shadow-sm"><div className="text-[9px] text-gray-400 uppercase font-black mb-1">Visits</div><div className="font-black text-blue-600 text-sm">{customer.visitCount}</div></div>
                        <div className="text-center p-3 bg-white rounded-2xl border border-red-50 shadow-sm relative overflow-hidden group"><div className="text-[9px] text-gray-400 uppercase font-black mb-1">Dues</div><div className="font-black text-red-600 text-sm">₹{customer.totalDues || 0}</div></div>
                   </div>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 mt-8">Recent Activities</h3>
                   {historyItems.length > 0 ? (
                       <div className="space-y-3">
                           {historyItems.map((item, idx) => {
                               if (item.type === 'sale') {
                                   const sale = item.data as Sale;
                                   return (
                                       <div key={`sale-${sale.id}`} onClick={() => { window.history.pushState({ tab: Tab.CUSTOMERS, depth: 2 }, ''); setViewingSale(sale); }} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 cursor-pointer transition-all hover:scale-[1.01]">
                                           <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm"><Receipt size={18}/></div><div><div className="text-sm font-black text-gray-900">Sale <span className="text-[10px] font-bold text-gray-400 ml-2 uppercase">#{sale.id.slice(0,5)}</span></div><div className="text-[10px] text-gray-500 font-bold uppercase">{new Date(sale.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</div></div></div>
                                           <div className="text-right"><div className="text-sm font-black text-gray-950">₹{sale.total.toFixed(0)}</div><div className="text-[10px] font-bold text-indigo-500 uppercase">{sale.items.length} Items</div></div>
                                       </div>
                                   );
                               } else {
                                   const payment = item.data as Payment;
                                   return (
                                       <div key={`pay-${payment.id}`} className="flex flex-col bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 shadow-sm gap-3">
                                           <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm ring-2 ring-white"><CheckCircle2 size={18}/></div><div><div className="text-sm font-black text-emerald-700">Payment In</div><div className="text-[10px] text-emerald-600/70 font-bold uppercase">{new Date(payment.date).toLocaleDateString()} • {payment.method}</div></div></div><div className="text-right"><div className="text-sm font-black text-emerald-700">-₹{payment.amount.toLocaleString()}</div>{payment.note && <div className="text-[9px] text-emerald-500 font-bold uppercase truncate max-w-[100px]">{payment.note}</div>}</div></div>
                                           {payment.receiptImage && <div className="mt-1"><button onClick={() => { const win = window.open(""); win?.document.write(`<img src="${payment.receiptImage}" style="max-width:100%; height:auto;" />`); }} className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase bg-white border border-emerald-100 rounded-lg px-3 py-2 hover:bg-emerald-50 transition-colors"><ImageIcon size={14}/> View Receipt Proof</button></div>}
                                       </div>
                                   );
                               }
                           })}
                       </div>
                   ) : (
                       <p className="text-center text-gray-300 text-[10px] font-black uppercase tracking-widest py-10">No records found</p>
                   )}
              </div>
          </div>
      </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] md:h-[calc(100vh-130px)] pb-12 animate-in fade-in">
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake-element { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
      <div className="flex-1 min-h-0 relative">{renderContacts()}</div>
      <button onClick={handleOpenAddModal} className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-transform active:scale-95 hover:bg-blue-700 hover:scale-105" style={{ boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' }}><Plus size={28} /></button>
      {selectedCustomer && (
          <div className="md:hidden fixed inset-0 z-50 bg-white animate-in slide-in-from-bottom-10 duration-200" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => onTouchEndAction(() => { setSelectedCustomer(null); window.history.back(); }, 'right')}>{renderCustomerDetails(selectedCustomer, true)}</div>
      )}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); window.history.back(); }} title={formData.id ? 'Edit Contact' : 'Create Contact'}>
         <div className={`space-y-4 ${shakeTrigger ? 'shake-element' : ''}`} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => onTouchEndAction(() => { setShowEditModal(false); window.history.back(); }, 'down')}>
             <div className="flex justify-center mb-4"><div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 relative"><User size={32}/>{formData.isWholesaler && <Star className="absolute -bottom-1 -right-1 text-amber-500 fill-amber-500 bg-white rounded-full p-1 shadow-md border border-gray-100" size={20}/>}</div></div>
             <div><label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${validationErrors.has('name') ? 'text-red-500' : 'text-gray-400'}`}>Full Name *</label><div className={`flex items-center border-b-2 transition-colors bg-gray-50 rounded-t-xl px-3 ${validationErrors.has('name') ? 'border-red-500 bg-red-50' : 'border-gray-100 focus-within:border-blue-500'}`}><User size={18} className={validationErrors.has('name') ? 'text-red-400' : 'text-gray-400 mr-2'}/><input ref={nameRef} onKeyDown={(e) => handleKeyDown(e, phoneRef)} className="w-full py-3 bg-transparent outline-none text-gray-950 font-bold placeholder-gray-300" placeholder="e.g. John Doe" value={formData.name || ''} onChange={e => { setFormData({...formData, name: e.target.value}); if (validationErrors.has('name')) { setValidationErrors(prev => { const n = new Set(prev); n.delete('name'); return n; }); } }} /></div></div>
             <div><label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${validationErrors.has('phone') ? 'text-red-500' : 'text-gray-400'}`}>Phone Number {validationErrors.has('phone') && '(Requires Phone or Email)'}</label><div className={`flex items-center border-b-2 transition-colors bg-gray-50 rounded-t-xl px-3 ${validationErrors.has('phone') ? 'border-red-500 bg-red-50' : 'border-gray-100 focus-within:border-blue-500'}`}><PhoneIcon size={18} className={validationErrors.has('phone') ? 'text-red-400' : 'text-gray-400 mr-2'}/><input ref={phoneRef} onKeyDown={(e) => handleKeyDown(e, emailRef)} className="w-full py-3 bg-transparent outline-none text-gray-950 font-bold placeholder-gray-300" placeholder="Mobile Number" value={formData.phone || ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); setFormData({...formData, phone: val}); if (validationErrors.has('phone') || validationErrors.has('email')) { setValidationErrors(prev => { const n = new Set(prev); n.delete('phone'); n.delete('email'); return n; }); } }} maxLength={10} /></div></div>
             <div><label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${validationErrors.has('email') ? 'text-red-500' : 'text-gray-400'}`}>Email Address {validationErrors.has('email') && '(Requires Phone or Email)'}</label><div className={`flex items-center border-b-2 transition-colors bg-gray-50 rounded-t-xl px-3 ${validationErrors.has('email') ? 'border-red-500 bg-red-50' : 'border-gray-100 focus-within:border-blue-500'}`}><Mail size={18} className={validationErrors.has('email') ? 'text-red-400' : 'text-gray-400 mr-2'}/><input ref={emailRef} onKeyDown={(e) => handleKeyDown(e, addressRef)} className="w-full py-3 bg-transparent outline-none text-gray-950 font-bold placeholder-gray-300" placeholder="Optional if Phone is added" value={formData.email || ''} onChange={e => { setFormData({...formData, email: e.target.value}); if (validationErrors.has('phone') || validationErrors.has('email')) { setValidationErrors(prev => { const n = new Set(prev); n.delete('phone'); n.delete('email'); return n; }); } }} /></div></div>
             <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Billing Address</label><div className="flex items-center border-b-2 border-gray-100 focus-within:border-blue-500 transition-colors bg-gray-50 rounded-t-xl px-3"><MapPin size={18} className="text-gray-400 mr-2"/><input ref={addressRef} onKeyDown={(e) => handleKeyDown(e, null, true)} className="w-full py-3 bg-transparent outline-none text-gray-950 font-bold placeholder-gray-300" placeholder="City, Area (Optional)" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} /></div></div>
             <div className="pt-2"><label className="flex items-center gap-4 p-4 border-2 border-gray-50 rounded-2xl cursor-pointer hover:bg-amber-50/30 hover:border-amber-100 transition-all group"><div className="relative flex items-center"><input type="checkbox" className="w-5 h-5 accent-amber-500" checked={!!formData.isWholesaler} onChange={(e) => setFormData({...formData, isWholesaler: e.target.checked})}/></div><div className="flex-1"><div className="font-black text-gray-900 text-sm flex items-center gap-2">Wholesale Tier <Star size={14} className="text-amber-500 fill-amber-500"/></div><div className="text-[10px] text-gray-500 font-bold uppercase">Enable wholesale rates automatically in POS</div></div></label></div>
             <div className="flex justify-end pt-4"><Button className="w-full py-4 font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 rounded-2xl" onClick={handleSave}>Save Contact</Button></div>
             <div className="flex justify-center pt-2 md:hidden"><div className="w-12 h-1 bg-gray-100 rounded-full"></div></div>
         </div>
      </Modal>
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Contact">
          <div className="text-center py-4"><div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div><h3 className="text-lg font-bold text-gray-900 mb-2">Delete {customerToDelete?.name}?</h3><p className="text-sm text-gray-500 mb-6 px-4">This will permanently remove this customer from your contacts.</p><div className="flex gap-3"><Button variant="neutral" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={confirmDelete}>Delete Contact</Button></div></div>
      </Modal>
      <Modal isOpen={showDuesError} onClose={() => setShowDuesError(false)} title="Cannot Delete Contact">
          <div className="text-center py-4"><div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div><h3 className="text-lg font-bold text-gray-900 mb-2">Outstanding Dues</h3><p className="text-sm text-gray-500 mb-6 px-4">{customerToDelete?.name} has outstanding dues of ₹{customerToDelete?.totalDues}. Please clear the dues before deleting.</p><Button className="w-full" onClick={() => setShowDuesError(false)}>Okay</Button></div>
      </Modal>
      <Modal isOpen={showPaymentModal} onClose={() => { setShowPaymentModal(false); window.history.back(); }} title="Record Payment">
          <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 text-center mb-2"><span className="text-[10px] text-emerald-600 uppercase font-black tracking-widest block mb-1">Unpaid Balance</span><span className="text-3xl font-black text-emerald-800">₹{selectedCustomer?.totalDues || 0}</span></div>
              <div className="flex flex-col gap-5">
                  <div className="bg-white border-2 border-gray-50 rounded-2xl p-4 shadow-sm">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Settlement Amount</label>
                      <div className="flex items-center relative"><span className="absolute left-4 text-emerald-600 font-black text-xl">₹</span><Input type="number" className="pl-10 text-2xl font-black !bg-white border-2 border-emerald-100 focus:border-emerald-500 shadow-sm !py-4 rounded-xl" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" onWheel={(e) => e.currentTarget.blur()}/></div>
                  </div>
                  <div className="bg-white border-2 border-gray-50 rounded-2xl p-4 shadow-sm">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Proof of Payment</label>
                      <input type="file" ref={receiptInputRef} onChange={handleReceiptUpload} className="hidden" accept="image/*"/>
                      <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => receiptInputRef.current?.click()} 
                            className={`w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed rounded-xl transition-all ${paymentReceipt ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-blue-400 hover:text-blue-500'}`}
                          >
                            {paymentReceipt ? <CheckCircle2 size={24}/> : <ImageIcon size={24}/>}
                            <span className="text-sm font-black uppercase tracking-wider">{paymentReceipt ? 'Receipt Captured' : 'Upload Receipt Proof'}</span>
                          </button>
                          {paymentReceipt && <div className="relative group w-24 h-24 mx-auto rounded-lg overflow-hidden border border-emerald-200 shadow-sm bg-gray-50 flex items-center justify-center"><img src={paymentReceipt} className="w-full h-full object-cover" alt="Preview" /><button onClick={() => setPaymentReceipt(null)} className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button></div>}
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Receipt Date</label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="rounded-xl border-2 border-gray-100"/></div>
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Payment Type</label><div className="relative"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border-2 border-gray-100 py-2.5 px-3 bg-gray-50 text-sm font-bold focus:outline-none focus:border-blue-500 appearance-none"><option value="Cash">Cash</option><option value="UPI">UPI / GPay</option><option value="Card">Bank Card</option></select><ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"/></div></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Note (Optional)</label><Input placeholder="e.g. Cleared full balance" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="rounded-xl border-2 border-gray-100"/></div>
              <div className="flex gap-3 pt-6 border-t border-gray-50"><Button variant="neutral" className="flex-1 py-4 font-bold border-2 border-gray-100" onClick={() => { setShowPaymentModal(false); window.history.back(); }} disabled={isProcessingPayment}>Discard</Button><Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-4 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-100 flex justify-center items-center gap-2" onClick={handleRecordPayment} disabled={isProcessingPayment}>{isProcessingPayment ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle2 size={18}/> Settle Dues</>}</Button></div>
          </div>
      </Modal>
      <Modal isOpen={!!viewingSale} onClose={() => { setViewingSale(null); window.history.back(); }} title="Transaction Summary">
        {viewingSale && (
            <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-gray-100 pb-4"><div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Document No.</p><p className="font-mono font-black text-gray-900 text-lg">#{viewingSale.id.slice(0,10).toUpperCase()}</p></div><div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Billing Date</p><p className="text-sm font-bold text-gray-950">{new Date(viewingSale.timestamp).toLocaleDateString()}</p></div></div>
                <div className="bg-gray-50 rounded-2xl p-4 max-h-60 overflow-y-auto border border-gray-100 shadow-inner"><div className="space-y-1">{viewingSale.items.map((item, idx) => (<div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200/50 last:border-0 text-sm"><div className="min-w-0 flex-1 pr-4"><span className="font-black text-gray-800 truncate block">{item.name}</span><div className="text-[10px] text-gray-500 font-bold uppercase">{item.quantity} {item.unit || 'pcs'} @ ₹{item.sellPrice.toFixed(0)}</div></div><span className="font-black text-gray-950 shrink-0">₹{(item.quantity * item.sellPrice).toFixed(0)}</span></div>))}</div></div>
                <div className="space-y-2 pt-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-100"><div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider"><span>Subtotal</span><span>₹{viewingSale.subtotal.toFixed(0)}</span></div><div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider"><span>Tax</span><span>₹{viewingSale.tax.toFixed(0)}</span></div><div className="flex justify-between text-xl font-black text-gray-950 border-t border-gray-200 pt-3 mt-2"><span>Total Paid</span><span className="text-emerald-600">₹{viewingSale.total.toFixed(0)}</span></div><div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2"><span>Method: {viewingSale.paymentMethod || 'Cash'}</span><span>Auth: Verified</span></div></div>
                <div className="flex gap-3 mt-4"><Button variant="neutral" className="flex-1 py-3 font-bold border-2 border-gray-200" onClick={() => { setViewingSale(null); window.history.back(); }}>Dismiss</Button><Button className="flex-1 flex items-center justify-center gap-3 py-3 font-black uppercase tracking-widest bg-gray-900 rounded-2xl shadow-xl shadow-gray-100 active:scale-95" onClick={() => generateInvoicePDF(viewingSale)}><Printer size={18}/> Print Bill</Button></div>
            </div>
        )}
      </Modal>

      <Modal isOpen={!!verifyingCustomer} onClose={() => { setVerifyingCustomer(null); }} title="Verify Customer Payment" className="!max-w-md bg-white border-2 border-amber-300 shadow-2xl !p-5">
        {verifyingCustomer && verifyingCustomer.pendingUpdates?.pendingPayment && (
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-100 text-center mb-2">
              <span className="text-[10px] text-amber-600 uppercase font-black tracking-widest block mb-1">Customer Submitted Payment</span>
              <span className="text-3xl font-black text-amber-800">₹{verifyingCustomer.pendingUpdates.pendingPayment.amount}</span>
            </div>
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase text-left">Customer Name:</span>
                <span className="font-extrabold text-slate-800 text-right">{verifyingCustomer.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase text-left">Phone:</span>
                <span className="font-mono text-slate-700 font-bold text-right">{verifyingCustomer.phone}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase text-left">Date Submitted:</span>
                <span className="font-bold text-slate-700 text-right">{verifyingCustomer.pendingUpdates.pendingPayment.date}</span>
              </div>
              {verifyingCustomer.pendingUpdates.pendingPayment.note && (
                <div className="pb-2 border-b border-slate-200 text-left">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">UTR / Ref Note:</span>
                  <p className="font-bold text-slate-800 bg-white p-2 rounded-lg border border-slate-100 break-all">{verifyingCustomer.pendingUpdates.pendingPayment.note}</p>
                </div>
              )}
              {verifyingCustomer.pendingUpdates.pendingPayment.receiptImage && (
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Receipt Screenshot:</span>
                  <div className="relative group w-full h-48 rounded-xl overflow-hidden border border-slate-300 bg-white flex items-center justify-center cursor-pointer" onClick={() => setZoomedReceipt(verifyingCustomer.pendingUpdates?.pendingPayment?.receiptImage || null)}>
                    <img src={verifyingCustomer.pendingUpdates.pendingPayment.receiptImage} className="w-full h-full object-contain bg-slate-100" alt="Receipt Screenshot" />
                    <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Eye size={18} className="mr-1.5" /> View Fullscreen
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 text-center py-1 font-semibold">
              Please open your UPI/Bank app first to confirm the credits match.
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={() => handleApprovePayment(verifyingCustomer)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider rounded-xl shadow-lg flex justify-center items-center gap-2"
              >
                <CheckCircle2 size={16} /> Approve & Clear Dues
              </Button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRejectPayment(verifyingCustomer)}
                  className="flex-1 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reject & Delete
                </button>
                <button 
                  onClick={() => setVerifyingCustomer(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Verify Later
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!zoomedReceipt} onClose={() => setZoomedReceipt(null)} title="Payment Receipt Proof" className="!max-w-2xl bg-black text-white !p-2">
        {zoomedReceipt && (
          <div className="flex flex-col items-center justify-center relative bg-black rounded-lg min-h-[300px]">
            <img src={zoomedReceipt} className="max-w-full max-h-[75vh] object-contain rounded-md" alt="Receipt Proof Fullscreen" />
            <button onClick={() => setZoomedReceipt(null)} className="absolute top-3 right-3 bg-white/25 hover:bg-white/40 text-white p-2 rounded-full transition-all cursor-pointer">
              <X size={20} />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
