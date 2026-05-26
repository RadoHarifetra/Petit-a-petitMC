import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Client, ShippingType, OrderStatus, QuoteItem, Currency } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  Package, 
  Clock, 
  MapPin, 
  Edit2, 
  Save, 
  RefreshCw,
  Search,
  X,
  Check,
  ChevronRight,
  TrendingUp,
  Info,
  Plus,
  ArrowRight,
  Filter
} from 'lucide-react';
import { formatAr, formatDate } from '../lib/utils';
import { ExchangeRates, convertToMGA } from '../services/rateService';
import { addDays } from 'date-fns';

const Tracking: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [forwarders, setForwarders] = useState<any[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [logisticsRates, setLogisticsRates] = useState({ sea: 350, air: 70000, express: 82500 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [forwarderFilter, setForwarderFilter] = useState('ALL');
  const [shippingTypeFilter, setShippingTypeFilter] = useState<'ALL' | ShippingType>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'ETA' | 'CLIENT'>('ETA');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Inline status update state
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, { status: OrderStatus; loading: boolean }>>({});
  const [arrivalDateModal, setArrivalDateModal] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [formData, setFormData] = useState({
    trackingNumber: '',
    forwarderId: '',
    clientId: '',
    weight: undefined as number | undefined,
    volume: undefined as number | undefined,
    shippingType: 'SEA' as ShippingType,
    status: 'PREPARATION' as OrderStatus,
    sentAt: '',
    itemName: '',
  });

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)).filter(o => o.status !== 'COLLECTED'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    const unsubForwarders = onSnapshot(collection(db, 'forwarders'), (snap) => {
      setForwarders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forwarders');
    });
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    const loadSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.lastExchangeRates) setRates(data.lastExchangeRates);
        setLogisticsRates({
          sea: data.seaRate || 350,
          air: data.airRatePerKg || 70000,
          express: data.expressRatePerKg || 82500
        });
      }
    };
    loadSettings();

    return () => {
      unsubOrders();
      unsubClients();
      unsubForwarders();
    };
  }, []);

  const calculateShipping = (type: ShippingType, weight: number, volume: number, forwarderId?: string): number => {
    // Determine rates to use
    let currentSea = logisticsRates.sea;
    let currentAir = logisticsRates.air;
    let currentExpress = logisticsRates.express;

    if (forwarderId) {
      const f = forwarders.find(f => f.id === forwarderId);
      if (f) {
        // Use forwarder rates if they are defined and non-zero, otherwise fallback to global
        currentSea = (f.seaRate && f.seaRate > 0) ? f.seaRate : currentSea;
        currentAir = (f.airRate && f.airRate > 0) ? f.airRate : currentAir;
        currentExpress = (f.expressRate && f.expressRate > 0) ? f.expressRate : currentExpress;
      }
    }

    // Default rates if rates are not yet loaded (approximate)
    const effectiveRates: ExchangeRates = rates || { USD: 4500, EUR: 4800, CNY: 630, MGA: 1 };

    if (type === 'SEA') {
      return (volume || 0) * convertToMGA(currentSea, 'USD', effectiveRates);
    } else if (type === 'AIR') {
      return (weight || 0) * currentAir;
    } else if (type === 'EXPRESS') {
      return (weight || 0) * currentExpress;
    }
    return 0;
  };

  const getETA = (sentAt: any, type: ShippingType): Date => {
    const start = sentAt ? (sentAt.toDate ? sentAt.toDate() : new Date(sentAt)) : new Date();
    const days = type === 'SEA' ? 60 : type === 'AIR' ? 15 : 3;
    return addDays(start, days);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const weightNum = formData.weight || 0;
      const volumeNum = formData.volume || 0;
      const shippingCostMGA = calculateShipping(formData.shippingType, weightNum, volumeNum, formData.forwarderId);
      const eta = getETA(formData.sentAt ? new Date(formData.sentAt) : null, formData.shippingType);
      
      const updateData: any = {
        trackingNumber: formData.trackingNumber,
        forwarderId: formData.forwarderId,
        clientId: formData.clientId,
        weight: weightNum,
        volume: volumeNum,
        shippingType: formData.shippingType,
        status: formData.status,
        shippingCostMGA,
        totalToPayMGA: shippingCostMGA, 
        eta,
        updatedAt: serverTimestamp(),
      };

      if (formData.sentAt) updateData.sentAt = new Date(formData.sentAt);

      if (editingOrder) {
        if (formData.status === 'WAREHOUSE' && editingOrder.status !== 'WAREHOUSE') {
          updateData.arrivedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'orders', editingOrder.id), updateData);
      } else {
        // Direct order entry
        const newItem: QuoteItem = {
          type: formData.itemName || 'ARTICLE DIRECT',
          purchasePrice: 0,
          currency: 'USD',
          salePriceMGA: 0,
          profit: 0
        };
        await addDoc(collection(db, 'orders'), {
          ...updateData,
          items: [newItem],
          deliveryFeeMGA: 0,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingOrder ? OperationType.UPDATE : OperationType.CREATE, editingOrder ? `orders/${editingOrder.id}` : 'orders');
    }
  };

  const openAdd = () => {
    setEditingOrder(null);
    setFormData({
      trackingNumber: '',
      forwarderId: '',
      clientId: '',
      weight: undefined,
      volume: undefined,
      shippingType: 'SEA',
      status: 'PREPARATION',
      sentAt: new Date().toISOString().split('T')[0],
      itemName: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      trackingNumber: order.trackingNumber || '',
      forwarderId: order.forwarderId || '',
      clientId: order.clientId || '',
      weight: order.weight,
      volume: order.volume,
      shippingType: order.shippingType || 'SEA',
      status: order.status || 'PREPARATION',
      sentAt: order.sentAt ? (order.sentAt.toDate ? order.sentAt.toDate().toISOString().split('T')[0] : new Date(order.sentAt).toISOString().split('T')[0]) : '',
      itemName: order.items?.[0]?.type || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Client Inconnu';

  const statusInfo = {
    PREPARATION: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    TRANSIT: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    WAREHOUSE: { icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    DELIVERED: { icon: Check, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  };

  const handleQuickStatusUpdate = async (orderId: string) => {
    const update = updatingStatus[orderId];
    if (!update) return;

    if (update.status === 'WAREHOUSE') {
      setArrivalDateModal(orderId);
      return;
    }

    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: { ...update, loading: true } }));
      const updateData: any = {
        status: update.status,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'orders', orderId), updateData);
      setUpdatingStatus(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const confirmArrival = async () => {
    if (!arrivalDateModal) return;
    const orderId = arrivalDateModal;
    const update = updatingStatus[orderId];

    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: { ...update, loading: true } }));
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'WAREHOUSE',
        arrivedAt: new Date(arrivalDate),
        updatedAt: serverTimestamp(),
      });
      setArrivalDateModal(null);
      setUpdatingStatus(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const filteredOrders = orders.filter(o => {
    const clientName = getClientName(o.clientId).toLowerCase();
    const productNames = (o.items || []).map(i => i.type.toLowerCase()).join(' ');
    const id = o.id.toLowerCase();
    const search = searchTerm.toLowerCase();
    
    // Si le statut est Arrivé entrepot, elle doit disparaitre du SUIVI LOGISTIQUE
    if (o.status === 'WAREHOUSE') return false;

    const matchesSearch = clientName.includes(search) || productNames.includes(search) || id.includes(search);
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesClient = clientFilter === 'ALL' || o.clientId === clientFilter;
    const matchesForwarder = forwarderFilter === 'ALL' || o.forwarderId === forwarderFilter;
    const matchesType = shippingTypeFilter === 'ALL' || o.shippingType === shippingTypeFilter;
    
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      if (!o.sentAt) {
        matchesDate = false;
      } else {
        const d = o.sentAt.toDate ? o.sentAt.toDate() : new Date(o.sentAt);
        const oDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        if (startDateFilter && oDate < startDateFilter) matchesDate = false;
        if (endDateFilter && oDate > endDateFilter) matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesClient && matchesForwarder && matchesType && matchesDate;
  }).sort((a, b) => {
    if (sortBy === 'CLIENT') {
      const nameA = getClientName(a.clientId).toUpperCase();
      const nameB = getClientName(b.clientId).toUpperCase();
      return nameA.localeCompare(nameB);
    }
    const dateA = a.eta ? (a.eta.toDate ? a.eta.toDate() : new Date(a.eta)) : new Date(8640000000000000);
    const dateB = b.eta ? (b.eta.toDate ? b.eta.toDate() : new Date(b.eta)) : new Date(8640000000000000);
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate detailed summary per client
  const detailedClientSummary = filteredOrders.reduce((acc, order) => {
    const fees = calculateShipping(order.shippingType, order.weight || 0, order.volume || 0, order.forwarderId);
    if (!acc[order.clientId]) {
      acc[order.clientId] = { fees: 0, weight: 0, packages: 0 };
    }
    acc[order.clientId].fees += fees;
    acc[order.clientId].weight += (order.weight || 0);
    acc[order.clientId].packages += 1;
    return acc;
  }, {} as Record<string, { fees: number; weight: number; packages: number }>);

  const summaryValues = Object.values(detailedClientSummary) as { fees: number; weight: number; packages: number }[];
  const globalSummary = {
     totalFees: summaryValues.reduce((sum, c) => sum + c.fees, 0),
     totalWeight: summaryValues.reduce((sum, c) => sum + c.weight, 0),
     totalPackages: summaryValues.reduce((sum, c) => sum + c.packages, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white">SUIVI LOGISTIQUE</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">MONITORING DES FLUX INTERNATIONAUX</p>
        </div>

        <div className="flex flex-col gap-3 w-full xl:w-auto">
          {/* Main search and filter toggle for mobile screens */}
          <div className="flex items-center gap-2 w-full">
            <div className="industrial-card py-2 px-4 flex items-center gap-3 flex-1">
              <Search size={14} className="text-gray-500 shrink-0" />
              <input 
                type="text" 
                placeholder="RECHERCHER ACCESSOIRE, CLIENT..." 
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-white shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Mobile Filters Toggle Button */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`xl:hidden px-4 py-2 rounded border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                [
                  clientFilter !== 'ALL',
                  forwarderFilter !== 'ALL',
                  shippingTypeFilter !== 'ALL',
                  statusFilter !== 'ALL',
                  !!startDateFilter,
                  !!endDateFilter,
                ].filter(Boolean).length > 0 
                  ? 'border-accent/50 bg-accent/5 text-accent hover:bg-accent/10' 
                  : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
              style={{ minHeight: '38px' }}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">FILTRES</span>
              {[
                clientFilter !== 'ALL',
                forwarderFilter !== 'ALL',
                shippingTypeFilter !== 'ALL',
                statusFilter !== 'ALL',
                !!startDateFilter,
                !!endDateFilter,
              ].filter(Boolean).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-accent text-[8px] font-bold flex items-center justify-center text-white shrink-0">
                  {[
                    clientFilter !== 'ALL',
                    forwarderFilter !== 'ALL',
                    shippingTypeFilter !== 'ALL',
                    statusFilter !== 'ALL',
                    !!startDateFilter,
                    !!endDateFilter,
                  ].filter(Boolean).length}
                </span>
              )}
            </button>

            <button onClick={openAdd} className="xl:hidden btn-accent flex items-center justify-center p-2 shrink-0" style={{ minHeight: '38px', width: '38px' }}>
              <Plus size={18} />
            </button>
          </div>

          {/* Collapsible Mobile Filters Panel / Desktop Row */}
          <div className={`${showMobileFilters ? 'flex' : 'hidden'} xl:flex flex-col md:flex-row gap-3 flex-wrap w-full xl:w-auto`}>
            <select 
              className="industrial-card py-2 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="ALL">TOUS LES CLIENTS</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
              ))}
            </select>
            
            <select 
              className="industrial-card py-2 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
              value={forwarderFilter}
              onChange={(e) => setForwarderFilter(e.target.value)}
            >
              <option value="ALL">TOUTS LES TRANSITAIRES</option>
              {forwarders.map(f => (
                <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
              ))}
            </select>

            <select 
              className="industrial-card py-2 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
              value={shippingTypeFilter}
              onChange={(e) => setShippingTypeFilter(e.target.value as any)}
            >
              <option value="ALL">TOUS LES MODES</option>
              <option value="SEA">MARITIME</option>
              <option value="AIR">NORMAL</option>
              <option value="EXPRESS">EXPRESS</option>
            </select>

            <div className="industrial-card py-2 px-3 flex flex-wrap items-center gap-2 flex-grow md:flex-grow-0 justify-between">
              <span className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">DU</span>
              <input 
                type="date" 
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-white [-webkit-calendar-picker-indicator]:filter [-webkit-calendar-picker-indicator]:invert w-[95px] sm:w-auto"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
              <span className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">AU</span>
              <input 
                type="date" 
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-white [-webkit-calendar-picker-indicator]:filter [-webkit-calendar-picker-indicator]:invert w-[95px] sm:w-auto"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
              {(startDateFilter || endDateFilter) && (
                <button 
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                  className="ml-1 text-gray-500 hover:text-white transition-colors p-0.5"
                  title="Effacer les dates"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <select 
              className="industrial-card py-2 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="ETA">TRIER PAR ARRIVÉE</option>
              <option value="CLIENT">TRIER PAR CLIENT</option>
            </select>

            <select 
              className="industrial-card py-2 px-4 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer flex-grow md:flex-grow-0"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">TOUS LES STATUTS</option>
              <option value="PREPARATION">PRÉPARATION</option>
              <option value="TRANSIT">TRANSIT</option>
            </select>

            <button onClick={openAdd} className="hidden xl:flex btn-accent items-center justify-center gap-2">
              <Plus size={18} />
              <span className="whitespace-nowrap">NOUVEAU FLUX</span>
            </button>
          </div>
        </div>
      </div>



      <div className="flex flex-col gap-3">
        {filteredOrders.map((order) => {
          const SIcon = statusInfo[order.status as keyof typeof statusInfo]?.icon || Info;
          const currentUpdate = updatingStatus[order.id];
          
          return (
            <motion.div 
              key={order.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="industrial-card group relative overflow-hidden p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Vertical Progress Bar on the left */}
              <div className="absolute top-0 left-0 w-1 bg-accent/20 h-full">
                <div 
                  className="w-full bg-accent transition-all duration-1000" 
                  style={{ height: order.status === 'PREPARATION' ? '25%' : order.status === 'TRANSIT' ? '70%' : '100%' }}
                />
              </div>

              {/* Icon & Primary Product Description */}
              <div className="flex items-center gap-4 flex-1 lg:ml-2">
                <div className={`p-3 rounded shrink-0 ${statusInfo[order.status as keyof typeof statusInfo]?.bg} ${statusInfo[order.status as keyof typeof statusInfo]?.color}`}>
                  <SIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-accent uppercase text-[15px] leading-tight truncate">
                    {(order.items || []).map(i => i.type).join(', ') || 'SANS PRODUIT'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-bold tracking-widest uppercase">
                    <span className="text-white">CLIENT: {getClientName(order.clientId)}</span>
                    <span className="text-gray-500">REF: {order.id.slice(0, 8)}</span>
                    <span className="text-accent">{order.weight} KG</span>
                  </div>
                </div>
              </div>

              {/* Mobile Spec Info Block (Hidden on desktop, perfectly readable on mobile) */}
              <div className="lg:hidden w-full grid grid-cols-2 gap-3 p-3 bg-white/5 rounded border border-white/5 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-500 text-[8px] tracking-widest">ENVOI / ETA</span>
                  <span className="text-white font-mono">{formatDate(order.sentAt)} ➔ {formatDate(order.eta)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-emerald-500 text-[8px] tracking-widest">FRAIS ESTIMÉS</span>
                  <span className="text-emerald-500 font-mono">
                    {formatAr(calculateShipping(order.shippingType, order.weight, order.volume || 0, order.forwarderId))}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-gray-500 text-[8px] tracking-widest">TRANSITAIRE</span>
                  <span className="text-gray-300 font-mono">
                    {forwarders.find(f => f.id === order.forwarderId)?.name || 'NON ASSIGNÉ'}
                  </span>
                </div>
              </div>

              {/* Desktop layout for values/actions OR mobile bottom row for buttons */}
              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
                {/* Desktop columns */}
                <div className="hidden lg:flex flex-col gap-1 min-w-[120px]">
                  <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Envoi / ETA</span>
                  <span className="text-xs font-bold text-white mono leading-none">{formatDate(order.sentAt)}</span>
                  <span className="text-[10px] font-bold text-gray-400 mono leading-none mt-1">Arr: {formatDate(order.eta)}</span>
                </div>

                <div className="hidden lg:flex flex-col gap-1 min-w-[120px]">
                  <span className="text-[9px] text-emerald-500 uppercase font-black tracking-widest">Frais</span>
                  <span className="text-sm font-bold text-emerald-500 mono leading-none">{formatAr(calculateShipping(order.shippingType, order.weight, order.volume || 0, order.forwarderId))}</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase truncate max-w-[100px] mt-1">{forwarders.find(f => f.id === order.forwarderId)?.name || 'NON ASSIGNÉ'}</span>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
                  <div className="flex items-center gap-2 bg-white/5 p-1.5 border border-white/10 rounded flex-1 lg:flex-initial justify-between">
                    <select 
                      className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase cursor-pointer"
                      value={currentUpdate?.status || order.status}
                      onChange={(e) => setUpdatingStatus(prev => ({ 
                        ...prev, 
                        [order.id]: { status: e.target.value as OrderStatus, loading: false } 
                      }))}
                    >
                      <option value="PREPARATION">PRÉPARATION</option>
                      <option value="TRANSIT">EN TRANSIT</option>
                      <option value="WAREHOUSE">ARR. ENTREPÔT</option>
                    </select>
                    <AnimatePresence>
                      {(currentUpdate && currentUpdate.status !== order.status) && (
                        <motion.button 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={() => handleQuickStatusUpdate(order.id)}
                          disabled={currentUpdate.loading}
                          className="px-2 py-1 bg-accent text-white rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0"
                        >
                        {currentUpdate.loading ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={() => openEdit(order)} className="p-2 hover:bg-white/10 rounded text-gray-400 shrink-0">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* NEW BOTTOM RECAP SUMMARY */}
      {filteredOrders.length > 0 && (
        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Check className="text-accent" size={20} />
              RÉCAPITULATIF DES FLUX AFFICHÉS
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-4 lg:gap-6 w-full lg:w-auto">
              <div className="flex flex-col text-left lg:text-right bg-white/5 p-3 rounded lg:bg-transparent lg:p-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Colis / Articles</span>
                <span className="text-xl font-black text-white mono">{globalSummary.totalPackages}</span>
              </div>
              <div className="flex flex-col text-left lg:text-right bg-white/5 p-3 rounded lg:bg-transparent lg:p-0">
                <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Poids Total</span>
                <span className="text-xl font-black text-accent mono">{globalSummary.totalWeight.toFixed(2)} KG</span>
              </div>
              <div className="flex flex-col text-left lg:text-right bg-white/5 p-3 rounded lg:bg-transparent lg:p-0 col-span-2 sm:col-span-1 lg:pl-6 lg:border-l lg:border-white/10">
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Total Frais Estimés</span>
                <span className="text-2xl font-black text-emerald-500 mono leading-none">{formatAr(globalSummary.totalFees)}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(detailedClientSummary).map(([clientId, info]: [string, any]) => (
              <div key={clientId} className="industrial-card p-4 border-l-2 border-l-emerald-500/50 bg-emerald-500/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{getClientName(clientId)}</span>
                  <span className="px-1.5 py-0.5 bg-accent/20 rounded text-[9px] font-bold text-accent">{info.packages} COLIS</span>
                </div>
                <div className="text-lg font-black text-emerald-500 mono leading-tight">{formatAr(info.fees)}</div>
                <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Poids: {info.weight.toFixed(2)} KG</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto pt-20">
            <div className="industrial-card w-full max-w-lg shadow-2xl relative my-auto"
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
                  {editingOrder ? 'Mise à Jour Logistique' : 'Entrée Directe Logistique'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!editingOrder && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Client</label>
                        <select 
                          required
                          className="input-field cursor-pointer bg-card w-full" 
                          style={{ minHeight: '42px' }}
                          value={formData.clientId}
                          onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                        >
                          <option value="">-- SÉLECTIONNER CLIENT --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Nom de l'Article / Dossier</label>
                        <input 
                          required
                          placeholder="Ex: Pièces Mercedes..."
                          className="input-field" 
                          value={formData.itemName}
                          onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Numéro de Suivi</label>
                      <input 
                        className="input-field" 
                        value={formData.trackingNumber}
                        onChange={e => setFormData({ ...formData, trackingNumber: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Transitaire</label>
                      <select 
                        className="input-field cursor-pointer bg-card w-full" 
                        style={{ minHeight: '42px' }}
                        value={formData.forwarderId}
                        onChange={e => setFormData({ ...formData, forwarderId: e.target.value })}
                      >
                        <option value="">-- AUCUN / DEFAULT --</option>
                        {forwarders.map(f => (
                          <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-accent font-black uppercase">Poids (KG)</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="input-field font-mono border-accent/30" 
                        value={formData.weight ?? ''}
                        onChange={e => setFormData({ ...formData, weight: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-accent font-black uppercase">Volume (m³)</label>
                      <input 
                        type="number"
                        step="0.001"
                        className="input-field font-mono border-accent/30" 
                        value={formData.volume ?? ''}
                        onChange={e => setFormData({ ...formData, volume: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Mode d'Envoi</label>
                      <select 
                        className="input-field cursor-pointer bg-card w-full"
                        style={{ minHeight: '42px' }}
                        value={formData.shippingType}
                        onChange={e => setFormData({ ...formData, shippingType: e.target.value as ShippingType })}
                      >
                        <option value="SEA">MARITIME</option>
                        <option value="AIR">NORMAL</option>
                        <option value="EXPRESS">EXPRESS</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Statut Mission</label>
                      <select 
                        className="input-field cursor-pointer bg-card w-full"
                        style={{ minHeight: '42px' }}
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                      >
                        <option value="PREPARATION">PRÉPARATION</option>
                        <option value="TRANSIT">EN TRANSIT</option>
                        <option value="WAREHOUSE">ARRIVÉ ENTREPÔT</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Date de Départ</label>
                    <input 
                      type="date"
                      className="input-field" 
                      value={formData.sentAt}
                      onChange={e => setFormData({ ...formData, sentAt: e.target.value })}
                    />
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Frais Estimé</span>
                    <span className="text-lg font-black text-emerald-500 mono">{formatAr(calculateShipping(formData.shippingType, formData.weight || 0, formData.volume || 0, formData.forwarderId))}</span>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={closeModal} className="btn-outline flex-1 py-3">Fermer</button>
                    <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                      <Save size={18} />
                      {editingOrder ? 'ACTUALISER' : 'CRÉER DANS FLUX'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {arrivalDateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="industrial-card max-w-sm w-full p-8 space-y-6 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 ring-4 ring-emerald-500/10">
                <Package size={32} />
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">DATE D'ARRIVÉE</h3>
                <p className="text-gray-400 text-xs mt-2 uppercase font-bold tracking-widest">
                  INDIQUEZ LA RÉCEPTION EN ENTREPÔT
                </p>
              </div>

              <div className="space-y-4">
                <input 
                  type="date" 
                  className="input-field w-full"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setArrivalDateModal(null)}
                    className="btn-outline py-3"
                  >
                    ANNULER
                  </button>
                  <button 
                    onClick={confirmArrival}
                    className="bg-emerald-500 text-white py-3 rounded font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    VALIDER
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tracking;
