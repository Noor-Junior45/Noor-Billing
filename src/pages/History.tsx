import React, { useState, useEffect, useMemo } from 'react';
import { Sale, StoreSettings, Tab } from '../types';
import { StoreService } from '../services/storeService';
import { generateInvoicePDF } from '../services/pdfService';
import { Button, Input, Modal } from '../components/UI';
import {
  List as ListIcon,
  LayoutGrid,
  CheckSquare,
  Square,
  ChevronRight,
  Edit3,
  Printer,
  Banknote,
  User,
  Save,
  Trash2,
  Star,
  RotateCcw
} from 'lucide-react';

interface HistoryProps {
  currentUser?: any;
  closeHistory: () => void;
  recentSales: Sale[];
  loadData: () => Promise<void>;
  settings: StoreSettings;
}

export const History: React.FC<HistoryProps> = ({
  currentUser,
  closeHistory,
  recentSales,
  loadData,
  settings
}) => {
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuesError, setShowDuesError] = useState(false);
  const [historyLayout, setHistoryLayout] = useState<'list' | 'grid'>('list');
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null);

  // Edit Sale State
  const [isEditingSale, setIsEditingSale] = useState(false);
  const [editingSaleData, setEditingSaleData] = useState<Sale | null>(null);
  const [showEditWarning, setShowEditWarning] = useState(false);

  // Return / Exchange Flow State
  const [isReturning, setIsReturning] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [selectedReturnIndices, setSelectedReturnIndices] = useState<Set<number>>(new Set());
  const [returnRefundMethod, setReturnRefundMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Adjust Balance'>('Cash');

  const startReturnFlow = (sale: Sale) => {
    setIsReturning(true);
    setReturnRefundMethod(sale.customerId ? 'Adjust Balance' : 'Cash');
    setSelectedReturnIndices(new Set());
    const initialQuants: Record<number, number> = {};
    sale.items.forEach((item, index) => {
      initialQuants[index] = item.quantity;
    });
    setReturnQuantities(initialQuants);
  };

  // Filter sales based on user permissions
  const displayedSales = useMemo(() => {
    if (!currentUser) return recentSales;
    if (currentUser.role === 'admin') {
      return recentSales;
    } else {
      return recentSales.filter(sale =>
        sale.userId === currentUser.id ||
        sale.servedBy === currentUser.name ||
        (sale.servedBy && sale.servedBy.toLowerCase() === currentUser.name.toLowerCase()) ||
        (sale.servedBy && sale.servedBy.toLowerCase() === currentUser.username.toLowerCase())
      );
    }
  }, [recentSales, currentUser]);

  // Handle navigation pop
  useEffect(() => {
    const handleNavigationPop = (e: any) => {
      if (isReturning) {
        setIsReturning(false);
        return;
      }
      if (isEditingSale) {
        setIsEditingSale(false);
        return;
      }
      if (saleDetail) {
        setSaleDetail(null);
        return;
      }
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return;
      }
      if (showDuesError) {
        setShowDuesError(false);
        return;
      }
      if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedSales(new Set());
        return;
      }
    };

    window.addEventListener('app-navigation-pop' as any, handleNavigationPop);
    return () => window.removeEventListener('app-navigation-pop' as any, handleNavigationPop);
  }, [isReturning, isEditingSale, saleDetail, showDeleteConfirm, showDuesError, isSelectionMode]);

  const toggleSaleSelection = (id: string) => {
    const newSet = new Set(selectedSales);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSales(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSales.size === displayedSales.length) setSelectedSales(new Set());
    else setSelectedSales(new Set(displayedSales.map(s => s.id)));
  };

  const handleDeleteCheck = () => {
    const selectedItems = displayedSales.filter(s => selectedSales.has(s.id));
    const hasDues = selectedItems.some(s => {
      const paid = s.amountPaid !== undefined ? s.amountPaid : (s.paymentMethod === 'Pay Later' ? 0 : s.total);
      return (s.total - paid) > 1;
    });
    window.history.pushState({ tab: Tab.POS, depth: 2 }, '');
    if (hasDues) setShowDuesError(true);
    else setShowDeleteConfirm(true);
  };

  const deleteSelectedSales = async () => {
    if (selectedSales.size === 0) return;
    await StoreService.deleteSales(Array.from(selectedSales));
    setSelectedSales(new Set());
    setIsSelectionMode(false);
    setShowDeleteConfirm(false);
    window.history.back();
    loadData();
  };

  const initiateEditSale = () => {
    if (!saleDetail) return;
    const paid = saleDetail.amountPaid !== undefined ? saleDetail.amountPaid : (saleDetail.paymentMethod === 'Pay Later' ? 0 : saleDetail.total);
    const isDue = (saleDetail.total - paid) > 1;
    if (isDue) setShowEditWarning(true);
    else openEditModal();
  };

  const openEditModal = () => {
    if (!saleDetail) return;
    setShowEditWarning(false);
    setEditingSaleData(JSON.parse(JSON.stringify(saleDetail)));
    setIsEditingSale(true);
    setSaleDetail(null);
  };

  const saveEditedSale = async () => {
    if (!editingSaleData) return;
    await StoreService.updateSale(editingSaleData);
    setIsEditingSale(false);
    setEditingSaleData(null);
    window.history.back();
    loadData();
  };

  return (
    <div className="bg-[#F9FAFB] min-h-screen animate-in slide-in-from-right-10 flex flex-col">
      <div className="sticky top-0 bg-[#F9FAFB] border-b border-slate-200 z-10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">History</h1>
            <p className="text-xs text-gray-500">
              {isSelectionMode ? `${selectedSales.size} Selected` : 'Recent Transactions'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {!isSelectionMode && (
            <>
              <button
                onClick={() => setHistoryLayout('list')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                  historyLayout === 'list'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                    : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-500'
                }`}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
              <button
                onClick={() => setHistoryLayout('grid')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                  historyLayout === 'grid'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                    : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-500'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
            </>
          )}
          {isSelectionMode ? (
            <>
              <Button
                size="sm"
                variant="neutral"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedSales(new Set());
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={selectedSales.size === 0}
                onClick={handleDeleteCheck}
              >
                Delete ({selectedSales.size})
              </Button>
            </>
          ) : (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-sm"
              title="Select Sales"
            >
              <Trash2 size={18} className="text-red-600" />
            </button>
          )}
        </div>
      </div>
      {isSelectionMode && (
        <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 border-b border-gray-100 sticky top-[73px] z-10">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer"
          >
            {selectedSales.size === displayedSales.length && displayedSales.length > 0 ? (
              <CheckSquare size={20} className="text-blue-600" />
            ) : (
              <Square size={20} className="text-gray-400" />
            )}{' '}
            Select All
          </button>
        </div>
      )}
      <div className={`${historyLayout === 'grid' ? 'grid grid-cols-2 gap-3 p-4' : 'p-4 space-y-3'} pb-24`}>
        {displayedSales.map(sale => {
          const isSelected = selectedSales.has(sale.id);
          const paid = sale.amountPaid !== undefined ? sale.amountPaid : (sale.paymentMethod === 'Pay Later' ? 0 : sale.total);
          const balance = sale.total - paid;
          const isDue = balance > 1;
          const handleInteraction = () => {
            if (isSelectionMode) toggleSaleSelection(sale.id);
            else {
              window.history.pushState({ tab: Tab.POS, depth: 2 }, '');
              setSaleDetail(sale);
            }
          };
          return (
            <div
              key={sale.id}
              onClick={handleInteraction}
              className={`relative p-5 rounded-xl border shadow-sm transition-all flex gap-3 select-none ${
                isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-100 hover:shadow-md active:scale-[0.98]'
              } ${isDue ? 'border-red-100 bg-red-50/10' : ''} cursor-pointer`}
            >
              {isSelectionMode && (
                <div className="shrink-0 flex items-center justify-center pt-1">
                  {isSelected ? <CheckSquare size={24} className="text-blue-600" /> : <Square size={24} className="text-gray-300" />}
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg text-gray-800">{sale.customerName}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">#{sale.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-xl ${isDue ? 'text-red-600' : 'text-gray-900'}`}>
                      ₹{sale.total.toFixed(2)}
                    </div>
                    {isDue ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                          Unpaid
                        </span>
                        <span className="text-xs font-bold text-red-500 mt-1">Due: ₹{balance.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        {sale.paidAt ? (
                          <>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              Paid
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 mt-1">Paid: {new Date(sale.paidAt).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">{new Date(sale.timestamp).toLocaleDateString()}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-center">
                  <div className="text-sm text-gray-500">{sale.items.length} Items</div>
                  {!isSelectionMode && (
                    <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
                      View Details <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          window.history.back();
        }}
        title="Confirm Deletion"
      >
        <div className="text-center py-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {selectedSales.size} Records?</h3>
          <div className="flex gap-3 mt-6">
            <Button
              variant="neutral"
              className="flex-1"
              onClick={() => {
                setShowDeleteConfirm(false);
                window.history.back();
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={deleteSelectedSales}>
              Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!saleDetail}
        onClose={() => {
          setSaleDetail(null);
          setIsReturning(false);
          window.history.back();
        }}
        title={isReturning ? "Process Return / Exchange" : "Sale Details"}
        className={isReturning ? "!max-w-xl bg-white border-2 border-slate-300 shadow-2xl !p-4" : "!max-w-lg bg-white border-2 border-slate-300 shadow-2xl !p-4"}
      >
        {saleDetail && (
          isReturning ? (
            <div className="animate-in fade-in zoom-in-95 space-y-4 text-left">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-left">
                <div className="flex items-center gap-2 text-red-700 font-black text-sm uppercase tracking-wider mb-1">
                  <RotateCcw size={16} /> Return Mode
                </div>
                <div className="text-xs text-red-600 font-bold">
                  Selecting items will create a return transaction. Products will be automatically restocked, and customer balance will be updated.
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto bg-slate-50 p-3 rounded-xl border-2 border-slate-200 text-left">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Select Items to Return</span>
                {saleDetail.items.map((item, idx) => {
                  const isChecked = selectedReturnIndices.has(idx);
                  const returnQty = returnQuantities[idx] || 0;
                  const itemPrice = item.customPrice ?? item.sellPrice;
                  // Proportional discount
                  const originalQty = item.quantity;
                  const propDisc = originalQty > 0 ? ((item.discount || 0) * (returnQty / originalQty)) : 0;
                  const rowRefund = (itemPrice * returnQty) - propDisc;

                  return (
                    <div key={idx} className={`p-3 rounded-lg border-2 bg-white transition-all ${isChecked ? 'border-red-400 bg-red-50/20' : 'border-slate-100'}`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const newSet = new Set(selectedReturnIndices);
                              if (newSet.has(idx)) newSet.delete(idx);
                              else newSet.add(idx);
                              setSelectedReturnIndices(newSet);
                            }}
                            className="w-4.5 h-4.5 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-black text-slate-800 block">{item.name}</span>
                            <span className="text-[10px] font-bold text-slate-400">Sold Quantity: {item.quantity} {item.unit || 'pcs'} @ ₹{itemPrice.toFixed(2)}</span>
                          </div>
                        </label>
                        <span className="text-xs font-black text-slate-950">₹{rowRefund.toFixed(2)}</span>
                      </div>

                      {isChecked && (
                        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-dashed border-slate-200">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Return Qty:</span>
                          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                            <button
                              type="button"
                              disabled={returnQty <= 1}
                              onClick={() => setReturnQuantities(prev => ({ ...prev, [idx]: Math.max(1, returnQty - 1) }))}
                              className="w-7 h-7 font-black text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-200 flex items-center justify-center disabled:opacity-45 cursor-pointer active:scale-95"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-slate-800 w-6 text-center">{returnQty}</span>
                            <button
                              type="button"
                              disabled={returnQty >= item.quantity}
                              onClick={() => setReturnQuantities(prev => ({ ...prev, [idx]: Math.min(item.quantity, returnQty + 1) }))}
                              className="w-7 h-7 font-black text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-200 flex items-center justify-center disabled:opacity-45 cursor-pointer active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Refund Method Selection */}
              <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 text-left">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Refund Method</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['Cash', 'UPI', 'Card', 'Adjust Balance'] as const).map(method => {
                    const isDisabled = method === 'Adjust Balance' && !saleDetail.customerId;
                    const isSelected = returnRefundMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setReturnRefundMethod(method)}
                        className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-lg border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${isDisabled ? 'opacity-30 pointer-events-none' : isSelected ? 'bg-red-600 border-red-600 text-white shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <span>{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Refund Total Calculation */}
              {(() => {
                let refundSubtotal = 0;
                let refundDiscount = 0;
                let refundTax = 0;
                selectedReturnIndices.forEach(idx => {
                  const item = saleDetail.items[idx];
                  const returnQty = returnQuantities[idx] || 0;
                  const itemPrice = item.customPrice ?? item.sellPrice;
                  const originalQty = item.quantity;
                  const propDisc = originalQty > 0 ? ((item.discount || 0) * (returnQty / originalQty)) : 0;
                  refundSubtotal += itemPrice * returnQty;
                  refundDiscount += propDisc;
                  const taxRate = item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== 0 
                    ? item.taxRate 
                    : (settings?.taxRateDefault ?? 0);
                  refundTax += (itemPrice * returnQty) * (taxRate / 100);
                });
                const refundNetTotal = refundSubtotal - refundDiscount + refundTax;

                return (
                  <div className="bg-slate-900 border-2 border-slate-950 text-white p-4 rounded-2xl flex justify-between items-center text-left">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Estimated Refund Total</span>
                      <span className="text-2xl font-black text-red-400">₹{refundNetTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="neutral"
                        onClick={() => setIsReturning(false)}
                        className="!bg-white/10 hover:!bg-white/20 text-white border-white/20 !px-4"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={selectedReturnIndices.size === 0}
                        onClick={async () => {
                          if (selectedReturnIndices.size === 0) return;
                          
                          const returnedItemsMapped = Array.from(selectedReturnIndices).map(idx => {
                            const item = saleDetail.items[idx];
                            const returnQty = returnQuantities[idx] || 0;
                            const itemPrice = item.customPrice ?? item.sellPrice;
                            const originalQty = item.quantity;
                            const propDisc = originalQty > 0 ? ((item.discount || 0) * (returnQty / originalQty)) : 0;
                            return {
                              ...item,
                              quantity: -returnQty, // negative qty for restocking!
                              discount: -propDisc
                            };
                          });

                          const returnSalePayload = {
                            customerId: saleDetail.customerId,
                            customerName: saleDetail.customerName + ' (Return)',
                            items: returnedItemsMapped,
                            subtotal: -refundSubtotal,
                            tax: -refundTax,
                            total: -refundNetTotal,
                            amountPaid: returnRefundMethod === 'Adjust Balance' ? 0 : -refundNetTotal,
                            paymentMethod: returnRefundMethod === 'Adjust Balance' ? 'Pay Later' : returnRefundMethod,
                            servedBy: currentUser?.name || 'Staff'
                          };

                          await StoreService.createSale(returnSalePayload);
                          setIsReturning(false);
                          setSaleDetail(null);
                          window.history.back();
                          loadData();
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 disabled:opacity-40"
                      >
                        Confirm Return
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4 text-left">
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase mb-1">Customer</div>
                  <div className="text-lg font-bold text-gray-900">{saleDetail.customerName}</div>
                  <div className="text-sm text-gray-500 mt-1">{new Date(saleDetail.timestamp).toLocaleString()}</div>
                  {(() => {
                    const paid = saleDetail.amountPaid !== undefined ? saleDetail.amountPaid : (saleDetail.paymentMethod === 'Pay Later' ? 0 : saleDetail.total);
                    const balance = saleDetail.total - paid;
                    const isDue = balance > 1;
                    return isDue ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 uppercase tracking-wider">
                        Unpaid (Due: ₹{balance.toFixed(2)})
                      </div>
                    ) : saleDetail.paidAt ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 uppercase tracking-wider">
                        Paid on {new Date(saleDetail.paidAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 uppercase tracking-wider">
                        Paid
                      </div>
                    );
                  })()}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 font-bold uppercase mb-1">Total</div>
                  <div className="text-2xl font-extrabold text-gray-800">₹{saleDetail.total.toFixed(2)}</div>
                </div>
              </div>
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200 text-left">
                {saleDetail.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                    <span>
                      {item.name} <span className="text-gray-400 text-xs">x{item.quantity}</span>
                    </span>
                    <span className="font-bold text-gray-700">
                      ₹{((item.sellPrice * item.quantity) - (item.discount || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="neutral"
                  onClick={initiateEditSale}
                  className="flex items-center justify-center gap-1.5 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 text-xs py-2"
                >
                  <Edit3 size={15} /> Edit
                </Button>
                {saleDetail.total > 0 && (
                  <Button
                    variant="neutral"
                    onClick={() => startReturnFlow(saleDetail)}
                    className="flex items-center justify-center gap-1.5 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 text-xs py-2"
                  >
                    <RotateCcw size={15} /> Return
                  </Button>
                )}
                <Button className="flex items-center justify-center gap-1.5 text-xs py-2" onClick={() => generateInvoicePDF(saleDetail)}>
                  <Printer size={15} /> Print
                </Button>
              </div>
            </div>
          )
        )}
      </Modal>

      <Modal
        isOpen={isEditingSale}
        onClose={() => {
          setIsEditingSale(false);
          window.history.back();
        }}
        title="Edit Transaction"
        className="!max-w-3xl !p-0 overflow-hidden border-0 shadow-2xl bg-white"
      >
        {editingSaleData && (
          <div className="animate-in fade-in flex flex-col h-full">
            <div className="bg-indigo-600 px-6 py-5 text-white">
              <div className="flex items-center gap-2 text-indigo-100 text-[10px] font-extrabold uppercase tracking-widest mb-1">
                <Edit3 size={12} /> Editing Record
              </div>
              <h2 className="text-xl font-bold"># {editingSaleData.id.slice(0, 12).toUpperCase()}</h2>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                  <label className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block mb-2">
                    Billing Customer
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <User size={20} />
                    </div>
                    <Input
                      value={editingSaleData.customerName}
                      onChange={e => setEditingSaleData({ ...editingSaleData, customerName: e.target.value })}
                      className="!bg-white !border-blue-200 !py-2 !px-3 font-bold"
                      placeholder="Customer Name"
                    />
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-100">
                  <label className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest block mb-2">
                    Original Method
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0">
                      <Banknote size={20} />
                    </div>
                    <select
                      className="w-full rounded-lg px-3 py-2 bg-white border-2 border-purple-200 text-gray-900 font-bold focus:outline-none focus:border-purple-500 appearance-none"
                      value={editingSaleData.paymentMethod}
                      onChange={e => setEditingSaleData({ ...editingSaleData, paymentMethod: e.target.value })}
                    >
                      {['Cash', 'UPI', 'Card', 'Pay Later'].map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-green-600 p-5 rounded-2xl text-white shadow-lg shadow-green-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-extrabold text-green-100 uppercase tracking-widest">Amount Paid</div>
                </div>
                <div className="flex items-center bg-white rounded-xl px-4 py-2 w-full md:w-48 shadow-inner">
                  <span className="text-green-600 font-black text-xl mr-2">₹</span>
                  <input
                    type="number"
                    className="w-full outline-none font-black text-green-700 text-2xl bg-transparent"
                    value={editingSaleData.amountPaid ?? editingSaleData.total}
                    onChange={e =>
                      setEditingSaleData({ ...editingSaleData, amountPaid: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <Button
                variant="neutral"
                onClick={() => {
                  setIsEditingSale(false);
                  window.history.back();
                }}
                className="flex-1 !py-4 font-bold border-2 border-gray-200 text-gray-500 hover:bg-white"
              >
                Discard
              </Button>
              <Button
                onClick={saveEditedSale}
                className="flex-1 !py-4 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} /> Save Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Warning Modals */}
      <Modal
        isOpen={showDuesError}
        onClose={() => {
          setShowDuesError(false);
          window.history.back();
        }}
        title="Action Restricted"
      >
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-4">
            Cannot delete records with pending dues. Please clear dues first in CRM.
          </p>
          <Button
            variant="neutral"
            onClick={() => {
              setShowDuesError(false);
              window.history.back();
            }}
          >
            Okay
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showEditWarning}
        onClose={() => {
          setShowEditWarning(false);
          window.history.back();
        }}
        title="Warning"
      >
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-4">
            Editing a record with pending dues might affect customer balance records. Proceed anyway?
          </p>
          <div className="flex gap-3 mt-6">
            <Button
              variant="neutral"
              className="flex-1"
              onClick={() => {
                setShowEditWarning(false);
                window.history.back();
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={openEditModal}>
              Proceed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
