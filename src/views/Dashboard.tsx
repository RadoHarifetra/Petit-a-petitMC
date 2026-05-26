import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { Truck, FileText, Package, TrendingUp, Users } from 'lucide-react';
import { formatAr } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    activeQuotes: 0,
    inTransit: 0,
    atWarehouse: 0,
    totalRevenue: 0,
    totalClients: 0
  });

  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const unsubQuotes = onSnapshot(collection(db, 'quotes'), (snap) => {
      setStats(prev => ({ ...prev, activeQuotes: snap.docs.filter(d => d.data().status === 'ORDERED' || d.data().status === 'SENT').length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quotes');
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setStats(prev => ({ 
        ...prev, 
        inTransit: docs.filter(d => d.status === 'TRANSIT').length,
        atWarehouse: docs.filter(d => d.status === 'WAREHOUSE').length,
        totalRevenue: docs.reduce((acc, curr) => acc + (curr.totalToPayMGA || 0), 0)
      }));

      // Generate dynamic alerts
      const newAlerts: any[] = [];
      const now = new Date();

      docs.forEach(order => {
        const eta = order.eta?.toDate ? order.eta.toDate() : new Date(order.eta);
        const diffDays = Math.ceil((eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (order.status === 'TRANSIT' && diffDays <= 3 && diffDays >= 0) {
          newAlerts.push({
            title: `Arrivée Prochaine (${order.shippingType})`,
            desc: `Arrive dans ${diffDays} jours // Mission #${order.id.slice(0, 6)}`,
            color: 'bg-emerald-500'
          });
        }

        if (order.status === 'PREPARATION') {
          const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          const pendingDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          if (pendingDays > 7) {
            newAlerts.push({
              title: "Alerte Préparation Longue",
              desc: `En attente depuis ${pendingDays} jours // Mission #${order.id.slice(0, 6)}`,
              color: 'bg-yellow-500'
            });
          }
        }

        if (order.status === 'WAREHOUSE') {
           newAlerts.push({
            title: "Colis prêt en entrepôt",
            desc: `Attente client // Mission #${order.id.slice(0, 6)}`,
            color: 'bg-accent'
          });
        }
      });

      setAlerts(newAlerts.slice(0, 10)); // Keep top 10

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setStats(prev => ({ ...prev, totalClients: snap.docs.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => {
      unsubQuotes();
      unsubOrders();
      unsubClients();
    };
  }, []);

  const cardData = [
    { label: "En Transit", value: stats.inTransit, icon: Truck, color: "text-blue-500" },
    { label: "Entrepôt", value: stats.atWarehouse, icon: Package, color: "text-emerald-500" },
    { label: "Devis Actifs", value: stats.activeQuotes, icon: FileText, color: "text-yellow-500" },
    { label: "Clients", value: stats.totalClients, icon: Users, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">OPERATIONS CONTROL</h1>
          <p className="text-gray-500 text-xs tracking-[0.3em] font-bold">REAL-TIME LOGISTICS OVERVIEW</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardData.map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="industrial-card flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg bg-white/5 border border-white/10 ${item.color}`}>
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{item.label}</p>
              <p className="text-2xl font-black text-white mono">{item.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="industrial-card">
          <h2 className="text-[16px] mb-6 flex items-center gap-2">
            <Package size={16} className="text-accent" />
            DERNIÈRES ALERTES & NOTIFICATIONS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.length > 0 ? alerts.map((alert, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/5 rounded border border-white/10 hover:border-white/20 transition-all">
                <div className={`w-1 h-full min-h-[40px] ${alert.color} rounded-full`} />
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">{alert.title}</h3>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase leading-relaxed">{alert.desc}</p>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-600 gap-4">
                <Package size={40} className="opacity-20" />
                <p className="text-[10px] uppercase tracking-widest font-bold">Aucune alerte critique pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
