import React from 'react';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      {/* Halo Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="industrial-card w-full max-w-md relative z-10 text-center"
      >
        <div className="mb-8">
          <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/30">
            <LogIn className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.3em] mb-2 text-white">UNIVERSAL PARTS</h1>
          <p className="text-gray-400 uppercase text-xs tracking-widest">Logistics Control System</p>
        </div>

        <button 
          onClick={signInWithGoogle}
          className="btn-primary w-full flex items-center justify-center gap-3 py-4"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa_site_kit/google_signin_small.png" alt="Google" className="w-5 h-5" />
          COMMENCE MISSION
        </button>

        <p className="mt-8 text-[10px] text-gray-500 uppercase tracking-widest">
          Authorized Personnel Only // Restricted Access
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
