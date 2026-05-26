import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Truck, 
  Package, 
  History, 
  Settings, 
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { logOut } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/quotes", icon: FileText, label: "Devis" },
    { to: "/tracking", icon: Truck, label: "Suivi" },
    { to: "/warehouse", icon: Package, label: "Entrepôt" },
    { to: "/history", icon: History, label: "Historique" },
    { to: "/clients", icon: Users, label: "Clients" },
    { to: "/forwarders", icon: Truck, label: "Transitaires" },
    { to: "/settings", icon: Settings, label: "Paramètres" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-card border border-border-dim rounded-md md:hidden text-white"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.div 
        initial={false}
        animate={{ 
          x: isOpen || !isMobile ? 0 : -280,
          opacity: 1
        }}
        className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border-dim z-40 flex flex-col pt-16 md:pt-6"
      >
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-white">UNIVERSAL</span>
            <span className="text-xs text-accent tracking-[0.4em] font-bold">PARTS</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleLinkClick}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-md transition-all group
                ${isActive ? 'bg-accent/10 border-l-4 border-accent text-accent' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border-dim">
          <button 
            onClick={logOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-danger hover:bg-danger/10 rounded-md transition-all font-bold uppercase tracking-widest text-sm"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
