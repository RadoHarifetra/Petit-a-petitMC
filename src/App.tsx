import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Home";
import Agenda from "./components/Agenda";
import Shop from "./components/Shop";
import Bikers from "./components/Bikers";
import PastEvents from "./components/PastEvents";
import AdminDashboard from "./components/AdminDashboard";
import ErrorBoundary from "./components/ErrorBoundary";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-red-500 selection:text-white flex flex-col">
      {/* Progress Bar */}
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
