import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import LoadingSpinner from "./LoadingSpinner";

export default function Partners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "partners"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "partners");
      setIsLoading(false);
    });
    return () => unsubscribe();
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-10 brutal-border bg-zinc-950/50 group hover:bg-zinc-900 transition-all flex flex-col items-center text-center"
            >
              <div className="w-32 h-32 mb-8 grayscale group-hover:grayscale-0 transition-all duration-500 relative">
                <div className="absolute inset-0 rounded-full border-2 border-red-600/20 group-hover:border-red-600 transition-colors" />
                <div className="w-full h-full rounded-full overflow-hidden bg-white/5">
                  <img 
                    src={partner.logo} 
                    alt={partner.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <h3 className="card-title mb-4 group-hover:text-red-500 transition-colors">{partner.name}</h3>
              <p className="body-text text-sm italic max-w-xs">
                {partner.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
