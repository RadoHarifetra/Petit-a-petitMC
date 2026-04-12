import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, ShoppingBag, MessageCircle, CheckCircle2, Tag } from "lucide-react";
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import { X, Check } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

const formatMGA = (value: any) => {
  if (value === null || value === undefined || value === '') return '0 Ar';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : Number(value);
  if (isNaN(num)) return String(value || '0');
  return new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(num).replace('MGA', 'Ar');
};

export default function Shop() {
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    contact: ""
  });
  
  const features = [
    "Cortège de 3 à 15 motos de prestige",
    "Tenue de club coordonnée et élégante",
    "Sécurisation des carrefours et fluidification du trajet",
    "Séance photo avec les mariés et les machines",
    "Disponibilité sur tout le périmètre d'Antananarivo"
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const q = query(collection(db, "shop"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "shop");
      setIsLoading(false);
    });
    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribe();
    };
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "orders"), {
        name: formData.name,
        contact: formData.contact,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        createdAt: new Date().toISOString(),
        status: "new"
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedProduct(null);
        setFormData({ name: "", contact: "" });
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "orders");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ["Tous", "Équipement", "Accessoires", "Vêtements", "Moto", "Pièce"];
  const filteredProducts = filter === "Tous" 
    ? products 
    : products.filter(p => p.type === filter);

  return (
    <section id="shop" className="py-32 bg-[#050505] relative overflow-hidden">
      {/* Background Text Accent */}
      <div className="absolute top-0 right-0 text-[20vw] font-display text-white/[0.02] leading-none select-none pointer-events-none translate-x-1/4 -translate-y-1/4">
        SHOP
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col mb-24 gap-8">
          <div className="max-w-2xl">
            <span className="micro-label text-red-500 mb-4 block">Services & Équipements</span>
            <h2 className="section-title">
              Le <span className="text-red-500">Shop</span>
            </h2>
          </div>
          <p className="body-text max-w-lg border-l border-red-500/30 pl-6">
            Services de prestige et équipements de haute qualité pour les passionnés de la route.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-48">
          {/* Premium Service Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -left-12 top-0 w-1 h-24 bg-red-600 hidden md:block" />
              <span className="micro-label text-red-500 mb-6 block">Service de Prestige</span>
              <h3 className="font-display text-4xl md:text-6xl uppercase tracking-tighter leading-[0.9] mb-8">
                Escorte <span className="text-red-500 skew-x-brutal inline-block">Mariage</span> & Prestige
              </h3>

              {/* Mobile Images */}
              <div className="lg:hidden mb-12">
                <div className="grid grid-cols-2 gap-4">
                  <img 
                    src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1773057769/2026-03-09-15-00-32-318.jpg_yipnwu.jpg" 
                    alt="Escorte Prestige 1" 
                    className={`w-full aspect-[3/4] object-cover ${isMobile ? "grayscale-0" : "grayscale"}`}
                    referrerPolicy="no-referrer"
                  />
                  <img 
                    src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1773057769/2026-03-09-14-59-45-910.jpg_onugka.jpg" 
                    alt="Escorte Prestige 2" 
                    className={`w-full aspect-[3/4] object-cover ${isMobile ? "grayscale-0" : "grayscale"} mt-12`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <p className="body-text text-xl mb-12 max-w-lg">
                Faites de votre entrée un moment inoubliable. Notre club propose un service d'escorte professionnel pour vos mariages et événements de prestige à Antananarivo.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border border-white/5 bg-zinc-950/50 group hover:border-red-500/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>

              <a 
                href="https://wa.me/261340767905"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-6 text-2xl font-display uppercase tracking-tighter hover:text-red-500 transition-colors"
              >
                <span className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:border-red-500 group-hover:bg-red-500 transition-all">
                  <MessageCircle className="w-8 h-8" />
                </span>
                Demander un devis
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative hidden lg:block"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img 
                    src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1773057769/2026-03-09-15-00-32-318.jpg_yipnwu.jpg" 
                    alt="Escorte Prestige 1" 
                    className={`w-full aspect-[3/4] object-cover ${isMobile ? "grayscale-0" : "grayscale"} hover:grayscale-0 transition-all duration-1000`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-4 pt-24">
                  <img 
                    src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1773057769/2026-03-09-14-59-45-910.jpg_onugka.jpg" 
                    alt="Escorte Prestige 2" 
                    className={`w-full aspect-[3/4] object-cover ${isMobile ? "grayscale-0" : "grayscale"} hover:grayscale-0 transition-all duration-1000`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-red-600/10 blur-[80px] rounded-full -z-10" />
            </motion.div>
          </div>

          {/* Boutique Section */}
          <div id="boutique">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div>
                <span className="micro-label text-red-500 mb-4 block">La Boutique</span>
                <h3 className="font-display text-4xl md:text-6xl uppercase tracking-tighter leading-[0.9]">Articles <span className="text-red-500">Club</span></h3>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`micro-label px-8 py-3 border transition-all ${
                      filter === cat 
                        ? "bg-red-600 border-red-600 !text-white" 
                        : "bg-transparent border-white/10 !text-white hover:border-white/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-white/10">
              {isLoading ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                  <LoadingSpinner size="lg" />
                  <p className="micro-label">Chargement du Shop...</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredProducts.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-20 text-center text-gray-500"
                    >
                      Aucun article disponible pour le moment.
                    </motion.div>
                  ) : (
                    filteredProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-12 border-r border-b border-white/10 last:border-r-0 lg:[&:nth-child(3n)]:border-r-0 group hover:bg-zinc-900 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-0 bg-red-600 group-hover:h-full transition-all duration-500" />
                      
                      <div className="aspect-square overflow-hidden mb-8 relative">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className={`w-full h-full object-cover ${isMobile ? "grayscale-0" : "grayscale"} group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute top-0 right-0 p-4">
                          <span className="micro-label bg-black/80 px-3 py-1 text-red-500 backdrop-blur-sm">
                            {product.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="card-title group-hover:text-red-500 transition-colors">{product.name}</h4>
                          <span className="text-red-500 font-display text-2xl">{formatMGA(product.price)}</span>
                        </div>
                        <p className="body-text text-sm line-clamp-2">
                          {product.description}
                        </p>
                        <button 
                          onClick={() => setSelectedProduct(product)}
                          className="group inline-flex items-center gap-4 micro-label text-white hover:text-red-500 transition-colors"
                        >
                          <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-red-500 group-hover:bg-red-500 transition-all">
                            <Tag className="w-4 h-4" />
                          </span>
                          Passer commande
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-display uppercase mb-2">Commander</h3>
                    <p className="text-red-500 text-sm font-mono uppercase tracking-widest">{selectedProduct.name}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {isSuccess ? (
                  <div className="py-12 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">Commande envoyée !</h4>
                    <p className="text-gray-400">Nous vous contacterons rapidement.</p>
                  </div>
                ) : (
                  <form onSubmit={handleOrder} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Nom Complet</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-red-500 outline-none transition-colors"
                          placeholder="Votre nom"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Contact (WhatsApp / Tél)</label>
                        <input
                          required
                          type="text"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-red-500 outline-none transition-colors"
                          placeholder="+261 ..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl font-bold transition-all"
                      >
                        {isSubmitting ? "Envoi..." : "Valider"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
