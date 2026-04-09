import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Bike, Calendar, ShoppingBag, Users, Image as ImageIcon, Home } from "lucide-react";
import AdminLogin from "./AdminLogin";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Agenda", path: "/agenda", icon: Calendar },
    { name: "Shop", path: "/shop", icon: ShoppingBag },
    { name: "Le Crew", path: "/bikers", icon: Users },
    { name: "Events", path: "/events", icon: ImageIcon }
  ];

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 py-3 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-5 group cursor-pointer">
          <img 
            src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1772705541/LOGO_FINAL_l1f3td.png" 
            alt="Petit à Petit MC Logo" 
            className="w-14 h-14 object-contain group-hover:scale-110 transition-transform"
            referrerPolicy="no-referrer"
          />
          <h2 className="font-display text-2xl uppercase tracking-tighter">
            Petit à <span className="text-red-500">Petit MC</span>
          </h2>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`text-lg font-display uppercase tracking-widest flex items-center gap-2 transition-all ${
                location.pathname === item.path ? "text-red-600" : "text-white/70 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
          <div className="h-4 w-px bg-white/10 mx-2" />
          <AdminLogin />
        </div>

        {/* Mobile Toggle */}
        <button 
          className="lg:hidden p-2 text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden lg:hidden"
          >
            <div className="p-8 flex flex-col gap-6">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`text-lg font-display uppercase tracking-widest flex items-center gap-4 ${
                    location.pathname === item.path ? "text-red-500" : "text-white"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 text-red-500" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/10">
                <AdminLogin />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
