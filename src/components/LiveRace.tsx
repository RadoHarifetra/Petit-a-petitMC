import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, RefreshCw, Zap, Database, Clock, Radio, Activity, CheckCircle2, Timer, ListCollapse } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { raceDb, isRaceManagerConfigured } from "../firebase-race-manager";
import raceConfig from "../race-manager-config.json";
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

function formatTime(sec: number | string | undefined | null): string {
  if (sec === undefined || sec === null || sec === "") return "--:--";
  const num = typeof sec === "number" ? sec : parseFloat(sec);
  if (isNaN(num)) return String(sec);
  
  if (num < 60) {
    return `${num.toFixed(3)}s`;
  }
  const minutes = Math.floor(num / 60);
  const seconds = num % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

function formatScheduledTime(scheduledTime: any): string {
  if (!scheduledTime) return "--:--";
  let date: Date;
  if (typeof scheduledTime.toDate === "function") {
    date = scheduledTime.toDate();
  } else if (scheduledTime.seconds !== undefined) {
    date = new Date(scheduledTime.seconds * 1000);
  } else if (typeof scheduledTime === "string" || typeof scheduledTime === "number") {
    date = new Date(scheduledTime);
  } else {
    return "--:--";
  }
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
  chronos?: string[];
  bestLapNumeric?: number | null;
  bestSingleLap?: string;
}

interface ItemPassage {
  id: string;
  pilotId: string;
  pilotName: string;
  pilotNumber: string;
  pilotBike: string;
  category: string;
  passageNumber: number;
  scheduledTime: any;
  status: "completed" | "scheduled";
  time?: number | string | null;
  timeNumeric?: number | null;
}

interface ItemDuel {
  id: string;
  scheduledTime: any;
  category: string;
  passageNumber: number;
  pilot1: ItemPassage;
  pilot2: ItemPassage;
  status: "completed" | "scheduled" | "live";
}

const DEMO_PASSAGES: ItemPassage[] = [
  {
    id: "dp-1",
    pilotId: "r1",
    pilotName: "Dino Petit",
    pilotNumber: "99",
    pilotBike: "KTM 450 SX-F",
    category: "MX1 Pro",
    passageNumber: 3,
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) + 1200 },
    status: "scheduled"
  },
  {
    id: "dp-2",
    pilotId: "r2",
    pilotName: "Marc Petit",
    pilotNumber: "12",
    pilotBike: "Yamaha YZ450F",
    category: "MX1 Pro",
    passageNumber: 3,
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) + 600 },
    status: "scheduled"
  },
  {
    id: "dp-3",
    pilotId: "r3",
    pilotName: "Dany R.",
    pilotNumber: "27",
    pilotBike: "Husqvarna FC 350",
    category: "MX2",
    passageNumber: 2,
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 300 },
    status: "completed",
    time: "1:44.020"
  },
  {
    id: "dp-4",
    pilotId: "r4",
    pilotName: "Rado Harif",
    pilotNumber: "77",
    pilotBike: "Honda CRF450R",
    category: "MX1 Pro",
    passageNumber: 2,
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 900 },
    status: "completed",
    time: "1:44.290"
  },
  {
    id: "dp-5",
    pilotId: "r5",
    pilotName: "Nico Petit",
    pilotNumber: "4",
    pilotBike: "GasGas MC 250F",
    category: "MX2",
    passageNumber: 1,
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 1800 },
    status: "completed",
    time: "1:46.100"
  }
];

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
  { id: "r1", name: "Dino Petit", number: "99", bike: "KTM 450 SX-F", category: "MX1 Pro", position: 1, bestLap: "1:42.53", totalLaps: 12, gap: "Leader", points: 25, status: "active", chronos: ["1:44.89", "1:43.76", "1:42.53", "1:43.12", "1:42.98"] },
  { id: "r2", name: "Marc Petit", number: "12", bike: "Yamaha YZ450F", category: "MX1 Pro", position: 2, bestLap: "1:43.12", totalLaps: 12, gap: "+5.12s", points: 22, status: "active", chronos: ["1:46.30", "1:44.15", "1:43.12", "1:43.90"] },
  { id: "r3", name: "Dany R.", number: "27", bike: "Husqvarna FC 350", category: "MX2", position: 1, bestLap: "1:44.02", totalLaps: 11, gap: "+14.89s", points: 25, status: "active", chronos: ["1:47.80", "1:45.60", "1:44.02", "1:45.10"] },
  { id: "r4", name: "Rado Harif", number: "77", bike: "Honda CRF450R", category: "MX1 Pro", position: 3, bestLap: "1:44.29", totalLaps: 12, gap: "+17.21s", points: 20, status: "pit", chronos: ["1:49.20", "1:46.45", "1:44.29"] },
  { id: "r5", name: "Nico Petit", number: "4", bike: "GasGas MC 250F", category: "MX2", position: 2, bestLap: "1:46.10", totalLaps: 11, gap: "+29.40s", points: 22, status: "active", chronos: ["1:51.10", "1:48.30", "1:46.10"] }
];

const DEMO_PARTNERS: PartnerSponsor[] = [
  { id: "dp1", name: "Motul", logo: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=300&auto=format&fit=crop", type: "Sponsor" },
  { id: "dp2", name: "Monster Energy", logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop", type: "Sponsor" },
  { id: "dp3", name: "Red Bull", logo: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=300&auto=format&fit=crop", type: "Sponsor" },
  { id: "dp4", name: "Fox Racing", logo: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop", type: "Partenaire" },
  { id: "dp5", name: "Oakley", logo: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=300&auto=format&fit=crop", type: "Partenaire" },
  { id: "dp6", name: "Michelin", logo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop", type: "Partenaire" }
];

const DEMO_DUELS: ItemDuel[] = [
  {
    id: "dd-0",
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 1800 },
    category: "MX2",
    passageNumber: 1,
    pilot1: {
      id: "dp-5",
      pilotId: "r5",
      pilotName: "Nico Petit",
      pilotNumber: "4",
      pilotBike: "GasGas MC 250F",
      category: "MX2",
      passageNumber: 1,
      scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 1800 },
      status: "completed",
      time: "1:46.100",
      timeNumeric: 106.100
    },
    pilot2: {
      id: "dp-6",
      pilotId: "r6",
      pilotName: "Yanis P.",
      pilotNumber: "42",
      pilotBike: "KTM 250 SX-F",
      category: "MX2",
      passageNumber: 1,
      scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 1800 },
      status: "completed",
      time: "1:48.250",
      timeNumeric: 108.250
    },
    status: "completed"
  },
  {
    id: "dd-2",
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 300 },
    category: "MX2",
    passageNumber: 2,
    pilot1: {
      id: "dp-3",
      pilotId: "r3",
      pilotName: "Dany R.",
      pilotNumber: "27",
      pilotBike: "Husqvarna FC 350",
      category: "MX2",
      passageNumber: 2,
      scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 300 },
      status: "completed",
      time: "1:44.020",
      timeNumeric: 104.020
    },
    pilot2: {
      id: "dp-4",
      pilotId: "r4",
      pilotName: "Julien M.",
      pilotNumber: "88",
      pilotBike: "Yamaha YZ250F",
      category: "MX2",
      passageNumber: 2,
      scheduledTime: { seconds: Math.floor(Date.now() / 1000) - 300 },
      status: "completed",
      time: "1:45.320",
      timeNumeric: 105.320
    },
    status: "completed"
  },
  {
    id: "dd-1",
    scheduledTime: { seconds: Math.floor(Date.now() / 1000) + 1200 },
    category: "MX1 Pro",
    passageNumber: 3,
    pilot1: {
      id: "dp-1",
      pilotId: "r1",
      pilotName: "Dino Petit",
      pilotNumber: "99",
      pilotBike: "KTM 450 SX-F",
      category: "MX1 Pro",
      passageNumber: 3,
      scheduledTime: { seconds: Math.floor(Date.now() / 1000) + 1200 },
      status: "scheduled"
    },
    pilot2: {
      id: "dp-2",
      pilotId: "r2",
      pilotName: "Marc Petit",
      pilotNumber: "12",
      pilotBike: "Yamaha YZ450F",
      category: "MX1 Pro",
      passageNumber: 3,
      scheduledTime: { seconds: Math.floor(Date.now() / 1000) + 600 },
      status: "scheduled"
    },
    status: "scheduled"
  }
];

export default function LiveRace() {
  const isConfigured = isRaceManagerConfigured();
  
  const [activeCategory, setActiveCategory] = useState<string>("Tous");
  const [rankings, setRankings] = useState<ItemRanking[]>([]);
  const [passages, setPassages] = useState<ItemPassage[]>([]);
  const [duels, setDuels] = useState<ItemDuel[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "completed" | "scheduled">("all");
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isEmptyCollection, setIsEmptyCollection] = useState(false);
  const [isUsingDemo, setIsUsingDemo] = useState(!isConfigured);
  const [partnersList, setPartnersList] = useState<PartnerSponsor[]>([]);
  const [expandedPilotId, setExpandedPilotId] = useState<string | null>(null);

  // Listeners
  useEffect(() => {
    if (!isConfigured || !raceDb) {
      setRankings(DEMO_RANKINGS);
      setPassages(DEMO_PASSAGES);
      setDuels(DEMO_DUELS);
      setIsUsingDemo(true);
      setConnectionError(null);
      setIsEmptyCollection(false);
    } else {
      setLoading(true);
      setConnectionError(null);
      setIsEmptyCollection(false);

      const qPilots = query(collection(raceDb, "pilots"));
      const qRaces = query(collection(raceDb, "races"));

      let pilotsList: any[] = [];
      let racesList: any[] = [];
      let pilotsLoaded = false;
      let racesLoaded = false;

      const combineData = (rawPilots: any[], rawRaces: any[]) => {
        if (rawPilots.length === 0) {
          setRankings(DEMO_RANKINGS);
          setPassages(DEMO_PASSAGES);
          setIsUsingDemo(true);
          setIsEmptyCollection(true);
          setLoading(false);
          return;
        }

        // Map races by pilotId
        const racesByPilot: { [pilotId: string]: any[] } = {};
        rawRaces.forEach(run => {
          if (!run.pilotId) return;
          if (!racesByPilot[run.pilotId]) {
            racesByPilot[run.pilotId] = [];
          }
          racesByPilot[run.pilotId].push(run);
        });

        // 1. Compute rankings
        const list = rawPilots.map((pilotDoc) => {
          const pilotId = pilotDoc.id;
          const pilotRuns = racesByPilot[pilotId] || [];
          
          // Get completed runs and sort by passageNumber asc
          const completedRuns = pilotRuns
            .filter(run => run.status === "completed" && run.time !== undefined && run.time !== null)
            .sort((a, b) => (a.passageNumber || 0) - (b.passageNumber || 0));

          // Extract formatted chronos (laps), e.g. ["9.123s", "10.050s"]
          const chronosFormatted = completedRuns.map(run => formatTime(run.time));
          
          // Calculate cumulative time (sum of all completed passages)
          const validRuns = completedRuns.map(run => {
            const t = typeof run.time === "number" ? run.time : parseFloat(run.time);
            return isNaN(t) ? null : t;
          }).filter(t => t !== null) as number[];

          const totalTimeVal = validRuns.length > 0 
            ? validRuns.reduce((acc, curr) => acc + curr, 0)
            : null;

          const bestSingleLapVal = validRuns.length > 0
            ? Math.min(...validRuns)
            : null;

          const totalTimeStr = totalTimeVal !== null ? formatTime(totalTimeVal) : "--:--";
          const bestSingleLapStr = bestSingleLapVal !== null ? formatTime(bestSingleLapVal) : "--:--";

          const bikeModel = pilotDoc.motorcycle || pilotDoc.bike || pilotDoc.moto || "N/A";

          return {
            id: pilotId,
            name: pilotDoc.name || pilotDoc.pseudo || "Pilote",
            number: pilotDoc.number || pilotDoc.num || "N/A",
            bike: bikeModel,
            category: shortenCategory(pilotDoc.category || pilotDoc.classe || "Non-classé"),
            bestLap: totalTimeStr, // bestLap now holds the cumulative time for display
            bestLapNumeric: totalTimeVal,
            bestSingleLap: bestSingleLapStr,
            totalLaps: completedRuns.length,
            status: completedRuns.length > 0 ? "active" : "pit",
            chronos: chronosFormatted,
            points: 0
          } as ItemRanking;
        });

        // SORT BY CUMULATIVE TIME
        // 1. First by number of laps descending (who completed the most runs)
        // 2. Then by total cumulative time ascending
        const sortedList = list.sort((a, b) => {
          if (a.totalLaps !== b.totalLaps) {
            return b.totalLaps - a.totalLaps;
          }
          if (a.bestLapNumeric === null && b.bestLapNumeric === null) return 0;
          if (a.bestLapNumeric === null) return 1;
          if (b.bestLapNumeric === null) return -1;
          return a.bestLapNumeric - b.bestLapNumeric;
        });

        // Calculate positions and gaps relative to the general leader
        const listWithPositions = sortedList.map((item, idx) => {
          let gapStr = "--";
          if (idx === 0) {
            gapStr = item.bestLapNumeric !== null ? "Leader" : "--";
          } else if (item.bestLapNumeric !== null && sortedList[0].bestLapNumeric !== null) {
            const diff = item.bestLapNumeric - sortedList[0].bestLapNumeric;
            gapStr = diff >= 0 ? `+${diff.toFixed(3)}s` : `${diff.toFixed(3)}s`;
          }
          return {
            ...item,
            position: item.bestLapNumeric !== null ? idx + 1 : 999, // Unranked at the end
            gap: gapStr
          } as ItemRanking;
        });

        // 2. Compute passages (Timeline)
        const pilotsById: { [id: string]: any } = {};
        rawPilots.forEach(p => {
          pilotsById[p.id] = p;
        });

        const getSeconds = (st: any) => {
          if (!st) return 0;
          if (st.seconds !== undefined) return st.seconds;
          if (typeof st === "number") return st / 1000;
          if (typeof st === "string") return new Date(st).getTime() / 1000;
          return 0;
        };

        const mappedPassages = rawRaces.map((run: any) => {
          const pilot = pilotsById[run.pilotId] || {};
          const numericTime = typeof run.time === "number" ? run.time : (run.time ? parseFloat(run.time) : null);
          return {
            id: run.id,
            pilotId: run.pilotId,
            pilotName: pilot.name || "Pilote Inconnu",
            pilotNumber: pilot.number || pilot.num || "N/A",
            pilotBike: pilot.motorcycle || pilot.bike || pilot.moto || "N/A",
            category: shortenCategory(run.category || pilot.category || "Non-classé"),
            passageNumber: run.passageNumber || 1,
            scheduledTime: run.scheduledTime,
            status: run.status || "scheduled",
            time: run.time !== undefined && run.time !== null ? formatTime(run.time) : null,
            timeNumeric: numericTime && !isNaN(numericTime) ? numericTime : null
          } as ItemPassage;
        });

        // Compute duels (C'est qui VS qui)
        const duelsMap: { [seconds: number]: ItemPassage[] } = {};
        mappedPassages.forEach(passage => {
          const secs = getSeconds(passage.scheduledTime);
          if (!secs) return;
          if (!duelsMap[secs]) {
            duelsMap[secs] = [];
          }
          duelsMap[secs].push(passage);
        });

        const calculatedDuels: ItemDuel[] = [];
        Object.entries(duelsMap).forEach(([secsStr, list]) => {
          for (let i = 0; i < list.length; i += 2) {
            const p1 = list[i];
            const p2 = list[i + 1] || null;

            let duelStatus: "completed" | "scheduled" | "live" = "scheduled";
            if (p2) {
              if (p1.status === "completed" && p2.status === "completed") {
                duelStatus = "completed";
              } else if (p1.status === "completed" || p2.status === "completed") {
                duelStatus = "live";
              }
            } else {
              if (p1.status === "completed") {
                duelStatus = "completed";
              }
            }

            calculatedDuels.push({
              id: `${secsStr}-${i}`,
              scheduledTime: p1.scheduledTime,
              category: p1.category || (p2 ? p2.category : ""),
              passageNumber: p1.passageNumber,
              pilot1: p1,
              pilot2: p2,
              status: duelStatus
            });
          }
        });

        // Sort duels: passageNumber ascending (Manche 1, then Manche 2, then Manche 3)
        const sortedDuels = calculatedDuels.sort((a, b) => {
          if (a.passageNumber !== b.passageNumber) {
            return a.passageNumber - b.passageNumber;
          }
          return getSeconds(a.scheduledTime) - getSeconds(b.scheduledTime);
        });

        // Sort passages: scheduledTime descending (most recent first)
        const sortedPassages = [...mappedPassages].sort((a, b) => {
          return getSeconds(b.scheduledTime) - getSeconds(a.scheduledTime);
        });

        setRankings(listWithPositions);
        setPassages(sortedPassages);
        setDuels(sortedDuels);
        setIsUsingDemo(false);
        setIsEmptyCollection(false);
        setLoading(false);
      };

      const unsubPilots = onSnapshot(qPilots, (snapshot) => {
        pilotsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        pilotsLoaded = true;
        if (racesLoaded) {
          combineData(pilotsList, racesList);
        } else {
          combineData(pilotsList, []);
        }
      }, (error) => {
        console.warn("Could not load real-time 'pilots'. Using demo standby.", error);
        setConnectionError(error?.message || String(error));
        setRankings(DEMO_RANKINGS);
        setPassages(DEMO_PASSAGES);
        setDuels(DEMO_DUELS);
        setIsUsingDemo(true);
        setLoading(false);
      });

      const unsubRaces = onSnapshot(qRaces, (snapshot) => {
        racesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        racesLoaded = true;
        if (pilotsLoaded) {
          combineData(pilotsList, racesList);
        }
      }, (error) => {
        console.warn("Could not load real-time 'races'.", error);
      });

      return () => {
        unsubPilots();
        unsubRaces();
      };
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
  const baseFilteredRankings = activeCategory === "Tous" 
    ? rankings 
    : rankings.filter(r => r.category === activeCategory);

  // Map to add dynamic position and gap relative to the active category's leader
  const activeRankings = baseFilteredRankings.map((item, idx) => {
    const displayPos = idx + 1;
    let displayGap = "--";
    
    if (idx === 0) {
      displayGap = item.bestLapNumeric !== null && item.bestLapNumeric !== undefined ? "Leader" : "--";
    } else if (item.bestLapNumeric !== null && item.bestLapNumeric !== undefined && baseFilteredRankings[0].bestLapNumeric !== null && baseFilteredRankings[0].bestLapNumeric !== undefined) {
      const diff = item.bestLapNumeric - baseFilteredRankings[0].bestLapNumeric;
      displayGap = `+${diff.toFixed(3)}s`;
    }

    return {
      ...item,
      displayPosition: displayPos,
      displayGap: displayGap
    };
  });

  const sponsors = partnersList.filter(p => p.type === "Sponsor");
  const partnersOnly = partnersList.filter(p => !p.type || p.type === "Partenaire");

  // Compute filtered passages for the real-time timeline
  const filteredPassages = passages.filter(p => {
    // Status filter
    if (timelineFilter === "completed" && p.status !== "completed") return false;
    if (timelineFilter === "scheduled" && p.status !== "scheduled") return false;
    
    // Category filter (synchronized with activeCategory)
    if (activeCategory !== "Tous" && p.category !== activeCategory) return false;
    
    return true;
  });

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
                <div className="flex items-center gap-2 mb-1.5 font-mono">
                  <span className="flex h-2 w-2 relative">
                    {connectionError ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </>
                    ) : isEmptyCollection ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </>
                    ) : isUsingDemo ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </>
                    )}
                  </span>
                  <span className={`text-xs uppercase tracking-widest font-bold ${
                    connectionError ? "text-red-400" :
                    isEmptyCollection ? "text-amber-400" :
                    isUsingDemo ? "text-yellow-400" :
                    "text-green-400"
                  }`}>
                    {connectionError ? "Erreur de Connexion" :
                     isEmptyCollection ? "Base de données vide" :
                     isUsingDemo ? "Standby de Démo" :
                     "Connexion Temps Réel Active"}
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

        {/* Connection Error Banner */}
        {connectionError && (
          <div className="mb-10 bg-gradient-to-r from-red-950/40 to-black border border-red-500/30 rounded-3xl p-6 md:p-8 flex flex-col items-start gap-4 backdrop-blur-md">
            <div className="flex gap-4 items-start w-full">
              <div className="p-3 bg-red-500/15 rounded-2xl border border-red-500/30 shrink-0 text-red-500">
                <Database className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-lg text-white">
                  Impossible de charger les données du "Race Manager"
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  L'application a tenté de se connecter à la base de données secondaire de votre Race Manager (<code className="text-red-400 px-1 py-0.5 rounded bg-red-500/10 font-mono text-xs">{raceConfig.firestoreDatabaseId}</code>), mais une erreur est survenue :
                </p>
                <div className="p-3.5 bg-black/60 rounded-xl border border-white/5 font-mono text-xs text-red-400 break-all">
                  Firebase error: {connectionError}
                </div>
                <div className="pt-2 text-sm text-gray-400 space-y-2">
                  <p className="font-semibold text-white">🔑 Causes fréquentes & solutions :</p>
                  <ul className="list-disc pl-5 space-y-2 mt-1 text-xs text-gray-300">
                    <li>
                      <strong className="text-white font-semibold">Règles de sécurité Firestore (Permissions) :</strong> La base de données secondaire de votre "Race Manager" bloque l'accès en lecture. À la racine du projet "Race Manager", ouvrez le fichier <code className="text-white px-1 py-0.5 rounded bg-white/5 font-mono">firestore.rules</code> et assurez-vous de permettre l'accès en lecture publique pour la collection des pilotes, par exemple :
                      <pre className="mt-1.5 p-2 bg-black/40 rounded border border-white/5 text-gray-400 font-mono text-[10px] overflow-x-auto text-left whitespace-pre-wrap">
{`match /pilots/{id} {
  allow read: if true;
}`}
                      </pre>
                    </li>
                    <li>
                      <strong className="text-white font-semibold">Clés de configuration :</strong> Vérifiez que les identifiants copiés dans <code className="text-white px-1 font-mono rounded bg-white/5">src/race-manager-config.json</code> sont bien ceux de l'application "Petit à Petit - Race Manager" et que le projet est actif.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty Collection Warning */}
        {isEmptyCollection && (
          <div className="mb-10 bg-gradient-to-r from-amber-950/40 to-black border border-amber-500/30 rounded-3xl p-6 md:p-8 flex flex-col items-start gap-4 backdrop-blur-md">
            <div className="flex gap-4 items-start w-full">
              <div className="p-3 bg-amber-500/15 rounded-2xl border border-amber-500/30 shrink-0 text-amber-500">
                <Database className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-lg text-white">
                  Connexion établie, mais la collection est vide !
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  L'application s'est correctement connectée à la base de données secondaire (<code className="text-amber-400 px-1 py-0.5 rounded bg-amber-500/10 font-mono text-xs">{raceConfig.firestoreDatabaseId}</code>), mais la collection de documents <code className="text-amber-400 px-1 py-0.5 rounded bg-amber-500/10 font-mono text-xs">"pilots"</code> est vide ou inexistante.
                </p>
                <div className="pt-2 text-sm text-gray-400 space-y-2">
                  <p className="font-semibold text-white">🔎 Que faire ?</p>
                  <ul className="list-disc pl-5 space-y-2 mt-1 text-xs text-gray-300">
                    <li>
                      <strong className="text-white font-medium">Créer des pilotes dans Race Manager :</strong> Ouvrez votre application "Race Manager" et assurez-vous d'avoir enregistré des pilotes pour la course. Ils s'afficheront automatiquement ici dès qu'ils seront ajoutés.
                    </li>
                    <li>
                      <strong className="text-white font-medium">Nom de la collection différent :</strong> Si l'application Race Manager utilise un nom de collection différent de <code className="text-white px-1 font-mono rounded bg-white/5">"pilots"</code> (comme <code className="text-white px-1 font-mono rounded bg-white/5">"pilotes"</code> ou <code className="text-white px-1 font-mono rounded bg-white/5">"classement"</code>), cela explique pourquoi aucun document n'est trouvé.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup instruction if using standy demo */}
        {isUsingDemo && !connectionError && !isEmptyCollection && (
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

        {/* Classement Live (Full Width) */}
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
          ) : activeRankings.length === 0 ? (
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
                      <th className="pb-4 font-normal text-right">Cumul</th>
                      <th className="pb-4 font-normal text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeRankings.map((item, index) => {
                      let posBg = "bg-white/5 text-gray-400";
                      if (item.displayPosition === 1) posBg = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20";
                      if (item.displayPosition === 2) posBg = "bg-slate-300/20 text-slate-300 border border-slate-300/10";
                      if (item.displayPosition === 3) posBg = "bg-amber-700/20 text-amber-500 border border-amber-500/10";

                      const isExpanded = expandedPilotId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            className={`group hover:bg-white/[0.02] cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.01]' : ''}`}
                            onClick={() => setExpandedPilotId(isExpanded ? null : item.id)}
                          >
                            <td className="py-4">
                              <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono font-bold ${posBg}`}>
                                {item.displayPosition}
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
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    {item.status === "pit" && (
                                      <span className="text-[10px] font-mono text-amber-500 font-bold uppercase">⏱ Stand</span>
                                    )}
                                    {activeCategory !== "Tous" && (
                                      <span className="text-[9px] font-mono text-gray-500 font-bold uppercase bg-white/5 border border-white/5 px-1 py-0.2 rounded">Gén: #{item.position}</span>
                                    )}
                                  </div>
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
                            <td className="py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono font-bold text-red-500">
                                  {item.bestLap}
                                </span>
                                {item.chronos && item.chronos.length > 0 ? (
                                  <span className="text-[9px] font-mono text-gray-500 group-hover:text-red-400 font-medium transition-colors mt-0.5">
                                    {item.chronos.length} chrono{item.chronos.length > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono text-gray-600 mt-0.5">Aucun tour</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 font-mono text-xs text-right text-gray-500">
                              {item.displayGap}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-white/[0.01]">
                              <td colSpan={6} className="px-4 py-3 border-b border-white/5">
                                <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                  <h4 className="text-xs uppercase tracking-widest text-red-500 font-mono font-bold mb-3 flex items-center gap-2">
                                    <span>⏱️</span> Historique des Chronos (Tours)
                                  </h4>
                                  {item.chronos && item.chronos.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {item.chronos.map((chrono, idx) => {
                                        const isBest = item.bestSingleLap ? chrono === item.bestSingleLap : chrono === item.bestLap;
                                        return (
                                          <div 
                                            key={idx} 
                                            className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-2 transition-all ${
                                              isBest 
                                                ? "bg-red-600/20 border-red-500/40 text-red-400 font-bold shadow-lg shadow-red-500/5" 
                                                : "bg-white/5 border-white/5 text-gray-300"
                                            }`}
                                          >
                                            <span className="text-[10px] text-gray-500 font-bold">T{idx + 1} :</span>
                                            <span>{chrono}</span>
                                            {isBest && <span className="text-[9px] bg-red-600 text-white px-1 rounded uppercase font-sans font-bold">Best</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500 italic">Aucun temps au tour enregistré pour le moment.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {activeRankings.map((item) => {
                  let posBg = "bg-white/5 text-gray-400";
                  let cardBorder = "border-white/5";
                  if (item.displayPosition === 1) {
                    posBg = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20";
                    cardBorder = "border-yellow-500/10";
                  }
                  if (item.displayPosition === 2) {
                    posBg = "bg-slate-300/20 text-slate-300 border border-slate-300/10";
                    cardBorder = "border-slate-300/10";
                  }
                  if (item.displayPosition === 3) {
                    posBg = "bg-amber-700/20 text-amber-500 border border-amber-500/10";
                    cardBorder = "border-amber-500/10";
                  }

                  const isExpanded = expandedPilotId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setExpandedPilotId(isExpanded ? null : item.id)}
                      className={`p-4 bg-white/[0.02] border ${cardBorder} rounded-2xl flex flex-col cursor-pointer transition-all hover:bg-white/[0.04] ${isExpanded ? 'bg-white/[0.04]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-xl text-xs font-mono font-bold ${posBg}`}>
                            {item.displayPosition}
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
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-gray-400 font-bold">
                                {item.category}
                              </span>
                              {item.status === "pit" && (
                                <span className="text-[9px] font-mono text-amber-500 font-bold uppercase bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">⏱ Stand</span>
                              )}
                              {activeCategory !== "Tous" && (
                                <span className="text-[9px] font-mono text-gray-500 font-bold uppercase bg-white/5 border border-white/5 px-1 py-0.2 rounded">Gén: #{item.position}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col shrink-0 items-end">
                          <span className="font-mono font-bold text-red-500 text-sm">
                            {item.bestLap}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 mt-0.5">
                            {item.displayGap}
                          </span>
                          {item.chronos && item.chronos.length > 0 && (
                            <span className="text-[8px] font-mono text-gray-500 mt-1 uppercase">
                              {item.chronos.length} chrono{item.chronos.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 bg-black/40 border border-white/5 rounded-xl p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <h4 className="text-[10px] uppercase tracking-widest text-red-500 font-mono font-bold flex items-center gap-1.5">
                            <span>⏱️</span> Historique des Chronos (Tours)
                          </h4>
                          {item.chronos && item.chronos.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.chronos.map((chrono, idx) => {
                                const isBest = item.bestSingleLap ? chrono === item.bestSingleLap : chrono === item.bestLap;
                                return (
                                  <div 
                                    key={idx} 
                                    className={`px-2 py-1 rounded-lg border font-mono text-[10px] flex items-center gap-1.5 transition-all ${
                                      isBest 
                                        ? "bg-red-600/20 border-red-500/40 text-red-400 font-bold" 
                                        : "bg-white/5 border-white/5 text-gray-400"
                                    }`}
                                  >
                                    <span className="text-[9px] text-gray-500">T{idx + 1}:</span>
                                    <span>{chrono}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500 italic">Aucun temps enregistré.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>



        {/* DUELS (C'est qui VS qui) Section */}
        <div className="mt-8 bg-white/5 border border-white/5 rounded-3xl p-5 md:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-red-500 animate-pulse" />
              <div>
                <h3 className="font-display text-xl uppercase tracking-wider text-white">Face-à-Face</h3>
                <p className="text-xs text-gray-400 font-mono uppercase mt-0.5">C'est qui VS qui ?</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 font-mono text-[10px] bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl text-gray-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{duels.filter(d => activeCategory === "Tous" || d.category === activeCategory).length} Départ(s)</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-6 -mt-2">
            Affichage en temps réel des confrontations directes programmées pour chaque série de départs de l'événement.
          </p>

          <div className="space-y-4">
            {duels.filter(d => activeCategory === "Tous" || d.category === activeCategory).length === 0 ? (
              <div className="py-16 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl">
                <p className="text-xs">Aucun duel en face-à-face à afficher.</p>
                {activeCategory !== "Tous" && (
                  <p className="text-[10px] text-gray-600 mt-1">Filtre actif : {activeCategory}</p>
                )}
              </div>
            ) : (
              duels
                .filter(d => activeCategory === "Tous" || d.category === activeCategory)
                .map((duel) => {
                  const isCompleted = duel.status === "completed";
                  const isLive = duel.status === "live";
                  
                  // Compare times to find the winner safely
                  const t1 = duel.pilot1.timeNumeric;
                  const t2 = duel.pilot2 ? duel.pilot2.timeNumeric : null;
                  const hasWinner = isCompleted && t1 !== null && t2 !== null;
                  const isP1Winner = hasWinner && t1! < t2!;
                  const isP2Winner = hasWinner && t2! < t1!;
                  const winnerName = isP1Winner 
                    ? duel.pilot1.pilotName 
                    : isP2Winner && duel.pilot2 
                    ? duel.pilot2.pilotName 
                    : null;

                  return (
                    <div 
                      key={duel.id} 
                      className={`bg-black/45 border rounded-2xl p-2.5 min-[380px]:p-3.5 sm:p-4 flex flex-col hover:bg-white/[0.03] transition-all duration-300 ${
                        isCompleted && winnerName
                          ? "border-yellow-500/10 hover:border-yellow-500/20"
                          : "border-white/5 hover:border-red-500/20"
                      }`}
                    >
                      {/* Card Header (Metadata & Status) */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2.5 font-mono text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
                          <span className="font-bold text-white">{formatScheduledTime(duel.scheduledTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="bg-white/5 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded text-gray-400 border border-white/5">
                            Manche {duel.passageNumber}
                          </span>
                          <span className="bg-red-500/10 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded text-red-400 border border-red-500/10 font-bold">
                            {duel.category}
                          </span>
                        </div>
                      </div>

                      {/* Matchup Body: Grid (1fr auto 1fr) for perfect horizontal balancing on all screens */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 min-[380px]:gap-2 sm:gap-3 md:gap-4">
                        
                        {/* Pilot 1 */}
                        <div className={`flex items-center gap-1 min-[380px]:gap-2 sm:gap-3 justify-end text-right min-w-0 transition-opacity ${
                          isCompleted && isP2Winner ? 'opacity-40' : 'opacity-100'
                        }`}>
                          <div className="flex flex-col items-end min-w-0">
                            <span className="font-bold text-[9px] min-[380px]:text-[10px] sm:text-xs md:text-sm text-white truncate w-full flex items-center gap-1 justify-end">
                              {isP1Winner && <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-yellow-500 shrink-0 animate-bounce" />}
                              <span className="truncate">{duel.pilot1.pilotName}</span>
                            </span>
                            <span className="text-[7px] min-[380px]:text-[8px] sm:text-[9px] md:text-[10px] text-gray-400 truncate w-full font-mono">
                              {duel.pilot1.pilotBike}
                            </span>
                            {duel.pilot1.time && (
                              <span className={`font-mono text-[7px] min-[380px]:text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded mt-1 ${
                                isP1Winner 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                  : 'bg-white/5 text-gray-400 border border-white/5'
                              }`}>
                                {duel.pilot1.time}
                              </span>
                            )}
                          </div>
                          
                          {/* Number Badge */}
                          <span className={`w-6 h-6 min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-md min-[380px]:rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] min-[380px]:text-[10px] sm:text-xs md:text-sm font-mono font-bold shrink-0 border transition-all ${
                            isP1Winner 
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]" 
                              : duel.pilot1.status === "completed" 
                              ? "bg-green-500/10 border-green-500/20 text-green-500"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          }`}>
                            {duel.pilot1.pilotNumber}
                          </span>
                        </div>

                        {/* VS Bubble */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <div className={`w-6 h-6 min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[8px] min-[380px]:text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider font-mono shadow-md border ${
                            isCompleted
                              ? "bg-white/5 text-gray-500 border-white/5"
                              : isLive
                              ? "bg-red-600 text-white animate-pulse border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.3)]"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            VS
                          </div>
                        </div>

                        {/* Pilot 2 */}
                        {duel.pilot2 ? (
                          <div className={`flex items-center gap-1 min-[380px]:gap-2 sm:gap-3 justify-start text-left min-w-0 transition-opacity ${
                            isCompleted && isP1Winner ? 'opacity-40' : 'opacity-100'
                          }`}>
                            {/* Number Badge */}
                            <span className={`w-6 h-6 min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-md min-[380px]:rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] min-[380px]:text-[10px] sm:text-xs md:text-sm font-mono font-bold shrink-0 border transition-all ${
                              isP2Winner 
                                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]" 
                                : duel.pilot2.status === "completed" 
                                ? "bg-green-500/10 border-green-500/20 text-green-500"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            }`}>
                              {duel.pilot2.pilotNumber}
                            </span>

                            <div className="flex flex-col items-start min-w-0">
                              <span className="font-bold text-[9px] min-[380px]:text-[10px] sm:text-xs md:text-sm text-white truncate w-full flex items-center gap-1 justify-start">
                                <span className="truncate">{duel.pilot2.pilotName}</span>
                                {isP2Winner && <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-yellow-500 shrink-0 animate-bounce" />}
                              </span>
                              <span className="text-[7px] min-[380px]:text-[8px] sm:text-[9px] md:text-[10px] text-gray-400 truncate w-full font-mono">
                                {duel.pilot2.pilotBike}
                              </span>
                              {duel.pilot2.time && (
                                <span className={`font-mono text-[7px] min-[380px]:text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded mt-1 ${
                                  isP2Winner 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : 'bg-white/5 text-gray-400 border border-white/5'
                                }`}>
                                  {duel.pilot2.time}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 min-[380px]:gap-2 sm:gap-3 justify-start text-left min-w-0 opacity-50">
                            {/* Number Badge */}
                            <span className="w-6 h-6 min-[380px]:w-7 min-[380px]:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-md min-[380px]:rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] min-[380px]:text-[10px] sm:text-xs md:text-sm font-mono font-bold shrink-0 border border-dashed border-white/10 bg-white/[0.02] text-gray-600">
                              --
                            </span>

                            <div className="flex flex-col items-start min-w-0">
                              <span className="font-bold text-[9px] min-[380px]:text-[10px] sm:text-xs md:text-sm text-gray-500 italic truncate w-full">
                                Seul en piste
                              </span>
                              <span className="text-[7px] min-[380px]:text-[8px] sm:text-[9px] md:text-[10px] text-gray-600 truncate w-full font-mono">
                                Pas d'adversaire
                              </span>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Card Footer (Confrontation status information) */}
                      {isCompleted && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-gray-500">
                          <span>Matchup Direct</span>
                          {duel.pilot2 ? (
                            winnerName ? (
                              <span className="text-gray-300">
                                Vainqueur : <strong className="text-yellow-500 font-bold uppercase">{winnerName}</strong>
                              </span>
                            ) : (
                              <span className="text-gray-400">Égalité</span>
                            )
                          ) : (
                            <span className="text-green-400">Run validé</span>
                          )}
                        </div>
                      )}
                      
                      {isLive && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-red-400 animate-pulse">
                          <span>Direct Live</span>
                          <span className="font-bold uppercase flex items-center gap-1 text-[8px] sm:text-[9px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            Confrontation en cours
                          </span>
                        </div>
                      )}

                      {!isCompleted && !isLive && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-amber-500">
                          <span>Confrontation</span>
                          <span className="font-semibold uppercase text-[8px] sm:text-[9px]">En attente</span>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
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
