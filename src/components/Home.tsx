import React, { useState, useEffect } from "react";
import Hero from "./Hero";
import Partners from "./Partners";
import { motion } from "motion/react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import { Calendar, MapPin, ArrowRight, Bike, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";

export default function Home() {
  const [stats, setStats] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [bikerCount, setBikerCount] = useState(0);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingPilots, setIsLoadingPilots] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Fetch Biker Count
    const unsubscribeBikers = onSnapshot(collection(db, "bikers"), (snapshot) => {
      setBikerCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "bikers");
    });

    // Fetch Stats
    const statsQuery = query(collection(db, "stats"), orderBy("label", "asc"));
    const unsubscribeStats = onSnapshot(statsQuery, (snapshot) => {
      setStats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setIsLoadingStats(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "stats");
      setIsLoadingStats(false);
    });

    // Fetch Upcoming Events - Sorted by date ascending (closest first)
    const eventsQuery = query(collection(db, "agenda"), orderBy("date", "asc"), limit(3));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      setUpcomingEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingEvents(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "agenda");
      setIsLoadingEvents(false);
    });

    // Fetch Pilots
    const pilotsQuery = query(collection(db, "pilots"), orderBy("order", "asc"));
    const unsubscribePilots = onSnapshot(pilotsQuery, (snapshot) => {
      setPilots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingPilots(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "pilots");
      setIsLoadingPilots(false);
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribeBikers();
      unsubscribeStats();
      unsubscribeEvents();
      unsubscribePilots();
    };
  }, []);

  const Counter = ({ value, suffix = "" }: { value: string; suffix?: string }) => {
    const [count, setCount] = useState(0);
    const target = parseInt(value.replace(/\D/g, '')) || 0;
    const isK = value.toLowerCase().includes('k');
    const displaySuffix = suffix || (isK ? 'k' : '');

    useEffect(() => {
      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }, [target]);

    return <span>{count}{displaySuffix}</span>;
  };

  return (
    <div>
      <Hero />
      
      {/* Stats Section */}
      <section className="py-24 border-y border-white/5 bg-zinc-950">
        <div className="container mx-auto px-6 flex justify-center">
          <div className="grid grid-cols-2 md:grid-cols-5 w-full max-w-6xl">
            {isLoadingStats ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-8 border-r border-white/5 last:border-r-0 text-center animate-pulse">
                  <div className="h-16 bg-white/5 rounded-xl mb-4" />
                  <div className="h-4 w-2/3 bg-white/5 rounded mx-auto" />
                </div>
              ))
            ) : stats.length === 0 ? (
            // Fallback stats if none in DB
            [
              { label: "Membres Actifs", value: bikerCount > 0 ? bikerCount.toString() : "150" },
              { label: "Sorties Annuelles", value: "48" },
              { label: "Km Parcourus", value: "250" },
              { label: "Années d'Existence", value: "12" },
              { label: "Œuvres Caritatives", value: "24" },
            ].map((stat, i) => (
              <div key={i} className="p-8 border-r border-white/5 last:border-r-0 text-center group hover:bg-red-600 transition-all duration-500">
                <div className="font-display text-6xl md:text-7xl mb-2 group-hover:scale-110 transition-transform">
                  <Counter value={stat.value} suffix={stat.label.includes('Km') ? 'k' : ''} />
                </div>
                <div className="micro-label group-hover:text-white transition-colors">{stat.label}</div>
              </div>
            ))
          ) : (
            stats.map((stat, i) => (
              <div key={stat.id} className="p-8 border-r border-white/5 last:border-r-0 text-center group hover:bg-red-600 transition-all duration-500">
                <div className="font-display text-6xl md:text-7xl mb-2 group-hover:scale-110 transition-transform">
                  <Counter 
                    value={stat.label.toLowerCase().includes('membre') 
                      ? (bikerCount > 0 ? String(bikerCount) : String(stat.value || '0')) 
                      : String(stat.value || '0')} 
                    suffix={stat.suffix}
                  />
                </div>
                <div className="micro-label group-hover:text-white transition-colors">{stat.label}</div>
              </div>
            ))
          )}
          </div>
        </div>
      </section>

      <Partners />

      {/* Pilots Section */}
      <section className="py-24 bg-[#0a0a0a] border-t border-white/5 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <span className="micro-label text-red-500 mb-4 block">Championnat 2026</span>
            <h2 className="section-title">
              Nos <span className="text-red-500">Pilotes Officiels</span>
            </h2>
            <p className="body-text text-sm max-w-xl mx-auto mt-4 text-zinc-400">
              Découvrez la liste des pilotes qui vont fièrement représenter notre club lors du championnat officiel 2026.
            </p>
          </div>

          {isLoadingPilots ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <LoadingSpinner size="lg" />
              <p className="micro-label">Chargement des pilotes...</p>
            </div>
          ) : pilots.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 font-mono text-sm max-w-md mx-auto border border-white/5 rounded-3xl bg-zinc-950/40">
              Aucun pilote listé pour le championnat 2026 pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {pilots.map((pilot, i) => (
                <motion.div
                  key={pilot.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative flex flex-col bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/55 transition-all duration-300 shadow-xl shadow-black/30"
                >
                  {/* Photo */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900 flex items-center justify-center">
                    {pilot.image ? (
                      <motion.img
                        src={pilot.image}
                        alt={pilot.pseudo}
                        initial={{ filter: "grayscale(100%)", scale: 1 }}
                        whileInView={isMobile ? { filter: "grayscale(0%)" } : { filter: "grayscale(100%)" }}
                        whileHover={!isMobile ? { filter: "grayscale(0%)", scale: 1.05 } : {}}
                        viewport={{ once: false, amount: 0.5 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-zinc-700 group-hover:text-red-500/50 transition-colors">
                        <Bike className="w-16 h-16 stroke-[1]" />
                      </div>
                    )}
                    
                    {/* Race Number Overlay Badge */}
                    <div className="absolute top-4 right-4 bg-red-600 text-white font-display text-4xl px-3 py-1 rounded-lg tracking-tight shadow-lg shadow-red-600/30 font-bold">
                      #{pilot.number}
                    </div>

                    {/* Category Overlay Label */}
                    <span className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md text-white border border-white/5 uppercase font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-md">
                      {pilot.category}
                    </span>
                  </div>

                  {/* Biker Details */}
                  <div className="p-6 flex flex-col flex-grow bg-zinc-950">
                    <h3 className="card-title text-2xl group-hover:text-red-500 transition-colors mb-2">
                      {pilot.pseudo}
                    </h3>

                    {/* Achievements / Palmarès */}
                    {(pilot.titlesGold || pilot.titlesSilver || pilot.titlesBronze) ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {pilot.titlesGold && Number(pilot.titlesGold) > 0 && (
                          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-tight">
                            <Trophy className="w-3 h-3 text-yellow-500" />
                            <span>Or : {pilot.titlesGold}</span>
                          </div>
                        )}
                        {pilot.titlesSilver && Number(pilot.titlesSilver) > 0 && (
                          <div className="flex items-center gap-1.5 bg-zinc-300/10 border border-zinc-300/30 text-zinc-300 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-tight">
                            <Trophy className="w-3 h-3 text-zinc-300" />
                            <span>Argent : {pilot.titlesSilver}</span>
                          </div>
                        )}
                        {pilot.titlesBronze && Number(pilot.titlesBronze) > 0 && (
                          <div className="flex items-center gap-1.5 bg-amber-600/10 border border-amber-600/30 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-tight">
                            <Trophy className="w-3 h-3 text-amber-600" />
                            <span>Bronze : {pilot.titlesBronze}</span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-auto flex items-center gap-2 text-zinc-400 text-sm font-sans border-t border-white/5 pt-4">
                      <span className="p-1 px-2 border border-white/10 rounded-md bg-white/5 font-mono text-[10px] uppercase text-zinc-400">Moto</span>
                      <span className="font-semibold text-zinc-200">{pilot.bike}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Subtle artistic light effect */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
      </section>

      {/* Agenda Preview Section */}
      <section className="relative py-16 bg-[#050505] overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center mb-20 gap-8">
            <div className="max-w-2xl">
              <span className="micro-label text-red-500 mb-4 block">Calendrier des sorties</span>
              <h2 className="section-title">
                Prochaines <span className="text-red-500">Sorties</span>
              </h2>
            </div>
            <Link to="/agenda" className="group flex items-center gap-4 text-xl font-display uppercase tracking-tighter hover:text-red-500 transition-colors">
              Voir tout le calendrier
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/10">
            {isLoadingEvents ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="micro-label">Chargement des sorties...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500">
                Aucune sortie prévue pour le moment.
              </div>
            ) : (
              upcomingEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-12 border-r border-white/10 last:border-r-0 group hover:bg-zinc-900 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-0 bg-red-600 group-hover:h-full transition-all duration-500" />
                  
                  <div className="flex flex-col gap-8">
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-6xl leading-none">
                        {isNaN(new Date(event.date).getTime()) ? '--' : new Date(event.date).getDate()}
                      </span>
                      <span className="micro-label">
                        {isNaN(new Date(event.date).getTime()) ? '---' : new Date(event.date).toLocaleDateString('fr-FR', { month: 'long' })}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-red-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-4">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                      <h3 className="card-title mb-4 group-hover:text-red-500 transition-colors">
                        {event.title}
                      </h3>
                      <p className="body-text text-sm line-clamp-2 mb-8">
                        {event.description || "Rejoignez-nous pour cette nouvelle aventure sur les routes."}
                      </p>
                    </div>

                    <Link 
                      to="/agenda" 
                      className="inline-flex items-center gap-2 micro-label text-white group-hover:text-red-500 transition-colors"
                    >
                      Détails de l'événement <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full" />
      </section>
    </div>
  );
}
