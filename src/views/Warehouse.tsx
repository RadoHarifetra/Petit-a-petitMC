import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  DollarSign, 
  Search,
  CheckCircle2,
  X,
  CreditCard,
  MapPin
} from 'lucide-react';
import { formatAr } from '../lib/utils';

const Warehouse: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)).filter(o => o.status === 'WAREHOUSE' || o.status === 'DELIVERED'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return () => { unsub(); unsubClients(); };
  }, []);

  const handleEncaisse = async () => {
    if (!selectedOrder) return;
    try {
      const feeNum = deliveryFee || 0;
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: 'COLLECTED',
        deliveryFeeMGA: feeNum,
        totalToPayMGA: (selectedOrder.shippingCostMGA || 0) + feeNum,
        collectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      closeModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${selectedOrder.id}`);
    }
  };

  const openModal = (order: Order) => {
    setSelectedOrder(order);
    setDeliveryFee(order.deliveryFeeMGA);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Client Inconnu';

  const filteredOrders = orders.filter(o => {
    const clientName = getClientName(o.clientId).toLowerCase();
    const productNames = (o.items || []).map(i => i.type.toLowerCase()).join(' ');
    const id = o.id.toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return clientName.includes(search) || productNames.includes(search) || id.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">RÉCUPÉRATION & ENCAISSEMENT</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">GESTION DES SORTIES D'ENTREPÔT</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="industrial-card py-1 px-4 flex items-center gap-3">
            <Search size={14} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="RECHERCHER..." 
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider w-full md:w-40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 && (
          <div className="industrial-card p-12 text-center text-gray-500 uppercase tracking-widest text-sm">
            Aucun résultat correspondant // En attente d'arrivages
          </div>
        )}
        {filteredOrders.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="industrial-card flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-emerald-500"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded flex items-center justify-center border border-emerald-500/20">
                <Package className="text-emerald-500" />
              </div>
              <div className="flex-1">
                {/* PROMINENCE PRODUIT */}
                <h3 className="font-black text-accent uppercase text-[13px] leading-tight break-words max-w-[300px]">
                  {(order.items || []).map(i => i.type).join(', ') || 'PRODUIT'}
                </h3>
                <div className="flex flex-wrap gap-4 mt-1">
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">CLIENT: {getClientName(order.clientId)}</span>
                  <span className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">REF: {order.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
              <div className="text-center md:text-right w-full md:w-auto">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Frais Logistiques</p>
                <p className="text-xl font-black text-white mono">{formatAr(order.shippingCostMGA || 0)}</p>
              </div>
              <button 
                onClick={() => openModal(order)}
                className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700"
              >
                <DollarSign size={18} />
                ENCAISSER
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredOrders.length > 0 && (
        <div className="mt-12 space-y-4">
          <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" size={20} />
            SOMMAIRE PAR CLIENT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.from(new Set(filteredOrders.map(o => o.clientId))) as string[]).map(clientId => {
              const clientOrders = filteredOrders.filter(o => o.clientId === clientId);
              const total = clientOrders.reduce((acc, curr) => acc + (curr.shippingCostMGA || 0), 0);
              return (
                <div key={clientId} className="industrial-card p-4 border-t-2 border-t-accent/50 bg-accent/5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-accent tracking-[0.2em] uppercase">{getClientName(clientId)}</span>
                    <span className="px-1.5 py-0.5 bg-accent/20 rounded text-[12px] font-bold text-accent">{clientOrders.length} ARTICLES</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Logistique</div>
                    <div className="text-lg font-black text-white mono">{formatAr(total)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="industrial-card w-full max-w-md shadow-2xl relative my-auto"
              style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="p-6 overflow-y-auto scrollbar-hide">
                <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white z-10 p-2">
                  <X size={20} />
                </button>

                <div className="mb-6 pb-4 border-b border-border-dim">
                  <h2 className="text-xl text-white uppercase tracking-widest">Facturation Finale</h2>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Mission ID: {selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                    <div className="flex items-center gap-3">
                      <CreditCard size={18} className="text-gray-400" />
                      <span className="text-xs uppercase font-bold text-gray-400">Frais de Transport</span>
                    </div>
                    <span className="text-sm font-bold text-white mono">{formatAr(selectedOrder.shippingCostMGA || 0)}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> Frais de Livraison Supplémentaires
                    </label>
                    <input 
                      type="number"
                      className="input-field w-full font-mono text-lg text-emerald-500"
                      value={deliveryFee ?? ''}
                      onChange={e => setDeliveryFee(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    />
                    <p className="text-[9px] text-gray-500 italic uppercase">Ex: Frais coursier ou frais de stockage</p>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Total à Percevoir</span>
                      <span className="text-2xl font-black text-emerald-500 mono">
                        {formatAr((selectedOrder.shippingCostMGA || 0) + (deliveryFee || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button onClick={closeModal} className="btn-outline flex-1 py-3">Annuler</button>
                    <button onClick={handleEncaisse} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3">
                      <CheckCircle2 size={18} />
                      CONFIRMER PAIEMENT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Warehouse;
