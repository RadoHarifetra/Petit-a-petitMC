import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Client } from '../types';
import { motion } from 'motion/react';
import { 
  Archive, 
  Search, 
  Trash2, 
  Check,
  Eye, 
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { formatAr, formatDate } from '../lib/utils';

const History: React.FC = () => {
  const [history, setHistory] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'COLLECTED'));
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
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

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'orders', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Client Inconnu';

  const filteredHistory = history.filter(h => {
    const clientName = getClientName(h.clientId).toLowerCase();
    const productNames = (h.items || []).map(i => i.type.toLowerCase()).join(' ');
    const id = h.id.toLowerCase();
    const tracking = (h.trackingNumber || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    return clientName.includes(search) || productNames.includes(search) || id.includes(search) || tracking.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">ARCHIVES & HISTORIQUE</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">REGISTRE DE TOUTES LES OPÉRATIONS PASSÉES</p>
        </div>
      </div>

      <div className="industrial-card p-0 overflow-hidden">
        <div className="p-4 border-b border-border-dim bg-white/5 flex items-center gap-3">
          <Search size={18} className="text-gray-500" />
          <input 
            type="text" 
            placeholder="RECHERCHER DANS L'HISTORIQUE (NOM, REF, TRACKING)..." 
            className="bg-transparent border-none outline-none text-sm w-full font-bold tracking-wider"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1c2128] text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Client / Mission</th>
                <th className="px-6 py-4">Détails Transport</th>
                <th className="px-6 py-4">Frais Logistique</th>
                <th className="px-6 py-4">Total à Payer (MGA)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim">
              {filteredHistory.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    {/* PROMINENCE PRODUIT */}
                    <div className="font-black text-accent uppercase text-sm leading-tight">
                      {(order.items || []).map(i => i.type).join(', ') || 'PRODUIT'}
                    </div>
                    <div className="text-[10px] text-white uppercase font-bold mt-1">CLIENT: {getClientName(order.clientId)}</div>
                    <div className="text-[10px] text-gray-600 mono flex items-center gap-2">
                       <Calendar size={10} /> {formatDate(order.collectedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase font-bold text-accent">{order.shippingType}</span>
                      <span className="text-[10px] text-gray-500 mono">Poids: {order.weight} KG</span>
                      <span className="text-[10px] text-gray-500 mono truncate max-w-[150px]">Ref: {order.trackingNumber || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-400 mono">{formatAr(order.totalToPayMGA)}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest">Incl. {formatAr(order.deliveryFeeMGA || 0)} Livr.</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const salePrice = order.items?.reduce((acc, i) => acc + (i.salePriceMGA || 0), 0) || 0;
                      const fees = order.totalToPayMGA || 0;
                      return (
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-emerald-500 mono">{formatAr(salePrice + fees)}</span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Vente: {formatAr(salePrice)}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleDelete(order.id)}
                        className={`p-2 rounded-md transition-all flex items-center gap-1 ${
                          confirmDeleteId === order.id 
                            ? 'bg-danger text-white' 
                            : 'hover:bg-danger/10 text-danger'
                        }`}
                      >
                        {confirmDeleteId === order.id ? (
                          <>
                            <Check size={16} />
                            <span className="text-[10px] font-black uppercase">OUI ?</span>
                          </>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredHistory.length === 0 && (
            <div className="p-12 text-center text-gray-500 uppercase tracking-widest text-xs">
              Aucune archive disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
