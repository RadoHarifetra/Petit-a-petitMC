import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, RefreshCw, Zap, Database } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { raceDb, isRaceManagerConfigured } from "../firebase-race-manager";
import { db } from "../firebase";

function shortenCategory(cat: string): string {
  if (!cat) return "";
  let short = cat.trim();
  
  // Replace "Sportive Classe X" -> "Sportive X", "Roadster Classe X" -> "Roadster X" etc.
  short = short.replace(/Sportive Classe\s*(\d+)/i, 'Sportive $1');
  short = short.replace(/Roadster Classe\s*(\d+)/i, 'Roadster $1');
  short = short.replace(/Supermotard Classe\s*(\d+)/i, 'Supermotard $1');
  short = short.replace(/Trail Classe\s*(\d+)/i, 'Trail $1');
  short = short.replace(/Custom Classe\s*(\d+)/i, 'Custom $1');
  short = short.replace(/Vitesse Classe\s*(\d+)/i, 'Vitesse $1');
  
  // General fallback replacement for "... Classe X (...)" -> "... X"
  short = short.replace(/(\w+)\s+Classe\s+(\d+)\s*\(.*?\)/i, '$1 $2');
  short = short.replace(/(\w+)\s+Classe\s+(\d+)/i, '$1 $2');
  
  // Remove trailing parentheses like (900cc+) or (600cc)
  short = short.replace(/\s*\(.*?\)/g, '');
  
  return short;
}

interface ItemRanking {
  id: string;
  name: string;
  number: string;
  bike: string;
  category: string;
  position: number;
  bestLap: string;
  totalLaps: number;
  gap?: string;
  points?: number;
  status?: "active" | "pit" | "out";
}

interface PartnerSponsor {
  id: string;
  name: string;
  logo: string;
  description?: string;
  type?: "Sponsor" | "Partenaire";
  order?: number;
}

// Fallback rankings
const DEMO_RANKINGS: ItemRanking[] = [
  { id: "r1", name: "Dino Petit", number: "99", bike: "KTM 450 SX-F", category: "MX1 Pro", position: 1, bestLap: "1:42.53", totalLaps: 12, gap: "Leader", points: 25, status: "active" },
  { id: "r2", name: "Marc Petit", number: "12", bike: "Yamaha YZ450F", category: "MX1 Pro", position: 2, bestLap: "1:43.12", totalLaps: 12, gap: "+5.12s", points: 22, status: "active" },
  { id: "r3", name: "Dany R.", number: "27", bike: "Husqvarna FC 350", category: "MX2", position: 1, bestLap: "1:44.02", totalLaps: 11, gap: "+14.89s", points: 25, status: "active" },
  { id: "r4", name: "Rado Harif", number: "77", bike: "Honda CRF450R", category: "MX1 Pro", position: 3, bestLap: "1:44.29", totalLaps: 12, gap: "+17.21s", points: 20, status: "pit" },
  { id: "r5", name: "Nico Petit", number: "4", bike: "GasGas MC 250F", category: "MX2", position: 2, bestLap: "1:46.10", totalLaps: 11, gap: "+29.40s", points: 22, status: "active" }
];

const DEMO_PARTNERS: PartnerSponsor[] = [
  { id: "dp1", name: "Motul", logo: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=300&auto=format&fit=crop", type: "Sponsor" },
  { id: "dp2", name: "Monster Energy", logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop", type: "Sponsor" },
  { id: "dp3", name: "Red Bull", logo: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=300&auto=format&fit=crop", type: "Sponsor" },
  { id: "dp4", name: "Fox Racing", logo: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop", type: "Partenaire" },
  { id: "dp5", name: "Oakley", logo: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=300&auto=format&fit=crop", type: "Partenaire" },
  { id: "dp6", name: "Michelin", logo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop", type: "Partenaire" }
];

export default function LiveRace() {
  const isConfigured = isRaceManagerConfigured();
  
  const [activeCategory, setActiveCategory] = useState<string>("Tous");
  const [rankings, setRankings] = useState<ItemRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUsingDemo, setIsUsingDemo] = useState(!isConfigured);
  const [partnersList, setPartnersList] = useState<PartnerSponsor[]>([]);

  // Listeners
  useEffect(() => {
    if (!isConfigured || !raceDb) {
      setRankings(DEMO_RANKINGS);
      setIsUsingDemo(true);
    } else {
      setLoading(true);
      setIsUsingDemo(false);

      const qRankings = query(collection(raceDb, "pilots"));
      const unsubRankings = onSnapshot(qRankings, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((doc, idx) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || data.pseudo || "Pilote",
              number: data.number || data.num || "N/A",
              bike: (typeof data.bike === "string" ? data.bike : null) || 
                    (typeof data.moto === "string" ? data.moto : null) || 
                    (typeof data.brand === "string" ? data.brand : null) || 
                    (typeof data.marque === "string" ? data.marque : null) || 
                    (typeof data.model === "string" ? data.model : null) || 
                    (typeof data.modele === "string" ? data.modele : null) || 
                    (typeof data.constructeur === "string" ? data.constructeur : null) || 
                    (typeof data.constructor === "string" ? data.constructor : null) || 
                    (typeof data.machine === "string" ? data.machine : null) || 
                    (typeof data.vehicle === "string" ? data.vehicle : null) || 
                    (typeof data.vehicule === "string" ? data.vehicule : null) || 
                    (typeof data.chassis === "string" ? data.chassis : null) || 
                    (typeof data.motorcycle === "string" ? data.motorcycle : null) || 
                    (typeof data.bikeModel === "string" ? data.bikeModel : null) || 
                    (typeof data.motoModel === "string" ? data.motoModel : null) || 
                    "N/A",
              category: shortenCategory(data.category || data.classe || "Non-classé"),
              position: data.position || data.rank || idx + 1,
              bestLap: data.bestLap || data.chrono || "--:--",
              totalLaps: data.totalLaps || data.laps || 0,
              gap: data.gap || (idx === 0 ? "Leader" : `+${idx * 1.5}s`),
              status: data.status || "active",
              points: data.points || 0
            } as ItemRanking;
          }).sort((a, b) => a.position - b.position);
          
          setRankings(list);
        } else {
          setRankings(DEMO_RANKINGS);
        }
        setLoading(false);
      }, (error) => {
        console.warn("Could not load real-time 'pilots'. Using demo standby.", error);
        setRankings(DEMO_RANKINGS);
        setLoading(false);
      });

      return () => unsubRankings();
    }
  }, [isConfigured]);

  useEffect(() => {
    const qPartners = query(collection(db, "race_partners"), orderBy("order", "asc"));
    const unsubPartners = onSnapshot(qPartners, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PartnerSponsor));
        setPartnersList(list);
      } else {
        setPartnersList(DEMO_PARTNERS);
      }
    }, () => {
      setPartnersList(DEMO_PARTNERS);
    });

    return () => {
      unsubPartners();
    };
  }, []);

  // Filters mapping
  const categories = ["Tous", ...Array.from(new Set(rankings.map(r => r.category)))];
  const filteredRankings = activeCategory === "Tous" 
    ? rankings 
    : rankings.filter(r => r.category === activeCategory);

  const sponsors = partnersList.filter(p => p.type === "Sponsor");
  const partnersOnly = partnersList.filter(p => !p.type || p.type === "Partenaire");

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-16">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        
        {/* Brand/Sponsor Banner & Flag Status Banner */}
        <div className="flex flex-col bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 mb-10 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl -z-10" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-center animate-pulse">
                <Zap className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs uppercase tracking-widest text-[#999] font-mono">
                    {isUsingDemo ? "Standby de Démo" : "Connexion Temps Réel Active"}
                  </span>
                </div>
                <h1 className="font-display text-3xl md:text-4xl uppercase tracking-tighter">
                  iRace-RAY <span className="text-red-500">Live</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-sm w-full lg:w-auto justify-between lg:justify-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">État Track</span>
                <span className="font-bold text-green-500 uppercase flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                  Piste Ouverte
                </span>
              </div>
              <div className="w-px h-8 bg-white/10 text-transparent">|</div>
              <div className="flex flex-col px-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Session</span>
                <span className="font-bold mt-0.5 text-white">Chrono Live</span>
              </div>
            </div>
          </div>

          {/* Sponsors Section (Brute Logos without boxes/frames) */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 block mb-3 font-semibold">
              Sponsors Officiels :
            </span>
            <div className="flex flex-wrap items-center gap-10 md:gap-14">
              {sponsors.map(sponsor => (
                <img
                  key={sponsor.id}
                  src={sponsor.logo}
                  alt={sponsor.name}
                  title={sponsor.name}
                  className="h-16 md:h-22 w-auto object-contain hover:scale-105 duration-300 transition-transform"
                  referrerPolicy="no-referrer"
                />
              ))}
              {sponsors.length === 0 && (
                <p className="text-xs text-gray-500 italic">Aucun sponsor configuré.</p>
              )}
            </div>
          </div>
        </div>

        {/* Setup instruction if using standy demo */}
        {isUsingDemo && (
          <div className="mb-10 bg-gradient-to-r from-red-950/40 to-black border border-red-500/30 rounded-3xl p-6 md:p-8 flex flex-col items-start justify-between gap-6">
            <div className="flex gap-4 items-start">
              <Database className="w-8 h-8 text-red-500 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-white mb-2">
                  Comment connecter vos données de "petit à petit Race manager" ?
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-4xl">
                  Actuellement, l'application est en boucle de **Standby démo** (les résultats ci-dessous sont factices à titre de démonstration). Vous pouvez connecter votre véritable Race Manager pour afficher les classements en temps réel :
                </p>
                
                {/* Visual Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 w-full">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-xs font-mono font-bold mb-3">1</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-red-500">Copier les clés</h4>
                    <p className="text-[11px] text-gray-400">Dans l'autre projet AI Studio, copiez les clés du fichier <code className="text-white px-1 py-0.5 rounded bg-white/5 font-mono">firebase-applet-config.json</code> à la racine.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-xs font-mono font-bold mb-3">2</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-red-500">Coller les clés ici</h4>
                    <p className="text-[11px] text-gray-400">Collez-les dans le fichier <code className="text-white px-1 py-0.5 rounded bg-white/5 font-mono">src/race-manager-config.json</code> à la racine de la présente application.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-xs font-mono font-bold mb-3">3</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-red-500">Affichage Direct</h4>
                    <p className="text-[11px] text-gray-400">Le site se synchronisera de manière 100% autonome et sécurisée pour diffuser vos courses de moto-cross en direct aux visiteurs !</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classement Live */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-red-500 animate-bounce" />
              <h3 className="font-display text-xl md:text-2xl uppercase tracking-wider">Classement Live</h3>
            </div>
            
            {/* Category selectors */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[10px] md:text-[11px] font-bold uppercase transition-all ${
                    activeCategory === cat 
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/25 border-none"
                      : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">Récupération des chronos ...</p>
            </div>
          ) : filteredRankings.length === 0 ? (
            <div className="py-20 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
              <p>Aucun pilote en piste sous cette catégorie.</p>
            </div>
          ) : (
            <div>
              
              {/* Desktop & Tablet View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      <th className="pb-4 font-normal w-12">Pos</th>
                      <th className="pb-4 font-normal">Pilote</th>
                      <th className="pb-4 font-normal">Moto</th>
                      <th className="pb-4 font-normal">Catégorie</th>
                      <th className="pb-4 font-normal text-right">Chrono</th>
                      <th className="pb-4 font-normal text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRankings.map((item, index) => {
                      let posBg = "bg-white/5 text-gray-400";
                      if (item.position === 1) posBg = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20";
                      if (item.position === 2) posBg = "bg-slate-300/20 text-slate-300 border border-slate-300/10";
                      if (item.position === 3) posBg = "bg-amber-700/20 text-amber-500 border border-amber-500/10";

                      return (
                        <tr 
                          key={item.id} 
                          className="group hover:bg-white/[0.02]"
                        >
                          <td className="py-4">
                            <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono font-bold ${posBg}`}>
                              {item.position}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono bg-red-600/15 border border-red-500/10 px-1.5 py-0.5 rounded text-[11px] font-bold tracking-tight text-white">
                                #{item.number}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold text-white group-hover:text-red-500 transition-colors">
                                  {item.name}
                                </span>
                                {item.status === "pit" && (
                                  <span className="text-[10px] font-mono text-amber-500 font-bold uppercase mt-0.5">⏱ Stand</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-xs text-gray-400">
                            {item.bike}
                          </td>
                          <td className="py-4">
                            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-400 font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-4 font-mono font-bold text-right text-red-500 transition-transform origin-right">
                            {item.bestLap}
                          </td>
                          <td className="py-4 font-mono text-xs text-right text-gray-500">
                            {item.gap}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredRankings.map((item) => {
                  let posBg = "bg-white/5 text-gray-400";
                  let cardBorder = "border-white/5";
                  if (item.position === 1) {
                    posBg = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20";
                    cardBorder = "border-yellow-500/10";
                  }
                  if (item.position === 2) {
                    posBg = "bg-slate-300/20 text-slate-300 border border-slate-300/10";
                    cardBorder = "border-slate-300/10";
                  }
                  if (item.position === 3) {
                    posBg = "bg-amber-700/20 text-amber-500 border border-amber-500/10";
                    cardBorder = "border-amber-500/10";
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-4 bg-white/[0.02] border ${cardBorder} rounded-2xl flex items-center justify-between gap-4`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-xl text-xs font-mono font-bold ${posBg}`}>
                          {item.position}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono bg-red-600/15 border border-red-500/10 px-1.5 py-0.2 rounded text-[10px] font-bold tracking-tight text-white">
                              #{item.number}
                            </span>
                            <span className="font-bold text-sm text-white truncate max-w-[120px]">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[140px]">
                            {item.bike}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-gray-400 font-bold">
                              {item.category}
                            </span>
                            {item.status === "pit" && (
                              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">⏱ Stand</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col shrink-0">
                        <span className="font-mono font-bold text-red-500 text-sm">
                          {item.bestLap}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 mt-0.5">
                          {item.gap}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* PARTENAIRES Section at the bottom (Brute Logos without boxes/frames) */}
        <div className="mt-12 bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
          <div className="mb-6">
            <span className="text-xs text-red-500 uppercase tracking-widest font-mono font-bold block mb-1">
              Partenaires d'Honneur
            </span>
            <h3 className="font-display text-xl uppercase tracking-wider text-white">Ils sont dans la course</h3>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 py-4 font-mono">
            {partnersOnly.map(partner => (
              <img
                key={partner.id}
                src={partner.logo}
                alt={partner.name}
                title={partner.name}
                className="h-14 md:h-18 w-auto object-contain hover:scale-105 duration-300 transition-transform"
                referrerPolicy="no-referrer"
              />
            ))}
            {partnersOnly.length === 0 && (
              <p className="text-xs text-gray-500 italic">Aucun partenaire configuré.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
