import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Quote, Client, QuoteItem, Currency, QuoteStatus, Forwarder, ShippingType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  X, 
  Check, 
  FileText, 
  Search,
  AlertCircle,
  Edit,
  Send, 
  XOctagon, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { formatAr, formatCurrency, formatDate } from '../lib/utils';
import { fetchExchangeRates, ExchangeRates, convertToMGA } from '../services/rateService';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>(() => {
    return (localStorage.getItem('quotes_status_filter') as any) || 'SENT';
  });
  const [clientFilter, setClientFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'DATE' | 'CLIENT'>('DATE');

  // Inline confirmation states
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<string | null>(null);
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedForwarderId, setSelectedForwarderId] = useState('');
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [volume, setVolume] = useState<number | undefined>(undefined);
  const [shippingType, setShippingType] = useState<ShippingType>('AIR');
  const [item, setItem] = useState<QuoteItem>({ type: '', purchasePrice: undefined as any, currency: 'USD', salePriceMGA: undefined as any, profit: 0 });
  const [status, setStatus] = useState<QuoteStatus>('SENT');

  useEffect(() => {
    const unsubQuotes = onSnapshot(collection(db, 'quotes'), (snap) => {
      setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quotes');
    });
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    const unsubForwarders = onSnapshot(collection(db, 'forwarders'), (snap) => {
      setForwarders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Forwarder)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forwarders');
    });
    
    // Load last rates from settings or fetch new
    const loadRates = async () => {
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists() && settingsSnap.data().lastExchangeRates) {
        setRates(settingsSnap.data().lastExchangeRates as ExchangeRates);
      } else {
        const fetched = await fetchExchangeRates();
        if (fetched) setRates(fetched);
      }
    };
    loadRates();

    return () => {
      unsubQuotes();
      unsubClients();
    };
  }, []);

  const updateItemField = (field: keyof QuoteItem, value: any) => {
    const newItem = { ...item, [field]: value };
    
    // Auto calculate profit in MGA if rates are available
    if (rates && (field === 'purchasePrice' || field === 'salePriceMGA' || field === 'currency')) {
      const purchaseMGA = convertToMGA(Number(newItem.purchasePrice || 0), newItem.currency, rates);
      const saleMGA = Number(newItem.salePriceMGA || 0);
      newItem.profit = (saleMGA - purchaseMGA) || 0;
    }
    
    setItem(newItem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !item.type) return;

    try {
      const data = {
        clientId: selectedClientId,
        forwarderId: selectedForwarderId,
        weight: weight || 0,
        volume: volume || 0,
        shippingType,
        items: [item],
        status,
        totalProfit: item.profit,
        updatedAt: serverTimestamp(),
      };

      if (editingQuote) {
        await updateDoc(doc(db, 'quotes', editingQuote.id), data);
      } else {
        await addDoc(collection(db, 'quotes'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingQuote ? OperationType.UPDATE : OperationType.CREATE, 'quotes');
    }
  };

  const convertToOrder = async (quote: Quote) => {
    try {
      await addDoc(collection(db, 'orders'), {
        quoteId: quote.id,
        clientId: quote.clientId,
        forwarderId: quote.forwarderId || '',
        items: quote.items,
        status: 'PREPARATION',
        weight: quote.weight || 0,
        volume: quote.volume || 0,
        shippingType: quote.shippingType || 'SEA',
        shippingCostMGA: 0,
        totalToPayMGA: 0,
        deliveryFeeMGA: 0,
        eta: null,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'quotes', quote.id), { 
        status: 'ORDERED',
        updatedAt: serverTimestamp()
      });
      setConfirmOrder(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'quotes', id));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quotes/${id}`);
    }
  };


  const openModal = (quote?: Quote) => {
    if (quote) {
      setEditingQuote(quote);
      setSelectedClientId(quote.clientId);
      setSelectedForwarderId(quote.forwarderId || '');
      setWeight(quote.weight);
      setVolume(quote.volume);
      setShippingType(quote.shippingType || 'AIR');
      setItem(quote.items[0] || { type: '', purchasePrice: undefined as any, currency: 'USD', salePriceMGA: undefined as any, profit: 0 });
      setStatus(quote.status);
    } else {
      setEditingQuote(null);
      setSelectedClientId('');
      setSelectedForwarderId('');
      setWeight(undefined);
      setVolume(undefined);
      setShippingType('AIR');
      setItem({ type: '', purchasePrice: undefined as any, currency: 'USD', salePriceMGA: undefined as any, profit: 0 });
      setStatus('SENT');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuote(null);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Client Inconnu';

  const calculateEstimatedShipping = () => {
    let seaRate = 350;
    let airRate = 70000;
    let expressRate = 82500;

    if (selectedForwarderId) {
      const f = forwarders.find(f => f.id === selectedForwarderId);
      if (f) {
        seaRate = (f.seaRate && f.seaRate > 0) ? f.seaRate : seaRate;
        airRate = (f.airRate && f.airRate > 0) ? f.airRate : airRate;
        expressRate = (f.expressRate && f.expressRate > 0) ? f.expressRate : expressRate;
      }
    }

    const effectiveRates: ExchangeRates = rates || { USD: 4500, EUR: 4800, CNY: 630, MGA: 1 };

    if (shippingType === 'SEA') {
      return (volume || 0) * convertToMGA(seaRate, 'USD', effectiveRates);
    } else if (shippingType === 'AIR') {
      return (weight || 0) * airRate;
    } else if (shippingType === 'EXPRESS') {
      return (weight || 0) * expressRate;
    }
    return 0;
  };

  const filteredQuotes = quotes.filter(q => {
    const clientName = getClientName(q.clientId).toLowerCase();
    const productNames = (q.items || []).map(i => i.type.toLowerCase()).join(' ');
    const id = q.id.toLowerCase();
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = clientName.includes(search) || productNames.includes(search) || id.includes(search);
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesClient = clientFilter === 'ALL' || q.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  }).sort((a, b) => {
    if (sortBy === 'CLIENT') {
      const nameA = getClientName(a.clientId).toUpperCase();
      const nameB = getClientName(b.clientId).toUpperCase();
      return nameA.localeCompare(nameB);
    }
    // Default: Sort by date (descending)
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const statusColors = {
    SENT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    ORDERED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    REJECTED: 'bg-danger/10 text-danger border-danger/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white">DEVIS & FLUX</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">ESTIMATIONS ET VALIDATIONS COMMERCIALES</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 flex-wrap w-full xl:w-auto">
          <div className="industrial-card py-1 px-4 flex items-center gap-3 flex-grow md:flex-grow-0">
            <Search size={14} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="RECHERCHER..." 
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider w-full md:w-32"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="industrial-card py-1 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="ALL">TOUS LES CLIENTS</option>
            {clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
              <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
            ))}
          </select>

          <select 
            className="industrial-card py-1 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="DATE">TRIER PAR DATE</option>
            <option value="CLIENT">TRIER PAR CLIENT</option>
          </select>

          <select 
            className="industrial-card py-1 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value as any;
              setStatusFilter(val);
              localStorage.setItem('quotes_status_filter', val);
            }}
          >
            <option value="ALL">TOUS LES DEVIS</option>
            <option value="SENT">EN ATTENTE</option>
            <option value="ORDERED">VALIDÉS</option>
            <option value="REJECTED">REJETÉS</option>
          </select>
          <button onClick={() => openModal()} className="btn-accent flex items-center justify-center gap-2 w-full md:w-auto">
            <Plus size={18} />
            <span className="whitespace-nowrap">NOUVEAU DEVIS</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuotes.map((quote) => (
          <motion.div 
            key={quote.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="industrial-card group h-full flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-accent text-[13px] leading-tight uppercase truncate max-w-[200px]">
                  {quote.items.map(i => i.type).join(', ') || 'SANS PRODUIT'}
                </h3>
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px] font-bold text-white uppercase">{getClientName(quote.clientId)}</span>
                  <span className="text-[12px] text-gray-500 font-bold uppercase tracking-widest leading-none">ID: {quote.id.slice(0, 6)}</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded border text-[8px] font-black tracking-widest uppercase ${statusColors[quote.status]}`}>
                {quote.status}
              </div>
            </div>

            <div className="space-y-4 mt-auto">
              <div className="bg-black/20 p-3 rounded border border-white/5">
                <div className="flex justify-between items-end">
                  <div>
                    <label className="text-[8px] text-gray-500 block font-bold uppercase tracking-widest mb-1">PROFIT ESTIMÉ</label>
                    <p className="text-[17px] font-black text-emerald-500 mono">{formatAr(quote.totalProfit)}</p>
                    <div className="flex gap-4 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest">Vente</span>
                        <span className="text-[15px] font-bold text-white mono leading-none">
                          {formatAr(quote.items.reduce((acc, i) => acc + (i.salePriceMGA || 0), 0))}
                        </span>
                      </div>
                      <div className="flex flex-col border-l border-white/10 pl-3">
                        <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest">Achat</span>
                        <span className="text-[15px] font-bold text-gray-400 mono leading-none">
                          {rates ? formatAr(quote.items.reduce((acc, i) => acc + convertToMGA(i.purchasePrice || 0, i.currency, rates), 0)) : '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <FileText className="text-gray-700" size={24} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                <div className="flex gap-2 w-full justify-between">
                  <div className="flex items-center gap-2">
                    {quote.status !== 'ORDERED' && (
                      <button 
                        onClick={() => {
                          if (confirmOrder === quote.id) {
                            convertToOrder(quote);
                          } else {
                            setConfirmOrder(quote.id);
                            setTimeout(() => setConfirmOrder(null), 3000);
                          }
                        }}
                        className={`group/btn p-2 rounded border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 h-10 ${
                          confirmOrder === quote.id 
                            ? 'bg-emerald-500 text-white border-emerald-500' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {confirmOrder === quote.id ? (
                          <>
                            <Check size={14} className="animate-bounce" />
                            <span>CONFIRMER ?</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink size={14} />
                            <span>COMMANDER</span>
                          </>
                        )}
                      </button>
                    )}
                    <button onClick={() => openModal(quote)} className="h-10 w-10 flex items-center justify-center hover:bg-white/10 rounded border border-border-dim text-gray-400 shrink-0">
                      <Edit size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        if (confirmDelete === quote.id) {
                          handleDelete(quote.id);
                        } else {
                          setConfirmDelete(quote.id);
                          setTimeout(() => setConfirmDelete(null), 3000);
                        }
                      }} 
                      className={`h-10 flex items-center gap-2 px-3 rounded border transition-all ${
                        confirmDelete === quote.id 
                          ? 'bg-danger text-white border-danger shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                          : 'hover:bg-danger/10 border-danger/30 text-danger'
                      }`}
                    >
                      {confirmDelete === quote.id ? (
                        <>
                          <Check size={16} />
                          <span className="text-[10px] font-black uppercase">OUI ?</span>
                        </>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredQuotes.length > 0 && (
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Check className="text-accent" size={20} />
              SOMMAIRE TOTAL À PAYER (MGA)
            </h2>
            <div className="industrial-card py-2 px-6 border-emerald-500/50 bg-emerald-500/10">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">Total Profits en Cours</span>
              <span className="text-xl font-black text-emerald-500 mono">
                {formatAr(filteredQuotes.reduce((acc, q) => acc + (q.totalProfit || 0), 0))}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Array.from(new Set(filteredQuotes.map(q => q.clientId))) as string[]).map(clientId => {
              const clientQuotes = filteredQuotes.filter(q => q.clientId === clientId);
              const totalToPay = clientQuotes.reduce((acc, curr) => {
                const itemTotal = curr.items.reduce((iAcc, iCurr) => iAcc + (iCurr.salePriceMGA || 0), 0);
                return acc + itemTotal;
              }, 0);
              const clientProfit = clientQuotes.reduce((acc, q) => acc + (q.totalProfit || 0), 0);
              
              return (
                <div key={clientId} className="industrial-card p-4 border-l-2 border-l-accent shadow-[0_4px_20px_rgba(var(--accent-rgb),0.1)]">
                   <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-accent tracking-[0.2em] uppercase">{getClientName(clientId)}</span>
                    <span className="px-1.5 py-0.5 bg-accent/20 rounded text-[9px] font-bold text-accent">{clientQuotes.length} DEVIS</span>
                  </div>
                  <div className="text-lg font-black text-white mono leading-tight">{formatAr(totalToPay)}</div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex flex-col">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest leading-none">Profit Estimé</span>
                    <span className="text-[11px] font-black text-emerald-500 mono">{formatAr(clientProfit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="industrial-card w-full max-w-4xl shadow-2xl relative my-auto"
            style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="p-6 overflow-y-auto scrollbar-hide">
              <button 
                onClick={closeModal} 
                className="absolute top-4 right-4 text-gray-500 hover:text-white z-10 p-2"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl mb-6 text-white border-b border-border-dim pb-4 uppercase tracking-widest">
                {editingQuote ? 'Modification Devis' : 'Protocol Devis - Nouvel Article'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Sélectionner Client</label>
                    <select 
                      required
                      className="input-field appearance-none cursor-pointer w-full bg-card"
                      style={{ minHeight: '42px' }}
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                    >
                      <option value="">-- CHOISIR --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Transitaire</label>
                    <select 
                      className="input-field appearance-none cursor-pointer w-full bg-card"
                      style={{ minHeight: '42px' }}
                      value={selectedForwarderId}
                      onChange={e => setSelectedForwarderId(e.target.value)}
                    >
                      <option value="">-- DEFAULT / AUCUN --</option>
                      {forwarders.map(f => (
                        <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Statut Du Dossier</label>
                    <div className="flex gap-2">
                      {['SENT', 'ORDERED', 'REJECTED'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s as QuoteStatus)}
                          className={`flex-1 py-2 px-3 rounded border text-[10px] font-bold transition-all ${
                            status === s ? statusColors[s as keyof typeof statusColors] : 'bg-transparent border-border-dim text-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-accent/5 p-4 rounded border border-accent/20">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-accent font-black tracking-widest uppercase">Poids (Kg)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field border-accent/30 focus:border-accent"
                        value={weight ?? ''}
                        onChange={e => setWeight(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-accent font-black tracking-widest uppercase">Volume (m³)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        className="input-field border-accent/30 focus:border-accent"
                        value={volume ?? ''}
                        onChange={e => setVolume(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-accent font-black tracking-widest uppercase">Mode d'Envoi</label>
                      <select 
                        className="input-field border-accent/30 focus:border-accent appearance-none cursor-pointer w-full bg-card"
                        style={{ minHeight: '42px' }}
                        value={shippingType}
                        onChange={e => setShippingType(e.target.value as ShippingType)}
                      >
                        <option value="SEA">MARITIME</option>
                        <option value="AIR">NORMAL</option>
                        <option value="EXPRESS">EXPRESS</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-emerald-500 font-black tracking-widest uppercase">Estimation Logistique (MGA)</label>
                      <div className="bg-black/40 border border-emerald-500/30 rounded px-4 h-[42px] flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-bold tracking-widest hidden sm:inline">AUTO</span>
                        <span className="text-sm font-black text-emerald-500 mono">{formatAr(calculateEstimatedShipping())}</span>
                      </div>
                    </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-accent font-bold tracking-widest uppercase">Manifeste De L'Article</label>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white/5 p-4 rounded border border-white/10 group">
                      <div className="md:col-span-3 flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase">Type Article</label>
                        <input 
                          required
                          placeholder="Ex: Turbo, Plaquettes..." 
                          className="input-field py-1.5 px-3 text-xs" 
                          value={item.type}
                          onChange={e => updateItemField('type', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase">Achat</label>
                        <input 
                          type="number" 
                          className="input-field py-1.5 px-3 text-xs font-mono" 
                          value={item.purchasePrice ?? ''}
                          onChange={e => updateItemField('purchasePrice', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase">Devise</label>
                        <select 
                          className="input-field py-1.5 px-3 text-xs w-full bg-card"
                          value={item.currency}
                          onChange={e => updateItemField('currency', e.target.value as Currency)}
                        >
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                          <option value="CNY">CNY</option>
                          <option value="MGA">MGA</option>
                        </select>
                      </div>
                      <div className="md:col-span-3 flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold text-accent">Vente (MGA)</label>
                        <input 
                          type="number" 
                          className="input-field py-1.5 px-3 text-sm font-black mono text-white" 
                          value={item.salePriceMGA ?? ''}
                          onChange={e => updateItemField('salePriceMGA', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] text-gray-600 uppercase">Bénéfice (Ar)</label>
                        <div className="bg-bg border border-border-dim rounded py-1.5 px-3 text-xs font-mono text-emerald-500 h-[38px] flex items-center overflow-hidden">
                          {formatAr(item.profit || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-dim flex flex-col md:flex-row items-center justify-end gap-6">
                  <div className="flex gap-6 mr-auto">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Profit Estimé</p>
                      <p className="text-xl font-black text-emerald-500 mono">{formatAr(item.profit)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button type="button" onClick={closeModal} className="btn-outline flex-1 md:flex-none px-12 py-3">Fermer</button>
                    <button type="submit" className="btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 px-12 py-3">
                      <Send size={18} />
                      {editingQuote ? 'ACTUALISER' : 'VALIDER DEVIS'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Quotes;
