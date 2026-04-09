import CloudinaryUpload from "./CloudinaryUpload";
import React, { useState, useEffect } from "react";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  onSnapshot, query, where, writeBatch 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Trash2, Edit2, X, Save, ChevronRight, LayoutDashboard, 
  Calendar, ShoppingBag, Users, Image as ImageIcon, BarChart3, 
  ArrowLeft, Bell, Check, Phone, Bike, Package, Wallet,
  GripVertical, ArrowUpRight, ArrowDownRight, Handshake
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import { useMemo } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';

function SortableItem({ id, children, disabled }: { id: any; children: React.ReactNode; disabled?: boolean; key?: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "z-50" : ""}>
      <div className="flex items-center gap-2">
        {!disabled && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

type EntityType = 'agenda' | 'shop' | 'bikers' | 'events' | 'stats' | 'registrations' | 'orders' | 'treasury' | 'partners';

interface EntityConfig {
  id: EntityType;
  label: string;
  icon: any;
  fields?: { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'time'; options?: string[] }[];
  readOnly?: boolean;
}

const formatMGA = (value: any) => {
  if (value === null || value === undefined || value === '') return '0 Ar';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : Number(value);
  if (isNaN(num)) return String(value || '0');
  return new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(num).replace('MGA', 'Ar');
};

const configs: EntityConfig[] = [
  {
    id: 'agenda',
    label: 'Agenda',
    icon: Calendar,
    fields: [
      { name: 'title', label: 'Titre', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time', label: 'Heure', type: 'time' },
      { name: 'location', label: 'Lieu', type: 'text' },
      { name: 'distance', label: 'Distance A/R (KM)', type: 'number' },
      { name: 'paf', label: 'PAF (Ar)', type: 'number' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'image', label: 'URL Image', type: 'text' }
    ]
  },
  {
    id: 'partners',
    label: 'Partenaires',
    icon: Handshake,
    fields: [
      { name: 'name', label: 'Nom', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'logo', label: 'URL Logo', type: 'text' }
    ]
  },
  {
    id: 'shop',
    label: 'Boutique',
    icon: ShoppingBag,
    fields: [
      { name: 'name', label: 'Nom', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'price', label: 'Prix (Ar)', type: 'number' },
      { name: 'type', label: 'Catégorie', type: 'select', options: ['Équipement', 'Accessoires', 'Vêtements', 'Moto', 'Pièce'] },
      { name: 'image', label: 'URL Image', type: 'text' }
    ]
  },
  {
    id: 'bikers',
    label: 'Bikers',
    icon: Users,
    fields: [
      { name: 'name', label: 'Nom', type: 'text' },
      { name: 'role', label: 'Rôle', type: 'text' },
      { name: 'image', label: 'URL Photo', type: 'text' },
      { name: 'bike', label: 'Moto', type: 'text' },
      { name: 'quote', label: 'Citation', type: 'textarea' }
    ]
  },
  {
    id: 'events',
    label: 'Events',
    icon: ImageIcon,
    fields: [
      { name: 'title', label: 'Titre', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'images', label: 'URLs Images (séparées par des virgules)', type: 'textarea' }
    ]
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: BarChart3,
    fields: [
      { name: 'label', label: 'Libellé', type: 'text' },
      { name: 'value', label: 'Valeur', type: 'text' }
    ]
  },
  {
    id: 'registrations',
    label: 'Inscriptions',
    icon: Bell,
    readOnly: true
  },
  {
    id: 'orders',
    label: 'Commandes',
    icon: Package,
    readOnly: true
  },
  {
    id: 'treasury',
    label: 'Trésorerie',
    icon: Wallet,
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: ['Cotisation', 'Entrée', 'Sortie'] },
      { name: 'amount', label: 'Montant (Ar)', type: 'number' },
      { name: 'description', label: 'Description / Libellé', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'memberName', label: 'Membre (si Cotisation)', type: 'select', options: [] } // Options will be filled dynamically
    ]
  }
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<EntityType>('agenda');
  const [items, setItems] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [bikerCount, setBikerCount] = useState(0);
  const [bikersList, setBikersList] = useState<string[]>([]);
  const [allTreasury, setAllTreasury] = useState<any[]>([]);
  const [notifications, setNotifications] = useState({ registrations: 0, orders: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeBikers = onSnapshot(collection(db, "bikers"), (snapshot) => {
      setBikerCount(snapshot.size);
      setBikersList(snapshot.docs.map(doc => doc.data().name).sort());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "bikers");
    });

    const unsubscribeTreasury = onSnapshot(collection(db, "treasury"), (snapshot) => {
      setAllTreasury(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "treasury");
    });

    const qReg = query(collection(db, "registrations"), where("status", "==", "new"));
    const unsubscribeReg = onSnapshot(qReg, (snapshot) => {
      setNotifications(prev => ({ ...prev, registrations: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "registrations");
    });

    const qOrd = query(collection(db, "orders"), where("status", "==", "new"));
    const unsubscribeOrd = onSnapshot(qOrd, (snapshot) => {
      setNotifications(prev => ({ ...prev, orders: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "orders");
    });

    return () => {
      unsubscribeBikers();
      unsubscribeTreasury();
      unsubscribeReg();
      unsubscribeOrd();
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/");
      } else {
        setAuthChecked(true);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authChecked || bikerCount === 0) return;
    
    const checkAndCreateStat = async () => {
      const statsRef = collection(db, "stats");
      const q = query(statsRef, where("label", "==", "Membres actifs"));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        try {
          await addDoc(statsRef, {
            label: "Membres actifs",
            value: bikerCount.toString(),
            suffix: "+"
          });
        } catch (e) {
          console.error("Error creating Membres actifs stat in Admin:", e);
        }
      }
    };
    
    checkAndCreateStat();
  }, [authChecked, bikerCount]);

  useEffect(() => {
    setFormData({});
    setIsEditing(null);
    setConfirmDeleteId(null);
  }, [activeTab]);

  useEffect(() => {
    if (!authChecked) return;
    const unsubscribe = onSnapshot(collection(db, activeTab), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, activeTab);
    });
    return () => unsubscribe();
  }, [activeTab, authChecked]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (activeTab === 'registrations' || activeTab === 'orders') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (activeTab === 'treasury') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (activeTab === 'bikers' || activeTab === 'agenda' || activeTab === 'partners') {
        return (Number(a.order) || 999) - (Number(b.order) || 999);
      }
      return 0;
    });
  }, [items, activeTab]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
      const newIndex = sortedItems.findIndex((i) => i.id === over.id);
      const newOrder = arrayMove(sortedItems, oldIndex, newIndex);
      
      try {
        const batch = writeBatch(db);
        newOrder.forEach((item: any, index: number) => {
          const docRef = doc(db, activeTab, item.id);
          batch.update(docRef, { order: index + 1 });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, activeTab);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id, ...data } = formData;
      if (activeTab === 'events' && typeof data.images === 'string') {
        data.images = data.images.split(',').map((s: string) => s.trim());
      }
      
      if (activeTab === 'treasury') {
        data.amount = Number(data.amount || 0);
      }

      if ((activeTab === 'bikers' || activeTab === 'agenda' || activeTab === 'partners') && !isEditing) {
        data.order = items.length + 1;
      }
      
      if (activeTab === 'shop' && data.price) {
        data.price = String(data.price);
      }

      if (activeTab === 'agenda') {
        if (data.distance === "" || data.distance === undefined) {
          delete data.distance;
        } else {
          data.distance = Number(data.distance);
        }
        
        if (data.paf === "" || data.paf === undefined) {
          delete data.paf;
        } else {
          data.paf = Number(data.paf);
        }
      }

      if (isEditing) {
        await updateDoc(doc(db, activeTab, isEditing), data);
      } else {
        await addDoc(collection(db, activeTab), data);
      }
      setFormData({});
      setIsEditing(null);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, activeTab);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, activeTab, id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, activeTab);
    }
  };

  const treasuryStats = React.useMemo(() => {
    const income = allTreasury
      .filter(t => t.type === 'Entrée' || t.type === 'Cotisation')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expenses = allTreasury
      .filter(t => t.type === 'Sortie')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [allTreasury]);

  const memberDues = React.useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return bikersList.map(name => {
      const paid = allTreasury.some(t => 
        t.type === 'Cotisation' && 
        t.memberName === name && 
        t.date.startsWith(currentYear)
      );
      return { name, paid };
    });
  }, [bikersList, allTreasury]);

  const startEdit = (item: any) => {
    setIsEditing(item.id);
    const editData = { ...item };
    if (activeTab === 'events' && Array.isArray(editData.images)) {
      editData.images = editData.images.join(', ');
    }
    setFormData(editData);
  };

  const currentConfig = configs.find(c => c.id === activeTab)!;

  const exportRegistrationsToExcel = () => {
    const dataToExport = items.map(item => ({
      'Date': new Date(item.createdAt).toLocaleString('fr-FR'),
      'Nom': item.name,
      'Contact': item.contact,
      'Moto': item.bike,
      'Événement': item.eventTitle,
      'Statut': item.status === 'new' ? 'Nouveau' : 'Lu'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscriptions");
    XLSX.writeFile(workbook, `Inscriptions_Bikers_Club_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportTreasuryReportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      { 'Libellé': 'Total Entrées (Ar)', 'Valeur': treasuryStats.income },
      { 'Libellé': 'Total Sorties (Ar)', 'Valeur': treasuryStats.expenses },
      { 'Libellé': 'Solde Actuel (Ar)', 'Valeur': treasuryStats.balance },
      { 'Libellé': 'Date du Rapport', 'Valeur': new Date().toLocaleString('fr-FR') }
    ];
    const summaryWS = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWS, "Résumé");

    // 2. Transactions Sheet
    const transactionsData = [...allTreasury].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => ({
      'Date': t.date,
      'Type': t.type,
      'Description': t.description,
      'Montant (Ar)': t.amount,
      'Membre': t.memberName || '-'
    }));
    const transactionsWS = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(workbook, transactionsWS, "Transactions");

    // 3. Dues Sheet
    const duesData = memberDues.map(due => ({
      'Membre': due.name,
      'Statut': due.paid ? 'Payé' : 'En retard',
      'Année': new Date().getFullYear()
    }));
    const duesWS = XLSX.utils.json_to_sheet(duesData);
    XLSX.utils.book_append_sheet(workbook, duesWS, "Cotisations");

    XLSX.writeFile(workbook, `Rapport_Tresorerie_Bikers_Club_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, activeTab, id), { status: 'read' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, activeTab);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-3xl uppercase tracking-tight">Tableau de Bord Admin</h2>
              <p className="text-gray-500 text-sm">Gérez le contenu de votre site</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/")} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </button>
        </div>

        {/* Horizontal Menu */}
        <div className="flex flex-wrap md:flex-nowrap md:overflow-x-auto pb-4 mb-12 gap-2 no-scrollbar">
          {configs.map((config) => (
            <button
              key={config.id}
              onClick={() => {
                setActiveTab(config.id);
                setIsEditing(null);
                setFormData({});
              }}
              className={`relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${
                activeTab === config.id 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <config.icon className="w-5 h-5" />
              <span className="font-medium">{config.label}</span>
              {(config.id === 'registrations' || config.id === 'orders') && notifications[config.id] > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#050505] animate-pulse">
                  {notifications[config.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-12">
          <div className={`grid grid-cols-1 ${currentConfig.readOnly ? '' : 'lg:grid-cols-2'} gap-16`}>
            {/* Form */}
            {!currentConfig.readOnly && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  {isEditing ? <Edit2 className="w-6 h-6 text-red-500" /> : <Plus className="w-6 h-6 text-red-500" />}
                  {isEditing ? "Modifier" : (activeTab === 'stats' ? "Modifier" : "Ajouter")} {currentConfig.label}
                </h3>
                {isEditing && (
                  <button 
                    onClick={() => { setIsEditing(null); setFormData({}); }}
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Annuler
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
                {currentConfig.fields?.map((field) => {
                  const isAutoStat = activeTab === 'stats' && field.name === 'value' && formData.label === 'Membres actifs';
                  
                  // Dynamically update options for treasury member selection
                  const fieldOptions = field.name === 'memberName' && activeTab === 'treasury' 
                    ? bikersList 
                    : field.options;

                  return (
                    <div key={field.name} className="space-y-2">
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-mono">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          required={field.name !== 'quote'}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none transition-colors min-h-[120px]"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          required={field.name === 'memberName' ? formData.type === 'Cotisation' : field.name !== 'memberName'}
                          value={formData[field.name] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updates: any = { [field.name]: val };
                            if (activeTab === 'treasury' && field.name === 'type' && val === 'Cotisation') {
                              updates.amount = 50000;
                              updates.description = "Cotisation annuelle";
                            }
                            setFormData({ ...formData, ...updates });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none transition-colors"
                        >
                          <option value="">Sélectionner...</option>
                          {fieldOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          required={!isAutoStat}
                          disabled={isAutoStat}
                          type={field.type}
                          placeholder={isAutoStat ? `Automatique: ${bikerCount}` : ""}
                          value={isAutoStat ? bikerCount : (formData[field.name] || '')}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-red-500 outline-none transition-colors disabled:opacity-50"
                        />
                      )}
                      {isAutoStat && <p className="text-[10px] text-red-500/70 font-mono italic">Cette valeur est calculée automatiquement à partir de la liste des Bikers.</p>}
                    </div>
                  );
                })}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : (
                    <>
                      <Save className="w-5 h-5" />
                      {isEditing ? "Mettre à jour" : "Ajouter au site"}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

            {/* List */}
            <div className="space-y-8">
              {activeTab === 'treasury' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 glass rounded-3xl border-white/10">
                      <div className="flex items-center gap-3 text-green-500 mb-4">
                        <ArrowUpRight className="w-5 h-5" />
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-mono font-bold">Total Entrées</span>
                      </div>
                      <div className="text-2xl font-bold text-white tracking-tight">{formatMGA(treasuryStats.income)}</div>
                    </div>
                    <div className="p-8 glass rounded-3xl border-white/10 shadow-2xl">
                      <div className="flex items-center gap-3 text-red-500 mb-4">
                        <ArrowDownRight className="w-5 h-5" />
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-mono font-bold">Total Sorties</span>
                      </div>
                      <div className="text-2xl font-bold text-white tracking-tight">{formatMGA(treasuryStats.expenses)}</div>
                    </div>
                    <div className="p-8 glass rounded-3xl border-red-500/30 bg-red-500/5 shadow-2xl shadow-red-500/10">
                      <div className="flex items-center gap-3 text-red-500 mb-4">
                        <Wallet className="w-5 h-5" />
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-mono font-bold">Solde Actuel</span>
                      </div>
                      <div className="text-2xl font-bold text-white tracking-tight">{formatMGA(treasuryStats.balance)}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold flex items-center gap-4">
                      <Users className="w-6 h-6 text-red-500" />
                      État des Cotisations {new Date().getFullYear()}
                    </h3>
                    <button
                      onClick={exportTreasuryReportToExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/20"
                    >
                      <Save className="w-4 h-4" />
                      Exporter Rapport Complet
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10">
                          <tr className="border-b border-white/10">
                            <th className="p-6 text-[11px] uppercase tracking-[0.3em] text-gray-500 font-mono font-bold">Membre</th>
                            <th className="p-6 text-[11px] uppercase tracking-[0.3em] text-gray-500 font-mono font-bold">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberDues.map((due, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/10 transition-colors group">
                              <td className="p-6 font-bold text-sm uppercase tracking-wide text-white/90 group-hover:text-white">{due.name}</td>
                              <td className="p-6">
                                {due.paid ? (
                                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-500 text-[11px] font-bold uppercase tracking-widest border border-green-500/20">
                                    <Check className="w-3.5 h-3.5" /> Payé
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold uppercase tracking-widest border border-red-500/20">
                                    <X className="w-3.5 h-3.5" /> En retard
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">
                  {activeTab === 'registrations' ? 'Inscriptions Récentes' : activeTab === 'orders' ? 'Commandes Récentes' : `Liste des ${currentConfig.label}`}
                </h3>
                {activeTab === 'registrations' && items.length > 0 && (
                  <button
                    onClick={exportRegistrationsToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/20"
                  >
                    <Save className="w-4 h-4" />
                    Exporter Excel
                  </button>
                )}
              </div>
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center text-gray-500">
                  Aucun élément trouvé.
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={sortedItems.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {sortedItems.map((item) => (
                        <SortableItem key={item.id} id={item.id} disabled={activeTab !== 'bikers' && activeTab !== 'agenda' && activeTab !== 'partners'}>
                          <div key={item.id} className={`p-6 bg-white/5 rounded-2xl border ${item.status === 'new' ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'} flex items-center justify-between group hover:border-red-500/30 transition-all`}>
                    <div className="flex items-center gap-6">
                      {item.image || item.logo ? (
                        <img src={item.image || item.logo} className="w-16 h-16 rounded-xl object-cover" alt="" />
                      ) : (activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'treasury') && (
                        <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                          {activeTab === 'registrations' ? <Users className="w-6 h-6 text-red-500" /> : 
                           activeTab === 'orders' ? <ShoppingBag className="w-6 h-6 text-red-500" /> :
                           (item.type === 'Entrée' || item.type === 'Cotisation') ? <ArrowUpRight className="w-6 h-6 text-green-500" /> : <ArrowDownRight className="w-6 h-6 text-red-500" />}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-lg">{String(item.name || item.title || item.label || '')}</h4>
                          {item.status === 'new' && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-mono uppercase rounded-full">Nouveau</span>
                          )}
                        </div>
                        
                        {activeTab === 'registrations' ? (
                          <div className="space-y-1">
                            <p className="text-sm text-red-500 font-mono uppercase tracking-widest">{item.eventTitle}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> {item.bike}</span>
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.contact}</span>
                            </div>
                          </div>
                        ) : activeTab === 'orders' ? (
                          <div className="space-y-1">
                            <p className="text-sm text-red-500 font-mono uppercase tracking-widest">{item.productName}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.contact}</span>
                            </div>
                          </div>
                        ) : activeTab === 'treasury' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-xl">{formatMGA(item.amount)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                item.type === 'Entrée' || item.type === 'Cotisation' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{item.description}</p>
                            {item.memberName && (
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="w-3 h-3 text-red-500/50" />
                                <p className="text-xs text-red-500/70 font-medium">Membre: {item.memberName}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {activeTab === 'shop' ? formatMGA(item.price) : activeTab === 'agenda' ? `PAF: ${formatMGA(item.paf)}` : activeTab === 'treasury' ? item.date : String(item.date || item.type || item.role || '')}
                            {activeTab === 'stats' && item.label === 'Membres actifs' && ` (Auto: ${bikerCount})`}
                          </p>
                        )}
                        {(activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'treasury') && (
                          <p className="text-[10px] text-gray-600 mt-2 font-mono">
                            {activeTab === 'treasury' ? `Transaction du ${new Date(item.date).toLocaleDateString('fr-FR')}` : `Reçu le ${new Date(item.createdAt).toLocaleString('fr-FR')}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'new' && (
                        <button 
                          onClick={() => markAsRead(item.id)}
                          className="p-3 hover:bg-white/10 rounded-xl text-green-500 transition-colors"
                          title="Marquer comme lu"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      {!currentConfig.readOnly && (
                        <button 
                          onClick={() => startEdit(item)}
                          className="p-3 hover:bg-white/10 rounded-xl text-blue-400 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (confirmDeleteId === item.id) {
                            handleDelete(item.id);
                          } else {
                            setConfirmDeleteId(item.id);
                            setTimeout(() => setConfirmDeleteId(null), 3000);
                          }
                        }}
                        className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                          confirmDeleteId === item.id 
                            ? "bg-red-600 text-white animate-pulse" 
                            : "hover:bg-white/10 text-red-500"
                        }`}
                        title={confirmDeleteId === item.id ? "Cliquez encore pour supprimer" : "Supprimer"}
                      >
                        <Trash2 className="w-5 h-5" />
                        {confirmDeleteId === item.id && <span className="text-[10px] font-bold uppercase">Confirmer?</span>}
                      </button>
                    </div>
                          </div>
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
