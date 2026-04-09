import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import LoadingSpinner from "./LoadingSpinner";

export default function Bikers() {
  const [isMobile, setIsMobile] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // Fetch all bikers without strict orderBy to ensure everyone shows up
    // even if they are missing the 'order' field.
    const unsubscribe = onSnapshot(collection(db, "bikers"), (snapshot) => {
      const bikersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort in memory: priority to 'order' field, then by name
      bikersList.sort((a, b) => {
        const orderA = a.order !== undefined ? Number(a.order) : 999;
        const orderB = b.order !== undefined ? Number(b.order) : 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });
      setMembers(bikersList);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "bikers");
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribe();
    };
  }, []);

  return (
    <section id="les bikers" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Text Accent */}
      <div className="absolute top-0 right-0 text-[20vw] font-display text-white/[0.02] leading-none select-none pointer-events-none translate-x-1/4 -translate-y-1/4">
        CREW
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">Les <span className="text-red-500">Bikers</span></h2>
          <p className="body-text max-w-xl mx-auto">Les visages qui font battre le cœur du club Petit à Petit MC.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Chargement du Crew...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 border border-dashed border-white/10 rounded-3xl">
              Aucun membre affiché pour le moment.
            </div>
          ) : (
            members.map((member, i) => (
              <motion.div
                key={member.id}
                initial="hidden"
                whileInView="visible"
                whileHover="hover"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                  hover: { y: -5 }
                }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-2xl mb-6 relative">
                  <motion.img
                    variants={{
                      hidden: { filter: "grayscale(100%)", scale: 1 },
                      visible: isMobile ? { filter: "grayscale(0%)", scale: 1 } : { filter: "grayscale(100%)", scale: 1 },
                      hover: { filter: "grayscale(0%)", scale: 1.1 }
                    }}
                    transition={{ duration: 0.8 }}
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-left z-10 flex flex-col gap-2 transition-transform duration-500 group-hover:-translate-y-2">
                    <h3 className="card-title text-white leading-tight">{member.name}</h3>
                    
                    {/* Role - More visible */}
                    <div className="inline-block self-start px-3 py-1 bg-red-600 text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-md shadow-lg">
                      {member.role}
                    </div>

                    {/* Quote and Bike (Always visible) */}
                    <div className="mt-2 space-y-3">
                      {member.quote && (
                        <p className="font-sans text-[11px] leading-relaxed italic border-l-2 border-red-600 pl-3 !text-white font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          "{member.quote}"
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display uppercase tracking-widest text-white/80">{member.bike}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
