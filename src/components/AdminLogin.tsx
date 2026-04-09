import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, X, ShieldAlert, Chrome, LayoutDashboard, LogOut } from "lucide-react";
import { signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && isOpen) {
        setIsOpen(false);
        navigate("/admin");
      }
    });
    return () => unsubscribe();
  }, [isOpen, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Modal will close via useEffect
    } catch (err: any) {
      setError("Identifiants invalides ou accès refusé.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Modal will close via useEffect
    } catch (err: any) {
      // Only show error if user is not actually signed in
      if (!auth.currentUser) {
        if (err.code === 'auth/popup-closed-by-user') {
          setError("La fenêtre de connexion a été fermée avant la fin.");
        } else if (err.code === 'auth/cancelled-popup-request') {
          // Ignore multiple popup requests
        } else {
          setError("Erreur lors de la connexion Google : " + (err.message || "Erreur inconnue"));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <button 
              onClick={() => navigate("/admin")}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-lg font-display uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => setIsOpen(true)}
            className="text-lg font-display uppercase tracking-widest text-white hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Admin
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass p-8 rounded-3xl"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-display uppercase">Accès Admin</h2>
                <p className="text-gray-400 text-sm">Gestion du club Petit à Petit MC</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Chrome className="w-5 h-5" />
                  Continuer avec Google
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#050505] px-2 text-gray-500 font-mono">Ou email</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Mot de passe</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
