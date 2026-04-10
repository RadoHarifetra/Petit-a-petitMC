import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, Star, ClipboardList, Check } from "lucide-react";
import { collection, onSnapshot, query, orderBy, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firebaseErrors";
import LoadingSpinner from "./LoadingSpinner";

function SurveyModal({ event, onClose }: { event: any; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    respondentName: "",
    isMember: "",
    experience: "",
    satisfaction: 0,
    organization: "",
    route: "",
    routeWhy: "",
    ambiance: "",
    security: "",
    securityComment: "",
    logistics: "",
    improvements: "",
    return: ""
  });

  const validate = () => {
    const missing = [];
    if (!formData.respondentName) missing.push("Nom ou pseudo");
    if (!formData.isMember) missing.push("Statut de membre");
    if (!formData.satisfaction) missing.push("Satisfaction globale");
    if (!formData.organization) missing.push("Organisation");
    if (!formData.route) missing.push("Parcours");
    if (!formData.ambiance) missing.push("Ambiance");
    if (!formData.security) missing.push("Sécurité");
    if (!formData.logistics) missing.push("Logistique");
    if (!formData.improvements) missing.push("Améliorations");
    if (!formData.return) missing.push("Retour futur");
    return missing;
  };

  const missingFields = validate();

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "surveys"), {
        ...formData,
        eventId: event.id,
        eventTitle: event.title,
        createdAt: new Date().toISOString()
      });
      setIsSuccess(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "surveys");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-2 justify-center py-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, satisfaction: star })}
            className={`transition-all ${formData.satisfaction >= star ? "text-red-500 scale-110" : "text-white/10 hover:text-white/30"}`}
          >
            <Star className="w-10 h-10 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  const options = {
    organization: ["Très bonne", "Bonne", "Moyenne", "À améliorer"],
    route: ["Excellent", "Bon", "Moyen", "Mauvais"],
    ambiance: ["Excellente", "Bonne", "Correcte", "À améliorer"],
    security: ["Toujours", "La plupart du temps", "Pas vraiment"],
    logistics: ["Très satisfait", "Satisfait", "Peu satisfait", "Insatisfait"],
    return: ["Oui", "Peut-être", "Non"]
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-zinc-900 brutal-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-12">
            <div>
              <span className="micro-label text-red-500 mb-2">Sondage de l'événement</span>
              <h3 className="text-3xl font-display uppercase leading-none">{event.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-600 transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>

          {isSuccess ? (
            <div className="py-20 text-center animate-slam">
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h4 className="text-3xl font-display uppercase mb-4">Merci pour votre avis !</h4>
              <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">Vos retours nous aident à grandir.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Step Indicator */}
              <div className="flex gap-2 mb-8">
                {[1, 2, 3, 4].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? "bg-red-600" : "bg-white/10"}`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    {/* Important Note */}
                    <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-2xl">
                      <p className="text-[11px] font-mono text-red-500 leading-relaxed uppercase tracking-wider">
                        <span className="font-bold">Remarque importante :</span><br />
                        Ce sondage est analysé avec attention afin d’améliorer la qualité de nos événements.
                        Les réponses incohérentes ou volontairement faussées ne seront pas prises en compte.
                      </p>
                    </div>

                    {/* Respondent Info */}
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Informations du participant</label>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-600 mb-2">Nom ou pseudo</label>
                            <input 
                              type="text"
                              required
                              value={formData.respondentName}
                              onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 outline-none transition-colors"
                              placeholder="Votre nom..."
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-600 mb-2">Es-tu membre du club ?</label>
                            <div className="grid grid-cols-2 gap-3">
                              {["Oui", "Non"].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, isMember: opt })}
                                  className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.isMember === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-600 mb-2">Depuis combien de temps participes-tu ? (optionnel)</label>
                            <div className="grid grid-cols-2 gap-3">
                              {["Première fois", "Moins de 1 an", "1 à 3 ans", "Plus de 3 ans"].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, experience: opt })}
                                  className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.experience === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500 text-center">Satisfaction globale</label>
                        {renderStars()}
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Organisation (planning, communication, encadrement)</label>
                        <div className="grid grid-cols-2 gap-3">
                          {options.organization.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, organization: opt })}
                              className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.organization === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Parcours / itinéraire (routes, paysages, durée)</label>
                        <div className="grid grid-cols-2 gap-3">
                          {options.route.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, route: opt })}
                              className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.route === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Pourquoi ? (Optionnel)"
                          value={formData.routeWhy}
                          onChange={(e) => setFormData({ ...formData, routeWhy: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 outline-none transition-colors min-h-[80px]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Ambiance du groupe</label>
                        <div className="grid grid-cols-2 gap-3">
                          {options.ambiance.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, ambiance: opt })}
                              className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.ambiance === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Sécurité pendant l'événement</label>
                        <div className="grid grid-cols-2 gap-3">
                          {options.security.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, security: opt })}
                              className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.security === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Commentaire sécurité (Optionnel)"
                          value={formData.securityComment}
                          onChange={(e) => setFormData({ ...formData, securityComment: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 outline-none transition-colors min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Logistique (pauses, repas, hébergement)</label>
                        <div className="grid grid-cols-2 gap-3">
                          {options.logistics.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, logistics: opt })}
                              className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.logistics === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Qu’est-ce qu’on pourrait améliorer ? (en Français ou Malagasy)</label>
                        <textarea
                          required
                          value={formData.improvements}
                          onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 outline-none transition-colors min-h-[100px]"
                          placeholder="Vos suggestions..."
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-mono uppercase tracking-widest text-gray-500">Reviendrais-tu à un prochain événement ?</label>
                        <div className="grid grid-cols-3 gap-3">
                          {options.return.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, return: opt })}
                              className={`py-3 px-4 text-xs font-mono uppercase tracking-widest border transition-all ${formData.return === opt ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4 pt-8">
                <div className="flex gap-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 py-5 bg-white/5 hover:bg-white/10 border border-white/10 font-display uppercase text-sm tracking-widest transition-all"
                    >
                      RETOUR
                    </button>
                  )}
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-[2] py-5 bg-red-600 hover:bg-red-700 font-display uppercase text-sm tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      SUIVANT
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] py-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-display uppercase text-sm tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      {isSubmitting ? "ENVOI..." : "ENVOYER MON AVIS"}
                    </button>
                  )}
                </div>
                
                {step === 4 && missingFields.length > 0 && (
                  <div className="p-4 bg-red-600/5 border border-red-600/10 rounded-xl">
                    <p className="text-[10px] font-mono text-red-500/70 uppercase tracking-widest mb-2">Champs requis manquants :</p>
                    <p className="text-[11px] text-red-500 font-medium">
                      {missingFields.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function PastEvents() {
  const [isMobile, setIsMobile] = useState(false);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [surveyEvent, setSurveyEvent] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dragDirection, setDragDirection] = useState(0);

  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Sort by date descending (most recent first)
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPastEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "events");
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribe();
    };
  }, []);

  const nextImage = () => {
    if (selectedEvent && selectedEvent.images) {
      setDragDirection(1);
      setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.images.length);
    }
  };

  const prevImage = () => {
    if (selectedEvent && selectedEvent.images) {
      setDragDirection(-1);
      setCurrentImageIndex((prev) => (prev - 1 + selectedEvent.images.length) % selectedEvent.images.length);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger swipe if horizontal movement is dominant (> 40px) and not a scroll
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        nextImage();
      } else {
        prevImage();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <section id="event" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Text Accent */}
      <div className="absolute bottom-0 left-0 text-[20vw] font-display text-white/[0.02] leading-none select-none pointer-events-none -translate-x-1/4 translate-y-1/4">
        EVENTS
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col mb-20">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="micro-label text-red-500 mb-4"
          >
            Archives
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-title text-white"
          >
            ÉVÉNEMENTS <span className="text-red-500 italic">PASSÉS</span>
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            viewport={{ once: true }}
            className="h-1 bg-red-600 mt-6"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Chargement des événements...</p>
            </div>
          ) : pastEvents.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 brutal-border border-dashed">
              Aucun événement affiché pour le moment.
            </div>
          ) : (
            pastEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer flex flex-col"
                onClick={() => {
                  setSelectedEvent(event);
                  setCurrentImageIndex(0);
                }}
              >
                <div className="relative aspect-video overflow-hidden mb-8 brutal-border">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.8 }}
                    src={event.images && event.images.length > 0 ? event.images[0] : event.image}
                    alt={event.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />

                  {/* Date Badge */}
                  <div className="absolute top-0 left-0 z-10">
                    <div className="bg-white text-black px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-tighter">
                      {formatDate(event.date)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h3 className="card-title mb-4 group-hover:text-red-500 transition-colors">
                    {event.title}
                  </h3>
                  <p className="body-text text-sm italic mb-6 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex flex-col gap-4">
                    <div 
                      onClick={() => {
                        setSelectedEvent(event);
                        setCurrentImageIndex(0);
                      }}
                      className="flex items-center gap-2 text-red-500 font-mono text-[10px] uppercase tracking-widest hover:gap-4 transition-all"
                    >
                      Voir la galerie <ChevronRight className="w-3 h-3" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSurveyEvent(event);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-widest transition-all rounded-lg shadow-lg shadow-red-600/20"
                    >
                      <ClipboardList className="w-3 h-3" /> Répondre au sondage
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Gallery Modal */}
      <AnimatePresence>
        {selectedEvent && selectedEvent.images && selectedEvent.images.length > 0 && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/98 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl aspect-video brutal-border overflow-hidden shadow-2xl bg-black"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  initial={{ opacity: 0, x: dragDirection * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dragDirection * -60 }}
                  transition={{ duration: 0.3 }}
                  src={selectedEvent.images[currentImageIndex]}
                  alt={`${selectedEvent.title} ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              </AnimatePresence>

              {/* Nav Buttons — z-index élevé, onPointerDown pour fiabilité mobile */}
              <button
                onPointerDown={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-50 p-2 md:p-4 bg-black/50 hover:bg-red-600 active:bg-red-700 text-white transition-all brutal-border touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4 md:w-8 md:h-8" />
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-50 p-2 md:p-4 bg-black/50 hover:bg-red-600 active:bg-red-700 text-white transition-all brutal-border touch-manipulation"
              >
                <ChevronRight className="w-4 h-4 md:w-8 md:h-8" />
              </button>

              {/* Close Button */}
              <button
                onPointerDown={(e) => { e.stopPropagation(); setSelectedEvent(null); }}
                className="absolute top-3 right-3 md:top-8 md:right-8 z-50 p-1.5 md:p-3 bg-white text-black hover:bg-red-600 active:bg-red-700 hover:text-white transition-all brutal-border touch-manipulation"
              >
                <X className="w-4 h-4 md:w-8 md:h-8" />
              </button>

              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="flex flex-col md:flex-row justify-between items-end gap-2 md:gap-4">
                  <div>
                    <span className="micro-label text-red-500 mb-2">{formatDate(selectedEvent.date)}</span>
                    <h3 className="text-2xl md:text-4xl font-display uppercase text-white leading-none">{selectedEvent.title}</h3>
                  </div>
                  <div className="font-mono text-xs text-white/40 uppercase tracking-widest">
                    Image {currentImageIndex + 1} <span className="text-red-500">/</span> {selectedEvent.images.length}
                  </div>
                </div>
              </div>

              {/* Dots indicator — mobile only */}
              {isMobile && selectedEvent.images.length > 1 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5">
                  {selectedEvent.images.map((_: any, idx: number) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex ? "w-4 bg-red-500" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {surveyEvent && (
          <SurveyModal event={surveyEvent} onClose={() => setSurveyEvent(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
