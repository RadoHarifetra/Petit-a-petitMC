import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X,
  DollarSign,
  Package,
  Plane
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Forwarder } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase';

const Forwarders: React.FC = () => {
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForwarder, setEditingForwarder] = useState<Forwarder | null>(null);
  const [formData, setFormData] = useState<Partial<Forwarder>>({
    name: '',
    seaRate: 0,
    airRate: 0,
    expressRate: 0
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'forwarders'), (snap) => {
      setForwarders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Forwarder)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forwarders');
    });
    return unsub;
  }, []);

  const openModal = (forwarder?: Forwarder) => {
    if (forwarder) {
      setEditingForwarder(forwarder);
      setFormData(forwarder);
    } else {
      setEditingForwarder(null);
      setFormData({ name: '', seaRate: 0, airRate: 0, expressRate: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingForwarder) {
        await updateDoc(doc(db, 'forwarders', editingForwarder.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'forwarders'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingForwarder ? OperationType.UPDATE : OperationType.CREATE, 'forwarders');
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000); // Reset after 3 seconds
      return;
    }

    try {
      await deleteDoc(doc(db, 'forwarders', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `forwarders/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">TRANSITAIRES & TARIFS</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">GESTION DES PARTENAIRES LOGISTIQUES</p>
        </div>
        <button onClick={() => openModal()} className="btn-accent flex items-center justify-center gap-2 w-full md:w-auto">
          <Plus size={18} /> NOUVEAU TRANSITAIRE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forwarders.map((f) => (
          <motion.div 
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="industrial-card group relative"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded border border-accent/30 text-accent">
                  <Truck size={20} />
                </div>
                <h3 className="font-black text-white uppercase tracking-tight">{f.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(f)} className="p-2 hover:bg-white/10 rounded text-gray-400">
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(f.id)} 
                  className={`p-2 rounded transition-all flex items-center gap-1 ${
                    confirmDeleteId === f.id 
                      ? 'bg-danger text-white' 
                      : 'hover:bg-danger/10 text-danger'
                  }`}
                  title={confirmDeleteId === f.id ? "Confirmer la suppression" : "Supprimer"}
                >
                  {confirmDeleteId === f.id ? (
                    <span className="text-[10px] font-black uppercase px-1">OUI ?</span>
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-white/5">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Maritime</span>
                </div>
                <div className="text-sm font-black text-white mono">{f.seaRate} <span className="text-[10px] text-gray-600">USD/m³</span></div>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-white/5">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-yellow-400" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Normal</span>
                </div>
                <div className="text-sm font-black text-white mono">{f.airRate.toLocaleString()} <span className="text-[10px] text-gray-600">Ar/Kg</span></div>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-white/5">
                <div className="flex items-center gap-2">
                  <Plane size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Express</span>
                </div>
                <div className="text-sm font-black text-white mono">{f.expressRate.toLocaleString()} <span className="text-[10px] text-gray-600">Ar/Kg</span></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="industrial-card w-full max-w-md p-8 border-accent/50"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {editingForwarder ? 'MODIFIER TRANSITAIRE' : 'NOUVEAU TRANSITAIRE'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nom du Transitaire</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    placeholder="E.G. CHRONO LINE"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Tarif Maritime (USD/m³)</label>
                    <input 
                      type="number" 
                      className="input-field font-mono" 
                      value={formData.seaRate}
                      onChange={e => setFormData({ ...formData, seaRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Tarif Normal (Ar/Kg)</label>
                    <input 
                      type="number" 
                      className="input-field font-mono" 
                      value={formData.airRate}
                      onChange={e => setFormData({ ...formData, airRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tarif Express (Ar/Kg)</label>
                    <input 
                      type="number" 
                      className="input-field font-mono" 
                      value={formData.expressRate}
                      onChange={e => setFormData({ ...formData, expressRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline flex-1">
                    ANNULER
                  </button>
                  <button type="submit" className="btn-accent flex-1 flex items-center justify-center gap-2">
                    <Save size={18} />
                    ENREGISTRER
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Forwarders;
