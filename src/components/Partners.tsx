import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import LoadingSpinner from "./LoadingSpinner";

export default function Partners() {
  const [isMobile, setIsMobile] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const q = query(collection(db, "partners"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "partners");
      setIsLoading(false);
    });
    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <section className="py-24 bg-[#050505]">
        <div className="container mx-auto px-6 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (partners.length === 0) return null;

  return (
    <section className="py-16 bg-[#050505] relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="micro-label text-red-500 mb-4 block">Partenaires</span>
          <h2 className="section-title">Ils roulent <span className="text-red-500">avec nous</span></h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 py-8">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center transition-all duration-300 group"
            >
              <div className="h-16 md:h-20 flex items-center justify-center">
                <img 
                  src={partner.logo} 
                  alt={partner.name} 
                  title={partner.name}
                  className="max-h-full max-w-[180px] object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
              {partner.name && (
                <span className="text-xs font-mono text-gray-500 mt-3 group-hover:text-red-500 transition-colors">
                  {partner.name}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
