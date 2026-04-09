import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Hero() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <section className="relative h-screen flex items-center overflow-hidden bg-[#050505]">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1772726052/Yoran_goauxm.jpg"
          alt="Motorcycle on road"
          className="w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        <div className="max-w-5xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span className="micro-label text-red-500 mb-4 block">
              Petit à Petit MC — Est. 2024
            </span>
            
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-display uppercase tracking-tighter leading-[0.9] mb-8">
              Les petits <span className="text-red-500 skew-x-brutal inline-block">deviendront</span> grands
            </h1>

            <div className="flex flex-col items-center gap-12 mt-8">
              <p className="max-w-2xl body-text border-t md:border-t-0 md:border-l border-red-500/30 pt-6 md:pt-0 md:pl-6">
                Une fraternité soudée, une passion commune. Rejoignez-nous pour explorer les routes et vivre l'adrénaline à l'état pur.
              </p>
              
              <div className="flex flex-col md:flex-row gap-8">
                <Link to="/bikers" className="group flex items-center gap-4 text-2xl font-display uppercase tracking-tighter hover:text-red-500 transition-colors">
                  <span className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-red-500 group-hover:bg-red-500 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </span>
                  Le Crew
                </Link>
                <Link to="/events" className="group flex items-center gap-4 text-2xl font-display uppercase tracking-tighter hover:text-red-500 transition-colors">
                  <span className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-red-500 group-hover:bg-red-500 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </span>
                  Nos aventures
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Rail Text */}
      <div className="absolute right-10 bottom-10 hidden lg:block">
        <div className="writing-vertical-rl rotate-180 micro-label opacity-30">
          Ride fast — Live free — Petit à Petit
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-10 text-gray-500"
      >
        <div className="w-px h-24 bg-gradient-to-b from-red-500 to-transparent" />
      </motion.div>
    </section>
  );
}
