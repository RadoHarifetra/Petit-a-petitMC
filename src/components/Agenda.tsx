import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, MapPin, Clock, ArrowRight, Timer, Fuel, Calculator } from "lucide-react";
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import { X, Check } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{timeLeft.d}</span>
        <span className="text-[8px] uppercase opacity-50">j</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{timeLeft.h}</span>
        <span className="text-[8px] uppercase opacity-50">h</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{timeLeft.m}</span>
        <span className="text-[8px] uppercase opacity-50">m</span>
      </div>
    </div>
  );
}

export default function Agenda() {
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    bike: "",
    contact: "",
    acceptedRules: false
  });
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcData, setCalcData] = useState({ price: "", consumption: "5" });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const rules = "La sécurité est notre fondation. Nous roulons avec discipline et respect pour la machine. Un équipement de protection complet et un casque sont obligatoires pour chaque participant.";

  const calculateFuel = () => {
    if (!selectedEvent?.distance || !calcData.price || !calcData.consumption) return;
    const distance = Number(selectedEvent.distance);
    const price = Number(calcData.price);
    const consumption = Number(calcData.consumption);
    const liters = (distance * consumption) / 100;
    setCalcResult(Math.round(liters * price));
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // Sort by date ascending (closest first)
    const q = query(collection(db, "agenda"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "agenda");
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribe();
    };
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(date).replace(/^\w/, (c) => c.toUpperCase());
    } catch (e) {
      return dateStr;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acceptedRules) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "registrations"), {
        name: formData.name,
        bike: formData.bike,
        contact: formData.contact,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        createdAt: new Date().toISOString(),
        status: "new"
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedEvent(null);
        setFormData({ name: "", bike: "", contact: "", acceptedRules: false });
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "registrations");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="agenda" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Text Accent */}
      <div className="absolute top-0 right-0 text-[20vw] font-display text-white/[0.02] leading-none select-none pointer-events-none translate-x-1/4 -translate-y-1/4">
        AGENDA
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col mb-20">
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="micro-label text-red-500 mb-4"
          >
            Prochaines Sorties
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display text-white uppercase tracking-tighter"
          >
            PRÉPAREZ VOTRE <span className="text-red-500 italic">BÉCANE</span>
          </motion.h2>
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            viewport={{ once: true }}
            className="h-1 bg-red-600 mt-6"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Chargement de l'agenda...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 brutal-border border-dashed">
              Aucune sortie prévue pour le moment.
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative flex flex-col h-full"
              >
                <div className="relative aspect-[3/4] overflow-hidden mb-6 brutal-border">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.6 }}
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Countdown Badge */}
                  <div className="absolute top-0 right-0 z-10">
                    <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3 shadow-2xl">
                      <Timer className="w-4 h-4 animate-pulse" />
                      <Countdown targetDate={event.date} />
                    </div>
                  </div>

                  {/* Date Overlay */}
                  <div className="absolute bottom-4 left-4 z-10">
                    <div className="bg-white text-black px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-tighter">
                      {formatDate(event.date)}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <h3 className="card-title mb-4 group-hover:text-red-500 transition-colors">
                    {event.title}
                  </h3>
                  
                    <div className="space-y-2 mb-8 flex-1">
                      <div className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-widest">
                        <MapPin className="w-3 h-3 text-red-500" />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3 text-red-500" />
                        RDV: {event.time}
                      </div>
                      {event.distance && (
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-widest">
                          <ArrowRight className="w-3 h-3 text-red-500" />
                          Distance: {event.distance} KM
                        </div>
                      )}
                      {event.paf && (
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-widest">
                          <Check className="w-3 h-3 text-red-500" />
                          PAF: {new Intl.NumberFormat('fr-MG').format(Number(event.paf))} Ar
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedEvent(event)}
                        className="flex-1 py-4 bg-white text-black hover:bg-red-600 hover:text-white transition-all duration-300 font-display uppercase text-sm tracking-widest brutal-border"
                      >
                        S'inscrire
                      </button>
                      {event.distance && (
                        <button 
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowCalculator(true);
                          }}
                          className="px-4 py-4 bg-zinc-900 text-white hover:bg-red-600 transition-all duration-300 brutal-border flex items-center justify-center"
                          title="Évaluer le carburant"
                        >
                          <Fuel className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {selectedEvent && !showCalculator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-xl bg-[#0a0a0a] brutal-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <span className="micro-label text-red-500 mb-2">Inscription</span>
                    <h3 className="text-4xl font-display uppercase leading-none">{selectedEvent.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="p-2 hover:bg-red-600 transition-colors group"
                  >
                    <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>

                {isSuccess ? (
                  <div className="py-20 text-center animate-slam">
                    <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Check className="w-12 h-12 text-white" />
                    </div>
                    <h4 className="text-3xl font-display uppercase mb-4">Inscription réussie !</h4>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">On se voit sur la route.</p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-8">
                    <div className="space-y-6">
                      <div className="group">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 group-focus-within:text-red-500 transition-colors">Nom Complet</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 focus:border-red-500 outline-none py-3 text-xl font-display uppercase transition-colors placeholder:text-white/10"
                          placeholder="VOTRE NOM"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 group-focus-within:text-red-500 transition-colors">Moto</label>
                        <input
                          required
                          type="text"
                          value={formData.bike}
                          onChange={(e) => setFormData({ ...formData, bike: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 focus:border-red-500 outline-none py-3 text-xl font-display uppercase transition-colors placeholder:text-white/10"
                          placeholder="MODÈLE"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 group-focus-within:text-red-500 transition-colors">Contact</label>
                        <input
                          required
                          type="text"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 focus:border-red-500 outline-none py-3 text-xl font-display uppercase transition-colors placeholder:text-white/10"
                          placeholder="+261 ..."
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-red-600/5 brutal-border border-red-500/20">
                      <p className="text-xs text-gray-400 leading-relaxed mb-6 italic font-serif">
                        "{rules}"
                      </p>
                      <label className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative w-6 h-6 border-2 border-white/20 group-hover:border-red-500 transition-colors">
                          <input
                            required
                            type="checkbox"
                            checked={formData.acceptedRules}
                            onChange={(e) => setFormData({ ...formData, acceptedRules: e.target.checked })}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          {formData.acceptedRules && (
                            <div className="absolute inset-1 bg-red-600 animate-slam" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                          J'accepte les règles de sécurité
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-6">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="flex-1 py-5 border border-white/20 hover:bg-white/5 font-display uppercase text-sm tracking-widest transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.acceptedRules}
                        className="flex-1 py-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-display uppercase text-sm tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                      >
                        {isSubmitting ? "ENVOI..." : "VALIDER"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fuel Calculator Modal */}
      <AnimatePresence>
        {showCalculator && selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCalculator(false);
                setCalcResult(null);
                setSelectedEvent(null);
              }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-md bg-[#0a0a0a] brutal-border p-8 md:p-12 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="micro-label text-red-500 mb-2">Calculateur</span>
                  <h3 className="text-3xl font-display uppercase leading-none">Estimation Carburant</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowCalculator(false);
                    setCalcResult(null);
                    setSelectedEvent(null);
                  }}
                  className="p-2 hover:bg-red-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-white/5 brutal-border border-white/10 overflow-hidden">
                  <div className="bg-red-600 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white">
                    Devis Estimatif
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Distance A/R</div>
                      <div className="text-xl font-display text-white">{selectedEvent.distance} KM</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 group-focus-within:text-red-500 transition-colors">Prix/L (MGA)</label>
                        <input
                          type="number"
                          value={calcData.price}
                          onChange={(e) => setCalcData({ ...calcData, price: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 focus:border-red-500 outline-none py-2 text-lg font-display uppercase transition-colors placeholder:text-white/10"
                          placeholder="5900"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 group-focus-within:text-red-500 transition-colors">Cons. (L/100)</label>
                        <input
                          type="number"
                          value={calcData.consumption}
                          onChange={(e) => setCalcData({ ...calcData, consumption: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 focus:border-red-500 outline-none py-2 text-lg font-display uppercase transition-colors placeholder:text-white/10"
                          placeholder="5"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={calculateFuel}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-display uppercase text-xs tracking-widest transition-all brutal-border flex items-center justify-center gap-3"
                    >
                      <Calculator className="w-4 h-4" />
                      Calculer Carburant
                    </button>

                      {calcResult !== null && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pt-4 space-y-3"
                      >
                        <div className="flex justify-between text-sm font-mono text-gray-400">
                          <span>Carburant</span>
                          <span>{new Intl.NumberFormat('fr-MG').format(calcResult)} Ar</span>
                        </div>
                        {selectedEvent.paf && (
                          <div className="flex justify-between text-sm font-mono text-gray-400">
                            <span>PAF (Participation)</span>
                            <span>{new Intl.NumberFormat('fr-MG').format(Number(selectedEvent.paf))} Ar</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-white/20">
                          <span className="font-display uppercase text-red-500">Total Estimé</span>
                          <span className="text-2xl font-display text-white">
                            {new Intl.NumberFormat('fr-MG').format(calcResult + Number(selectedEvent.paf || 0))} Ar
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {calcResult !== null && (
                  <button
                    onClick={() => setShowCalculator(false)}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-widest transition-all brutal-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    Ok, s'inscrire
                  </button>
                )}

                <p className="text-[9px] text-gray-500 italic leading-relaxed text-center px-4">
                  * Cette estimation est donnée à titre indicatif. Prévoyez toujours un peu plus pour les imprévus.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
