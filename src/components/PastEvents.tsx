import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import LoadingSpinner from "./LoadingSpinner";

export default function PastEvents() {
  const [isMobile, setIsMobile] = useState(false);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // Sort by date descending (most recent first)
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPastEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "events");
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribe();
    };
  }, []);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedEvent && selectedEvent.images) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.images.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedEvent && selectedEvent.images) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedEvent.images.length) % selectedEvent.images.length);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <section id="event" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Text Accent */}
      <div className="absolute bottom-0 left-0 text-[20vw] font-display text-white/[0.02] leading-none select-none pointer-events-none -translate-x-1/4 translate-y-1/4">
        EVENTS
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col mb-20">
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="micro-label text-red-500 mb-4"
          >
            Archives
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-title text-white"
          >
            ÉVÉNEMENTS <span className="text-red-500 italic">PASSÉS</span>
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
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Chargement des événements...</p>
            </div>
          ) : pastEvents.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 brutal-border border-dashed">
              Aucun événement affiché pour le moment.
            </div>
          ) : (
            pastEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer flex flex-col"
                onClick={() => {
                  setSelectedEvent(event);
                  setCurrentImageIndex(0);
                }}
              >
                <div className="relative aspect-video overflow-hidden mb-8 brutal-border">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.8 }}
                    src={event.images && event.images.length > 0 ? event.images[0] : event.image}
                    alt={event.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                  
                  {/* Date Badge */}
                  <div className="absolute top-0 left-0 z-10">
                    <div className="bg-white text-black px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-tighter">
                      {formatDate(event.date)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h3 className="card-title mb-4 group-hover:text-red-500 transition-colors">
                    {event.title}
                  </h3>
                  <p className="body-text text-sm italic mb-6 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 text-red-500 font-mono text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                    Voir la galerie <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Gallery Modal */}
      <AnimatePresence>
        {selectedEvent && selectedEvent.images && selectedEvent.images.length > 0 && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/98 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl aspect-video brutal-border overflow-hidden shadow-2xl bg-black"
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  src={selectedEvent.images[currentImageIndex]} 
                  alt={`${selectedEvent.title} ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
              
              {/* Controls */}
              <div className="absolute inset-0 flex items-center justify-between p-2 md:p-8 pointer-events-none">
                <button 
                  onClick={prevImage}
                  className="p-2 md:p-4 bg-black/50 hover:bg-red-600 text-white transition-all pointer-events-auto brutal-border"
                >
                  <ChevronLeft className="w-4 h-4 md:w-8 md:h-8" />
                </button>
                <button 
                  onClick={nextImage}
                  className="p-2 md:p-4 bg-black/50 hover:bg-red-600 text-white transition-all pointer-events-auto brutal-border"
                >
                  <ChevronRight className="w-4 h-4 md:w-8 md:h-8" />
                </button>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 md:top-8 md:right-8 p-1.5 md:p-3 bg-white text-black hover:bg-red-600 hover:text-white transition-all z-50 brutal-border"
              >
                <X className="w-4 h-4 md:w-8 md:h-8" />
              </button>

              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div>
                    <span className="micro-label text-red-500 mb-2">{formatDate(selectedEvent.date)}</span>
                    <h3 className="text-4xl font-display uppercase text-white leading-none">{selectedEvent.title}</h3>
                  </div>
                  <div className="font-mono text-xs text-white/40 uppercase tracking-widest">
                    Image {currentImageIndex + 1} <span className="text-red-500">/</span> {selectedEvent.images.length}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
