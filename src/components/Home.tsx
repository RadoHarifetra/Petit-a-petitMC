import React, { useState, useEffect } from "react";
import Hero from "./Hero";
import Partners from "./Partners";
import { motion } from "motion/react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";

export default function Home() {
  const [stats, setStats] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [bikerCount, setBikerCount] = useState(0);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "stats");
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

    return () => {
      unsubscribeBikers();
      unsubscribeStats();
      unsubscribeEvents();
    };
  }, []);

  return (
    <div>
      <Hero />
      
      {/* Stats Section */}
      <section className="py-24 border-y border-white/5 bg-zinc-950">
        <div className="container mx-auto px-6 flex justify-center">
          <div className="grid grid-cols-2 md:grid-cols-5 w-full max-w-6xl">
            {stats.length === 0 ? (
            // Fallback stats if none in DB
            [
              { label: "Membres Actifs", value: bikerCount > 0 ? bikerCount.toString() : "150+" },
              { label: "Sorties Annuelles", value: "48" },
              { label: "Km Parcourus", value: "250k" },
              { label: "Années d'Existence", value: "12" },
              { label: "Œuvres Caritatives", value: "24" },
            ].map((stat, i) => (
              <div key={i} className="p-8 border-r border-white/5 last:border-r-0 text-center group hover:bg-red-600 transition-all duration-500">
                <div className="font-display text-6xl md:text-7xl mb-2 group-hover:scale-110 transition-transform">{stat.value}</div>
                <div className="micro-label group-hover:text-white transition-colors">{stat.label}</div>
              </div>
            ))
          ) : (
            stats.map((stat, i) => (
              <div key={stat.id} className="p-8 border-r border-white/5 last:border-r-0 text-center group hover:bg-red-600 transition-all duration-500">
                <div className="font-display text-6xl md:text-7xl mb-2 group-hover:scale-110 transition-transform">
                  {stat.label.toLowerCase().includes('membre') 
                    ? (bikerCount > 0 ? String(bikerCount) : String(stat.value || '0')) 
                    : String(stat.value || '0')}
                </div>
                <div className="micro-label group-hover:text-white transition-colors">{stat.label}</div>
              </div>
            ))
          )}
          </div>
        </div>
      </section>

      <Partners />

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
