import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import { Helmet } from "react-helmet-async";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Home";
import Agenda from "./components/Agenda";
import Shop from "./components/Shop";
import Bikers from "./components/Bikers";
import PastEvents from "./components/PastEvents";
import AdminDashboard from "./components/AdminDashboard";
import LiveRace from "./components/LiveRace";
import ErrorBoundary from "./components/ErrorBoundary";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function SEO() {
  const { pathname } = useLocation();

  const metas: Record<string, { title: string; description: string }> = {
    "/": {
      title: "Petit à Petit MC — Moto Club Madagascar",
      description: "Le club de moto incontournable de Madagascar. Événements, drag racing, sorties et communauté de passionnés.",
    },
    "/agenda": {
      title: "Agenda — Petit à Petit MC",
      description: "Retrouvez tous les événements à venir du Petit à Petit Moto Club : courses, rassemblements, sorties.",
    },
    "/shop": {
      title: "Shop — Petit à Petit MC",
      description: "Découvrez les produits officiels du Petit à Petit Moto Club Madagascar.",
    },
    "/bikers": {
      title: "Nos Bikers — Petit à Petit MC",
      description: "Rencontrez les membres du Petit à Petit Moto Club, passionnés de moto à Madagascar.",
    },
    "/events": {
      title: "Événements passés — Petit à Petit MC",
      description: "Revivez les meilleurs moments et événements passés du Petit à Petit Moto Club.",
    },
    "/live": {
      title: "Live Race — Petit à Petit MC",
      description: "Suivez les courses en direct du Petit à Petit Moto Club Madagascar.",
    },
  };

  const meta = metas[pathname] ?? {
    title: "Petit à Petit MC — Moto Club Madagascar",
    description: "Le club de moto incontournable de Madagascar.",
  };

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={`https://www.petitapetitmotardclub.com${pathname}`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <link rel="canonical" href={`https://www.petitapetitmotardclub.com${pathname}`} />
    </Helmet>
  );
}

function AppContent() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-red-500 selection:text-white flex flex-col">
      <SEO />
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-red-600 origin-left z-[100]"
        style={{ scaleX }}
      />
      <Navbar />
      <ScrollToTop />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/bikers" element={<Bikers />} />
          <Route path="/events" element={<PastEvents />} />
          <Route path="/live" element={<LiveRace />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
