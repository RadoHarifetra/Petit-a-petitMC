import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { LogisticsSettings } from '../types';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  DollarSign, 
  Truck, 
  Plane, 
  Zap,
  Globe
} from 'lucide-react';
import { formatAr, formatDate } from '../lib/utils';
import { fetchExchangeRates, ExchangeRates } from '../services/rateService';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<LogisticsSettings>({
    seaRate: 350,
    airRatePerKg: 70000,
    expressRatePerKg: 82500,
    updatedAt: null
  });
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const loadSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const data = snap.data() as LogisticsSettings;
        setSettings(data);
        if (data.lastExchangeRates) setRates(data.lastExchangeRates as any);
      }
    };
    loadSettings();
  }, []);

  const updateRates = async () => {
    setLoading(true);
    const fetched = await fetchExchangeRates();
    if (fetched) {
      setRates(fetched);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        lastExchangeRates: rates,
        updatedAt: serverTimestamp(),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
      setSaveStatus('idle');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">PARAMÈTRES SYSTÈME</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">CONFIGURATION DU TAUX DE CHANGE</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="industrial-card space-y-4 max-w-md w-full">
            <h2 className="text-xs text-emerald-500 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe size={14} /> TAUX DE CHANGE (DYNAMIQUE)
              </div>
              <button 
                type="button" 
                onClick={updateRates}
                disabled={loading}
                className="p-1 hover:bg-white/10 rounded transition-colors text-emerald-500"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </h2>

            {rates ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400">1 USD</span>
                  <span className="mono font-bold text-emerald-500">{formatAr(rates.USD)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400">1 EUR</span>
                  <span className="mono font-bold text-emerald-500">{formatAr(rates.EUR)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400">1 CNY</span>
                  <span className="mono font-bold text-emerald-500">{formatAr(rates.CNY)}</span>
                </div>
                <p className="text-[9px] text-gray-600 uppercase italic text-center mt-2">
                  Dernière mise à jour: {formatDate(settings.updatedAt)}
                </p>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-gray-500 gap-4">
                <RefreshCw size={24} className="animate-pulse" />
                <p className="text-[10px] uppercase tracking-widest">Chargement des cours...</p>
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={saveStatus === 'saving'}
            className={`btn-primary px-12 py-4 flex items-center gap-3 transition-all ${saveStatus === 'saved' ? 'bg-emerald-600' : ''}`}
          >
            {saveStatus === 'saving' ? <RefreshCw size={18} className="animate-spin" /> : saveStatus === 'saved' ? <Globe size={18} /> : <Save size={18} />}
            {saveStatus === 'saving' ? 'ENREGISTREMENT...' : saveStatus === 'saved' ? 'CONFIG SAUVEGARDÉE' : 'SAUVEGARDER MA CONFIGURATION'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
