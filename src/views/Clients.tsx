import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Search, Edit2, Trash2, X, Check } from 'lucide-react';
import { formatDate } from '../lib/utils';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', labels: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        labels: formData.labels.split(',').map(l => l.trim()).filter(l => l),
        updatedAt: serverTimestamp(),
      };

      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), data);
      } else {
        await addDoc(collection(db, 'clients'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingClient ? OperationType.UPDATE : OperationType.CREATE, 'clients');
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
      await deleteDoc(doc(db, 'clients', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        labels: (client.labels || []).join(', '),
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', labels: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ name: '', email: '', phone: '', labels: '' });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">GESTION CLIENTS</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">BASE DE DONNÉES CENTRALISÉE</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto">
          <UserPlus size={18} /> NOUVEAU CLIENT
        </button>
      </div>

      <div className="industrial-card p-0 overflow-hidden">
        <div className="p-4 border-b border-border-dim bg-white/5 flex items-center gap-3">
          <Search size={18} className="text-gray-500" />
          <input 
            type="text" 
            placeholder="RECHERCHER UN CLIENT..." 
            className="bg-transparent border-none outline-none text-sm w-full font-bold tracking-wider"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1c2128] text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Nom / ID</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Labels</th>
                <th className="px-6 py-4">Inscrit le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white uppercase">{client.name}</div>
                    <div className="text-[10px] text-gray-500 mono">ID:{client.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">{client.email || 'N/A'}</div>
                    <div className="text-xs text-gray-500 mono">{client.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {client.labels.map((l, i) => (
                        <span key={i} className="px-2 py-0.5 bg-accent/10 border border-accent/30 text-accent rounded text-[10px] font-bold uppercase">
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 mono text-xs text-gray-400">
                    {formatDate(client.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(client)} className="p-2 hover:bg-white/10 rounded-md text-gray-400 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)} 
                        className={`p-2 rounded-md transition-all flex items-center gap-1 ${
                          confirmDeleteId === client.id 
                            ? 'bg-danger text-white' 
                            : 'hover:bg-danger/10 text-danger'
                        }`}
                        title={confirmDeleteId === client.id ? "Confirmer la suppression" : "Supprimer"}
                      >
                        {confirmDeleteId === client.id ? (
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
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-gray-500 uppercase tracking-widest text-xs">
              Aucun client trouvé dans les archives
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="industrial-card w-full max-w-lg shadow-2xl relative"
            >
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                <X size={20} />
              </button>
              
              <h2 className="text-xl mb-6 text-white border-b border-border-dim pb-4 uppercase tracking-widest">
                {editingClient ? 'Modifier Mission Profil' : 'Enrôlement Nouveau Client'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Nom complet</label>
                  <input 
                    required 
                    className="input-field" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Email</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Téléphone</label>
                    <input 
                      className="input-field" 
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Labels (Séparés par des virgules)</label>
                  <input 
                    className="input-field" 
                    placeholder="VIP, Pièces Auto, Industriel" 
                    value={formData.labels}
                    onChange={e => setFormData({ ...formData, labels: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeModal} className="btn-outline flex-1">Annuler</button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Check size={18} />
                    {editingClient ? 'METTRE À JOUR' : 'ENREGISTRER'}
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

export default Clients;
