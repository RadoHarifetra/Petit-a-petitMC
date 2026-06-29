import React, { useState, useEffect } from "react";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc,
  onSnapshot, query, where, writeBatch 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Trash2, Edit2, X, Save, ChevronRight, LayoutDashboard, 
  Calendar, ShoppingBag, Users, Image as ImageIcon, BarChart3, 
  ArrowLeft, Bell, Check, Phone, Bike, Package, Wallet,
  GripVertical, ArrowUpRight, ArrowDownRight, Handshake, Minus,
  ClipboardList, Star, MessageSquare, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import { checkUserIsAdmin } from "../utils/adminCheck";
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
import CloudinaryUpload from "./CloudinaryUpload";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

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

type EntityType = 'agenda' | 'shop' | 'bikers' | 'events' | 'stats' | 'registrations' | 'orders' | 'treasury' | 'partners' | 'race_partners' | 'surveys' | 'members_contacts' | 'pilots' | 'users';

interface EntityConfig {
  id: EntityType;
  label: string;
  icon: any;
  fields?: { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'time' | 'image' | 'images'; options?: string[] }[];
  readOnly?: boolean;
}

const formatMGA = (value: any) => {
  if (value === null || value === undefined || value === '') return '0 Ar';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : Number(value);
  if (isNaN(num)) return String(value || '0');
  return new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(num).replace('MGA', 'Ar');
};

const formatPhone = (phone: any) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)}`;
  }
  return String(phone);
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
      { name: 'image', label: 'Image', type: 'image' }
    ]
  },
  {
    id: 'partners',
    label: 'Partenaires / Sponsors',
    icon: Handshake,
    fields: [
      { name: 'name', label: 'Nom', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'logo', label: 'Logo', type: 'image' },
      { name: 'type', label: 'Type', type: 'select', options: ['Partenaire', 'Sponsor'] }
    ]
  },
  {
    id: 'race_partners',
    label: 'Course Live - Sponsors / Partenaires',
    icon: Handshake,
    fields: [
      { name: 'name', label: 'Nom de la Marque', type: 'text' },
      { name: 'logo', label: 'Logo', type: 'image' },
      { name: 'type', label: 'Type de Partenaire', type: 'select', options: ['Sponsor', 'Partenaire'] }
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
      { name: 'image', label: 'Image', type: 'image' }
    ]
  },
  {
    id: 'bikers',
    label: 'Bikers',
    icon: Users,
    fields: [
      { name: 'name', label: 'Nom', type: 'text' },
      { name: 'role', label: 'Rôle', type: 'text' },
      { name: 'image', label: 'Photo', type: 'image' },
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
      { name: 'images', label: 'Images', type: 'images' }
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
  },
  {
    id: 'surveys',
    label: 'Sondages',
    icon: ClipboardList,
    readOnly: true
  },
  {
    id: 'members_contacts',
    label: 'Membres (Coords)',
    icon: Phone,
    fields: [
      { name: 'memberName', label: 'Membre', type: 'select', options: [] },
      { name: 'phone', label: 'Téléphone', type: 'text' },
      { name: 'axe', label: 'Axe', type: 'select', options: ['Nord', 'Sud', 'Est', 'Ouest'] },
      { name: 'seniority', label: 'Ancienneté', type: 'text' }
    ]
  },
  {
    id: 'pilots',
    label: 'Pilotes',
    icon: Bike,
    fields: [
      { name: 'pseudo', label: 'Pseudo / Nom', type: 'text' },
      { name: 'bike', label: 'Moto', type: 'text' },
      { name: 'category', label: 'Catégorie', type: 'text' },
      { name: 'number', label: 'Numéro (course)', type: 'text' },
      { name: 'image', label: 'Photo', type: 'image' }
    ]
  },
  {
    id: 'users',
    label: 'Administrateurs',
    icon: Users,
    fields: [
      { name: 'email', label: 'Adresse Email (Google)', type: 'text' },
      { name: 'name', label: 'Nom complet / Titre', type: 'text' },
      { name: 'role', label: 'Rôle', type: 'select', options: ['admin'] }
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
  const [notifications, setNotifications] = useState({ registrations: 0, orders: 0, surveys: 0 });
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTreasuryFormOpen, setIsTreasuryFormOpen] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const totalNotifications = notifications.registrations + notifications.orders + notifications.surveys;

  useEffect(() => {
    if (!authChecked) return;

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

    const qReg = collection(db, "registrations");
    const unsubscribeReg = onSnapshot(qReg, (snapshot) => {
      const unread = snapshot.docs.filter(doc => !doc.data().status || doc.data().status === 'new').length;
      setNotifications(prev => ({ ...prev, registrations: unread }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "registrations");
    });

    const qOrd = collection(db, "orders");
    const unsubscribeOrd = onSnapshot(qOrd, (snapshot) => {
      const unread = snapshot.docs.filter(doc => !doc.data().status || doc.data().status === 'new').length;
      setNotifications(prev => ({ ...prev, orders: unread }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "orders");
    });

    const unsubscribeSurveys = onSnapshot(collection(db, "surveys"), (snapshot) => {
      const unread = snapshot.docs.filter(doc => !doc.data().status || doc.data().status === 'new').length;
      setNotifications(prev => ({ ...prev, surveys: unread }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "surveys");
    });

    return () => {
      unsubscribeBikers();
      unsubscribeTreasury();
      unsubscribeReg();
      unsubscribeOrd();
      unsubscribeSurveys();
    };
  }, [authChecked]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
      } else {
        try {
          const isAdminUser = await checkUserIsAdmin(user.email, user.uid);
          if (isAdminUser) {
            setAuthChecked(true);
          } else {
            await signOut(auth);
            navigate("/");
          }
        } catch (err) {
          console.error("Dashboard auth check failed:", err);
          await signOut(auth);
          navigate("/");
        }
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
    setIsTreasuryFormOpen(false);
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
      if (activeTab === 'surveys') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (activeTab === 'bikers' || activeTab === 'agenda' || activeTab === 'partners' || activeTab === 'race_partners' || activeTab === 'pilots') {
        return (Number(a.order) || 999) - (Number(b.order) || 999);
      }
      if (activeTab === 'members_contacts') {
        return (a.memberName || '').localeCompare(b.memberName || '');
      }
      if (activeTab === 'users') {
        return (a.name || '').localeCompare(b.name || '');
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
        if (data.type !== 'Cotisation') {
          delete data.memberName;
        }
      }

      if ((activeTab === 'bikers' || activeTab === 'agenda' || activeTab === 'partners' || activeTab === 'race_partners' || activeTab === 'pilots') && !isEditing) {
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

      if (activeTab === 'users') {
        data.email = String(data.email || '').toLowerCase().trim();
        data.role = data.role || 'admin';
        const docId = isEditing ? isEditing : data.email;
        await setDoc(doc(db, "users", docId), data);
      } else if (isEditing) {
        await updateDoc(doc(db, activeTab, isEditing), data);
      } else {
        await addDoc(collection(db, activeTab), data);
      }
      setFormData({});
      setIsEditing(null);
      setIsTreasuryFormOpen(false);
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
    const cotisations = allTreasury
      .filter(t => t.type === 'Cotisation')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return {
      income,
      expenses,
      balance: income - expenses,
      cotisations
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

  const formRef = React.useRef<HTMLFormElement>(null);

  const startEdit = (item: any) => {
    setIsEditing(item.id);
    const editData = { ...item };
    if (activeTab === 'events' && Array.isArray(editData.images)) {
      editData.images = editData.images.join(', ');
    }
    setFormData(editData);
    if (activeTab === 'treasury') {
      setIsTreasuryFormOpen(true);
    }
    
    // Auto scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

  const markAllAsRead = async () => {
    const unreadItems = items.filter(i => !i.status || i.status === 'new');
    if (unreadItems.length === 0) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      unreadItems.forEach(item => {
        batch.update(doc(db, activeTab, item.id), { status: 'read' });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, activeTab);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-[#050505] pt-20 sm:pt-24 pb-8 sm:pb-12">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-12 gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-3xl uppercase tracking-tight">Tableau de Bord Admin</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Gérez le contenu de votre site</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/")} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono text-xs sm:text-sm uppercase tracking-widest self-start md:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </button>
        </div>

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Mobile Navigation Dropdown */}
          <div className="lg:hidden w-full space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 px-4">Navigation</p>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 text-white border border-white/10 w-full hover:bg-white/10 transition-all shadow-lg active:scale-[0.99]"
            >
              <currentConfig.icon className="w-5 h-5 text-red-500" />
              <span className="font-bold flex-1 text-left tracking-tight">{currentConfig.label}</span>
              
              {totalNotifications > 0 && (
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-red-600 text-white">
                  {totalNotifications}
                </span>
              )}
              
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border border-white/5 rounded-2xl bg-zinc-950 divide-y divide-white/5 max-h-[320px] overflow-y-auto shadow-2xl relative z-30"
                >
                  {configs.map((config) => (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(config.id);
                        setIsEditing(null);
                        setFormData({});
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          contentRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }, 120);
                      }}
                      className={`flex items-center gap-4 px-6 py-4 transition-all w-full text-left ${
                        activeTab === config.id 
                          ? "bg-red-600/20 text-red-500 font-bold" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <config.icon className={`w-5 h-5 ${activeTab === config.id ? "text-red-500" : "text-gray-500"}`} />
                      <span className="flex-1 tracking-tight">{config.label}</span>
                      
                      {(config.id === 'registrations' || config.id === 'orders' || config.id === 'surveys') && notifications[config.id] > 0 && (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-red-600 text-white leading-none">
                          {notifications[config.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Sidebar Menu */}
          <nav className="hidden lg:flex lg:flex-col lg:space-y-2 lg:sticky lg:top-32">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 mb-4 px-4">Navigation</p>
            {configs.map((config) => (
              <button
                key={config.id}
                onClick={() => {
                  setActiveTab(config.id);
                  setIsEditing(null);
                  setFormData({});
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative flex items-center gap-4 px-6 py-4 rounded-2xl transition-all w-full border ${
                  activeTab === config.id 
                    ? "bg-red-600 text-white border-red-500 shadow-xl shadow-red-600/20" 
                    : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <config.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === config.id ? "text-white" : "text-gray-500"}`} />
                <span className="font-bold flex-1 text-left tracking-tight">{config.label}</span>
                
                {(config.id === 'registrations' || config.id === 'orders' || config.id === 'surveys') && notifications[config.id] > 0 && (
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                    activeTab === config.id ? "bg-white text-red-600" : "bg-red-600 text-white"
                  }`}>
                    {notifications[config.id]}
                  </span>
                )}
                
                <ChevronRight className={`w-4 h-4 transition-all ${
                  activeTab === config.id ? "rotate-90 opacity-100" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                }`} />
              </button>
            ))}
          </nav>

          {/* Main Content Area */}
          <div ref={contentRef} className="min-w-0 scroll-mt-28">
            {activeTab === 'treasury' ? (
              <div className="space-y-8 animate-fadeIn">
                {/* 1. Top Stats Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-6">
                  <div className="p-3 sm:p-6 md:p-8 glass rounded-2xl sm:rounded-3xl border border-green-500/20 bg-green-500/5 shadow-xl sm:shadow-2xl shadow-green-500/5 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-3 text-green-500 mb-2 sm:mb-4">
                      <ArrowUpRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                      <span className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-widest font-mono font-bold truncate">Entrées</span>
                    </div>
                    <div className="text-[11px] xs:text-sm sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans truncate">
                      {formatMGA(treasuryStats.income)}
                    </div>
                  </div>
                  
                  <div className="p-3 sm:p-6 md:p-8 glass rounded-2xl sm:rounded-3xl border border-red-500/20 bg-red-500/5 shadow-xl sm:shadow-2xl shadow-red-500/5 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-3 text-red-500 mb-2 sm:mb-4">
                      <ArrowDownRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                      <span className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-widest font-mono font-bold truncate">Sorties</span>
                    </div>
                    <div className="text-[11px] xs:text-sm sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans truncate">
                      {formatMGA(treasuryStats.expenses)}
                    </div>
                  </div>

                  <div className={`p-3 sm:p-6 md:p-8 glass rounded-2xl sm:rounded-3xl border transition-all duration-300 shadow-xl sm:shadow-2xl flex flex-col justify-between ${
                    treasuryStats.balance >= 0 
                      ? 'border-green-500/30 bg-green-500/10 shadow-green-500/5' 
                      : 'border-red-500/30 bg-red-500/10 shadow-red-500/5'
                  }`}>
                    <div className={`flex items-center gap-1.5 sm:gap-3 mb-2 sm:mb-4 ${
                      treasuryStats.balance >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-pulse shrink-0" />
                      <span className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-widest font-mono font-bold truncate">Solde</span>
                    </div>
                    <div className="text-[11px] xs:text-sm sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans truncate">
                      {formatMGA(treasuryStats.balance)}
                    </div>
                  </div>
                </div>

                {/* 2. Action Buttons & Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setFormData({ type: 'Entrée', date: new Date().toISOString().split('T')[0] });
                        setIsEditing(null);
                        setIsTreasuryFormOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95 cursor-pointer w-full xs:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden xs:inline">Entrée / Cotisation</span>
                      <span className="xs:hidden">Entrée / Cotis</span>
                    </button>
                    <button
                      onClick={() => {
                        setFormData({ type: 'Sortie', date: new Date().toISOString().split('T')[0] });
                        setIsEditing(null);
                        setIsTreasuryFormOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer w-full xs:w-auto"
                    >
                      <Minus className="w-4 h-4" />
                      Sortie
                    </button>
                  </div>
                  
                  <button
                    onClick={exportTreasuryReportToExcel}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-black/20 w-full sm:w-auto cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-green-500" />
                    <span className="hidden xs:inline">Exporter Rapport Complet</span>
                    <span className="xs:hidden">Exporter Rapport</span>
                  </button>
                </div>

                {/* 3. Collapsible Add/Edit Form */}
                <AnimatePresence>
                  {isTreasuryFormOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white/5 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                            {isEditing ? <Edit2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-500" /> : <Plus className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-500" />}
                            {isEditing ? "Modifier la transaction" : "Nouvelle transaction"}
                          </h3>
                          <button 
                            type="button"
                            onClick={() => { setIsTreasuryFormOpen(false); setIsEditing(null); setFormData({}); }}
                            className="text-xs sm:text-sm text-gray-500 hover:text-white cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>

                        {/* Segmented Control for Type Selector */}
                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-bold text-gray-400">Type de Transaction</label>
                          <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 border border-white/5 rounded-2xl">
                            {['Entrée', 'Cotisation', 'Sortie'].map((t) => {
                              const isActive = formData.type === t;
                              const isPositiveType = t === 'Entrée' || t === 'Cotisation';
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    const updates: any = { type: t };
                                    if (t === 'Cotisation') {
                                      updates.amount = 100000;
                                      updates.description = "Cotisation annuelle";
                                    } else {
                                      updates.memberName = "";
                                      if (formData.description === "Cotisation annuelle") {
                                        updates.description = "";
                                      }
                                      if (formData.amount === 100000) {
                                        updates.amount = "";
                                      }
                                    }
                                    setFormData({ ...formData, ...updates });
                                  }}
                                  className={`py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                    isActive 
                                      ? isPositiveType 
                                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/10' 
                                        : 'bg-red-600 text-white shadow-lg shadow-red-600/10'
                                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {formData.type === 'Cotisation' && (
                          <div className="space-y-2">
                            <label className="text-xs sm:text-sm font-bold text-gray-400">Membre</label>
                            <select
                              required
                              value={formData.memberName || ''}
                              onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 focus:border-red-500 outline-none transition-colors text-white text-sm"
                            >
                              <option value="">Sélectionner un membre...</option>
                              {bikersList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-bold text-gray-400">Montant (Ar)</label>
                          <input
                            required
                            type="number"
                            placeholder="Ex: 100000"
                            value={formData.amount || ''}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 focus:border-red-500 outline-none transition-colors text-white text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-bold text-gray-400">Description / Libellé</label>
                          <input
                            required
                            type="text"
                            placeholder="Ex: Cotisation annuelle, Carburant sortie moto..."
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 focus:border-red-500 outline-none transition-colors text-white text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-bold text-gray-400">Date</label>
                          <input
                            required
                            type="date"
                            value={formData.date || ''}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 focus:border-red-500 outline-none transition-colors text-white text-sm"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 disabled:opacity-50 cursor-pointer text-sm sm:text-base"
                        >
                          {loading ? "Enregistrement..." : (
                            <>
                              <Save className="w-5 h-5" />
                              {isEditing ? "Mettre à jour" : "Ajouter au site"}
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 4. Two Column layout for list & dues */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                  
                  {/* Left Column (lg:col-span-7) - Transactions history */}
                  <div className="lg:col-span-7 space-y-4 sm:space-y-6 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
                    <h3 className="text-base sm:text-xl font-bold flex items-center gap-2 sm:gap-3 border-b border-white/5 pb-3 sm:pb-4">
                      <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-500" />
                      Historique des Transactions
                    </h3>
                    
                    <div className="space-y-4">
                      {sortedItems.length === 0 ? (
                        <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center text-gray-500">
                          Aucune transaction trouvée.
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {sortedItems.map((item) => (
                            <div key={item.id} className="p-3.5 sm:p-5 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 flex items-center justify-between group hover:border-red-500/30 transition-all gap-3">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                                  {item.type === 'Entrée' || item.type === 'Cotisation' ? (
                                    <ArrowUpRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-green-500" />
                                  ) : (
                                    <ArrowDownRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs sm:text-base text-white truncate leading-tight">
                                    {item.type === 'Cotisation' ? `Cotisation - ${item.memberName || 'Inconnu'}` : (item.description || 'Transaction')}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`font-bold text-[11px] sm:text-sm ${
                                      item.type === 'Entrée' || item.type === 'Cotisation' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {item.type === 'Entrée' || item.type === 'Cotisation' ? '+' : '-'}{formatMGA(item.amount)}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase font-bold leading-none shrink-0 ${
                                      item.type === 'Entrée' || item.type === 'Cotisation' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                      {item.type}
                                    </span>
                                  </div>
                                  {item.memberName && item.type !== 'Cotisation' && (
                                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">Membre: {item.memberName}</p>
                                  )}
                                  <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 font-mono">
                                    {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                <button 
                                  onClick={() => startEdit(item)}
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirmDeleteId === item.id) {
                                      handleDelete(item.id);
                                    } else {
                                      setConfirmDeleteId(item.id);
                                      setTimeout(() => setConfirmDeleteId(null), 3000);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                    confirmDeleteId === item.id 
                                      ? "bg-red-600 text-white animate-pulse px-2" 
                                      : "hover:bg-white/10 text-red-500"
                                  }`}
                                  title={confirmDeleteId === item.id ? "Confirmer la suppression" : "Supprimer"}
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  {confirmDeleteId === item.id && <span className="text-[8px] font-bold uppercase hidden xs:inline">Confirmer</span>}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (lg:col-span-5) - Cotisations and Dues tracker */}
                  <div className="lg:col-span-5 space-y-4 sm:space-y-6 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
                    <h3 className="text-base sm:text-xl font-bold flex items-center gap-2 sm:gap-3 border-b border-white/5 pb-3 sm:pb-4">
                      <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-500" />
                      État des Cotisations {new Date().getFullYear()}
                    </h3>

                    {/* Dues Stats Summary */}
                    <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 sm:p-4 rounded-2xl border border-white/5">
                      <div className="text-left">
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest font-bold mb-1">Actifs</p>
                        <p className="text-base sm:text-lg font-bold text-white">{bikersList.length}</p>
                      </div>
                      <div className="text-left border-l border-white/10 pl-3">
                        <p className="text-[9px] text-green-500 font-mono uppercase tracking-widest font-bold mb-1">Payés</p>
                        <p className="text-base sm:text-lg font-bold text-green-400">
                          {memberDues.filter(m => m.paid).length}
                        </p>
                      </div>
                      <div className="text-left border-t border-white/10 pt-2 mt-1">
                        <p className="text-[9px] text-red-500 font-mono uppercase tracking-widest font-bold mb-1">En Retard</p>
                        <p className="text-base sm:text-lg font-bold text-red-400">
                          {memberDues.filter(m => !m.paid).length}
                        </p>
                      </div>
                      <div className="text-left border-t border-l border-white/10 pl-3 pt-2 mt-1">
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest font-bold mb-1 font-semibold">Volume (Ar)</p>
                        <p className="text-base sm:text-lg font-bold text-green-400">{formatMGA(treasuryStats.cotisations)}</p>
                      </div>
                    </div>

                    {/* Cotisations Scrollable Table */}
                    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10">
                            <tr className="border-b border-white/5">
                              <th className="p-3 sm:p-4 text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 font-mono font-bold">Membre</th>
                              <th className="p-3 sm:p-4 text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 font-mono font-bold">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberDues.map((due, idx) => (
                              <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="p-3 sm:p-4 font-bold text-[11px] sm:text-xs uppercase tracking-wide text-white/80 group-hover:text-white truncate max-w-[120px]">{due.name}</td>
                                <td className="p-3 sm:p-4">
                                  {due.paid ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Payé
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-red-500/10 text-red-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> En retard
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
              </div>
            ) : (
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

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
                {currentConfig.fields?.map((field) => {
                  const isAutoStat = activeTab === 'stats' && field.name === 'value' && formData.label === 'Membres actifs';
                  
                  // Hide memberName field in treasury tab if transaction type is not Cotisation
                  if (activeTab === 'treasury' && field.name === 'memberName' && formData.type !== 'Cotisation') {
                    return null;
                  }
                  
                  // Dynamically update options for treasury or contacts member selection
                  const fieldOptions = field.name === 'memberName' && (activeTab === 'treasury' || activeTab === 'members_contacts')
                    ? bikersList 
                    : field.options;

                  return (
                    <div key={field.name} className="space-y-2">
                      {field.type === 'image' ? (
                        <CloudinaryUpload
                          label={field.label}
                          value={formData[field.name] || ''}
                          onChange={(url) => setFormData({ ...formData, [field.name]: url })}
                        />
                      ) : field.type === 'images' ? (
                        <div className="space-y-3">
                          <CloudinaryUpload
                            label={field.label}
                            value=""
                            onChange={() => {}}
                            multiple={true}
                            onMultipleChange={(urls) => {
                              setFormData((prev) => {
                                const existing = prev[field.name]
                                  ? prev[field.name].split(',').map((s: string) => s.trim()).filter(Boolean)
                                  : [];
                                return { ...prev, [field.name]: [...existing, ...urls].join(', ') };
                              });
                            }}
                          />
                          {formData[field.name] && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {formData[field.name].split(',').map((url: string, i: number) => url.trim() && (
                                <div key={i} className="relative group">
                                  <img src={url.trim()} className="w-16 h-16 object-cover rounded-lg border border-white/10" alt="" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const urls = formData[field.name].split(',').map((s: string) => s.trim()).filter((_: string, idx: number) => idx !== i);
                                      setFormData({ ...formData, [field.name]: urls.join(', ') });
                                    }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
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
                                  updates.amount = 100000;
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
                        </>
                      )}
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
              {activeTab === 'surveys' && items.length > 0 && (
                <div className="space-y-8">
                  {/* General Stats Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 glass rounded-2xl border-white/10">
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Total Réponses</p>
                      <p className="text-3xl font-display text-white">{items.length}</p>
                    </div>
                    <div className="p-6 glass rounded-2xl border-white/10">
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Note Moyenne</p>
                      <p className="text-3xl font-display text-red-500">
                        {(items.reduce((acc, curr) => acc + (curr.satisfaction || 0), 0) / items.length).toFixed(1)}
                        <span className="text-sm ml-1">★</span>
                      </p>
                    </div>
                    <div className="p-6 glass rounded-2xl border-white/10">
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Taux de Membres</p>
                      <p className="text-3xl font-display text-white">
                        {Math.round((items.filter(i => i.isMember === 'Oui').length / items.length) * 100)}%
                      </p>
                    </div>
                    <div className="p-6 glass rounded-2xl border-white/10">
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Nouveaux</p>
                      <p className="text-3xl font-display text-white">
                        {Math.round((items.filter(i => i.experience === 'Première fois').length / items.length) * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Satisfaction Chart */}
                    <div className="p-8 glass rounded-3xl border-white/10">
                      <h4 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-8">Satisfaction Globale</h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={(() => {
                            const counts = [0, 0, 0, 0, 0];
                            items.forEach(i => { if (i.satisfaction) counts[i.satisfaction - 1]++; });
                            return counts.map((count, i) => ({ name: `${i + 1} ★`, count }));
                          })()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                              itemStyle={{ color: '#ef4444' }}
                            />
                            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Return Chart */}
                    <div className="p-8 glass rounded-3xl border-white/10">
                      <h4 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-8">Reviendrais-tu ?</h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={(() => {
                                const counts: any = { 'Oui': 0, 'Peut-être': 0, 'Non': 0 };
                                items.forEach(i => { if (i.return) counts[i.return]++; });
                                return Object.entries(counts).map(([name, value]) => ({ name, value }));
                              })()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#22c55e" />
                              <Cell fill="#eab308" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Member vs Visitor Chart */}
                    <div className="p-8 glass rounded-3xl border-white/10">
                      <h4 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-8">Profil des répondants</h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={(() => {
                                const counts: any = { 'Membres': 0, 'Visiteurs': 0 };
                                items.forEach(i => { 
                                  if (i.isMember === 'Oui') counts['Membres']++;
                                  else counts['Visiteurs']++;
                                });
                                return Object.entries(counts).map(([name, value]) => ({ name, value }));
                              })()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#ef4444" />
                              <Cell fill="#3b82f6" />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Experience Chart */}
                    <div className="p-8 glass rounded-3xl border-white/10">
                      <h4 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-8">Ancienneté</h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={(() => {
                            const counts: any = { 'Première fois': 0, 'Moins de 1 an': 0, '1 à 3 ans': 0, 'Plus de 3 ans': 0 };
                            items.forEach(i => { if (i.experience) counts[i.experience]++; });
                            return Object.entries(counts).map(([name, count]) => ({ name, count }));
                          })()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                            <XAxis type="number" stroke="#666" fontSize={12} hide />
                            <YAxis dataKey="name" type="category" stroke="#666" fontSize={10} width={80} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                            />
                            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['organization', 'route', 'ambiance'].map((key) => (
                      <div key={key} className="p-6 glass rounded-2xl border-white/10">
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-4">
                          {key === 'organization' ? 'Organisation' : key === 'route' ? 'Parcours' : 'Ambiance'}
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const counts: any = {};
                            items.forEach(i => { if (i[key]) counts[i[key]] = (counts[i[key]] || 0) + 1; });
                            const total = items.length;
                            return Object.entries(counts)
                              .sort((a: any, b: any) => b[1] - a[1])
                              .map(([name, count]: any) => (
                                <div key={name} className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-gray-400">{name}</span>
                                    <span className="text-white">{Math.round((count / total) * 100)}%</span>
                                  </div>
                                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-red-600" 
                                      style={{ width: `${(count / total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">
                  {activeTab === 'registrations' ? 'Inscriptions Récentes' : activeTab === 'orders' ? 'Commandes Récentes' : activeTab === 'surveys' ? 'Retours d\'expérience' : `Liste des ${currentConfig.label}`}
                </h3>
                <div className="flex gap-4">
                  {(activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'surveys') && items.some(i => !i.status || i.status === 'new') && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all border border-white/5"
                    >
                      <Check className="w-4 h-4" />
                      Tout marquer comme lu
                    </button>
                  )}
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
                        <SortableItem key={item.id} id={item.id} disabled={activeTab !== 'bikers' && activeTab !== 'agenda' && activeTab !== 'partners' && activeTab !== 'race_partners' && activeTab !== 'pilots'}>
                          <div key={item.id} className={`p-6 bg-white/5 rounded-2xl border ${(!item.status || item.status === 'new') && (activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'surveys') ? 'border-red-500/50 bg-red-500/5 shadow-lg shadow-red-500/5' : 'border-white/10'} flex items-center justify-between group hover:border-red-500/30 transition-all`}>
                            <div className="flex items-center gap-6">
                              {item.image || item.logo ? (
                                <img 
                                  src={item.image || item.logo} 
                                  className={`w-16 h-16 rounded-xl ${(activeTab === 'partners' || activeTab === 'race_partners') ? 'object-contain p-1 bg-white/5' : 'object-cover'}`} 
                                  alt="" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'treasury' || activeTab === 'surveys' || activeTab === 'members_contacts' || activeTab === 'pilots' || activeTab === 'users') && (
                                <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                                  {activeTab === 'registrations' ? <Users className="w-6 h-6 text-red-500" /> : 
                                   activeTab === 'orders' ? <ShoppingBag className="w-6 h-6 text-red-500" /> :
                                   activeTab === 'surveys' ? <Star className="w-6 h-6 text-red-500" /> :
                                   activeTab === 'members_contacts' ? <Phone className="w-6 h-6 text-red-500" /> :
                                   activeTab === 'pilots' ? <Bike className="w-6 h-6 text-red-500" /> :
                                   activeTab === 'users' ? <Users className="w-6 h-6 text-red-500" /> :
                                   (item.type === 'Entrée' || item.type === 'Cotisation') ? <ArrowUpRight className="w-6 h-6 text-green-500" /> : <ArrowDownRight className="w-6 h-6 text-red-500" />}
                                </div>
                              )}
                              <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-lg">
                            {activeTab === 'treasury' 
                              ? (item.type === 'Cotisation' ? `Cotisation - ${item.memberName || 'Inconnu'}` : (item.description || 'Transaction'))
                              : String(item.name || item.memberName || item.respondentName || item.title || item.label || 'Sans nom')
                            }
                          </h4>
                          {(!item.status || item.status === 'new') && (activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'surveys') && (
                            <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-mono font-bold uppercase rounded-full shadow-lg shadow-red-600/30">Nouveau</span>
                          )}
                        </div>
                        
                        {activeTab === 'registrations' ? (
                          <div className="space-y-1">
                            <p className="text-sm text-red-500 font-mono uppercase tracking-widest">{item.eventTitle}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> {item.bike}</span>
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {formatPhone(item.contact)}</span>
                            </div>
                          </div>
                        ) : activeTab === 'orders' ? (
                          <div className="space-y-1">
                            <p className="text-sm text-red-500 font-mono uppercase tracking-widest">{item.productName}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {formatPhone(item.contact)}</span>
                            </div>
                          </div>
                        ) : activeTab === 'treasury' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className={`font-bold text-xl ${
                                item.type === 'Entrée' || item.type === 'Cotisation' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {item.type === 'Entrée' || item.type === 'Cotisation' ? '+' : '-'}{formatMGA(item.amount)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                item.type === 'Entrée' || item.type === 'Cotisation' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            {item.type === 'Cotisation' && item.description && item.description !== 'Cotisation annuelle' && (
                              <p className="text-sm text-gray-400">{item.description}</p>
                            )}
                            {item.memberName && item.type !== 'Cotisation' && (
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="w-3 h-3 text-red-500/50" />
                                <p className="text-xs text-red-500/70 font-medium">Membre: {item.memberName}</p>
                              </div>
                            )}
                          </div>
                        ) : activeTab === 'surveys' ? (
                          <div className="space-y-3">
                            <p className="text-sm text-red-500 font-mono uppercase tracking-widest">{item.eventTitle}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={`w-4 h-4 ${item.satisfaction >= star ? "text-red-500 fill-current" : "text-white/10"}`} />
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded border border-white/10 text-gray-400 font-mono">
                                  {item.respondentName}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${item.isMember === 'Oui' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                                  {item.isMember === 'Oui' ? 'Membre' : 'Visiteur'}
                                </span>
                                {item.experience && (
                                  <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded border border-white/10 text-gray-500 font-mono">
                                    {item.experience}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                              <p><span className="text-gray-500">Organisation:</span> <span className="text-white">{item.organization}</span></p>
                              <p><span className="text-gray-500">Parcours:</span> <span className="text-white">{item.route}</span></p>
                              <p><span className="text-gray-500">Ambiance:</span> <span className="text-white">{item.ambiance}</span></p>
                              <p><span className="text-gray-500">Sécurité:</span> <span className="text-white">{item.security}</span></p>
                              <p><span className="text-gray-500">Logistique:</span> <span className="text-white">{item.logistics}</span></p>
                              <p><span className="text-gray-500">Reviendrait:</span> <span className="text-white">{item.return}</span></p>
                            </div>
                            {item.routeWhy && (
                              <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase mb-1 font-mono">Pourquoi (parcours):</p>
                                <p className="text-xs italic text-gray-300">"{item.routeWhy}"</p>
                              </div>
                            )}
                            {item.securityComment && (
                              <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase mb-1 font-mono">Commentaire sécurité:</p>
                                <p className="text-xs italic text-gray-300">"{item.securityComment}"</p>
                              </div>
                            )}
                            <div className="mt-2 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                              <p className="text-[10px] text-red-500 uppercase mb-1 font-mono flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" /> Améliorations suggérées:
                              </p>
                              <p className="text-xs text-white">{item.improvements}</p>
                            </div>
                          </div>
                        ) : activeTab === 'members_contacts' ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono">
                                AXE: {item.axe}
                              </span>
                              {item.seniority && (
                                <span className="px-2 py-0.5 rounded-lg bg-red-500/5 border border-red-500/10 text-[10px] text-red-500 font-mono">
                                  Depuis: {item.seniority}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-red-600" />
                              <span className="text-xl font-bold text-white font-mono tracking-tighter">{formatPhone(item.phone)}</span>
                            </div>
                          </div>
                        ) : activeTab === 'pilots' ? (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-red-500 uppercase font-mono tracking-widest">
                              N° {item.number} &mdash; {item.category}
                            </p>
                            <p className="text-sm text-gray-400">
                              Moto: <span className="text-white font-medium">{item.bike}</span>
                            </p>
                          </div>
                        ) : activeTab === 'users' ? (
                          <div className="space-y-1">
                            <p className="text-sm text-red-500 font-mono font-bold tracking-tight">
                              {item.email}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Rôle: <span className="px-1.5 py-0.5 rounded bg-red-600/25 border border-red-500/20 text-white font-mono text-[10px] font-bold uppercase">{item.role}</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {activeTab === 'shop' ? formatMGA(item.price) : activeTab === 'agenda' ? `PAF: ${formatMGA(item.paf)}` : activeTab === 'treasury' ? '' : String(item.date || item.type || item.role || '')}
                            {activeTab === 'stats' && item.label === 'Membres actifs' && ` (Auto: ${bikerCount})`}
                          </p>
                        )}
                        {(activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'treasury' || activeTab === 'surveys') && (
                          <p className="text-[10px] text-gray-600 mt-2 font-mono">
                            {activeTab === 'treasury' ? `Transaction du ${item.date ? new Date(item.date).toLocaleDateString('fr-FR') : 'Date inconnue'}` : 
                             activeTab === 'surveys' ? `Avis reçu le ${item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : 'Date inconnue'}` :
                             `Reçu le ${item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : 'Date inconnue'}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(!item.status || item.status === 'new') && (activeTab === 'registrations' || activeTab === 'orders' || activeTab === 'surveys') && (
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
        )}
      </div>
    </div>
  </div>
</div>
  );
}
