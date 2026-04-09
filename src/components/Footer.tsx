import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 pt-32 pb-12 border-t border-white/5 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
          {/* Brand Column */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-4 mb-8">
              <img 
                src="https://res.cloudinary.com/dipmf3yd2/image/upload/v1772705541/LOGO_FINAL_l1f3td.png" 
                alt="Logo" 
                className="w-12 h-12 object-contain"
                referrerPolicy="no-referrer"
              />
              <h2 className="font-display text-4xl uppercase tracking-tighter">
                Petit à <span className="text-red-500">Petit MC</span>
              </h2>
            </div>
            <p className="body-text max-w-md">
              Fondé en 2024, notre philosophie repose sur des valeurs de solidarité, de bénévolat et de participation aux événements caritatifs et compétitions. Nous organisons des sorties à moto et soutenons des causes qui nous tiennent à cœur.
            </p>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-4 flex flex-col lg:items-center">
            <div className="w-full max-w-xs">
              <h4 className="font-display text-xl uppercase tracking-widest text-red-500 mb-8">Contact</h4>
              <ul className="space-y-6">
                <li className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <Mail className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-gray-300 hover:text-red-500 transition-colors">petitapetit261@gmail.com</span>
                </li>
                <li className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <Phone className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-gray-300 hover:text-red-500 transition-colors">+261 34 03 896 22</span>
                </li>
                <li className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <MapPin className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-gray-300 hover:text-red-500 transition-colors">Antananarivo, Madagascar</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Social Column */}
          <div className="lg:col-span-3 flex flex-col lg:items-end">
            <div className="w-full max-w-xs lg:text-right">
              <h4 className="font-display text-xl uppercase tracking-widest text-red-500 mb-8">Suivez-nous</h4>
              <p className="text-gray-500 text-sm mb-8">Rejoignez notre communauté sur les réseaux sociaux pour ne rien manquer.</p>
              <div className="flex gap-4 lg:justify-end">
                <a 
                  href="https://www.instagram.com/ride_made_in_mada.261" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-14 h-14 glass hover:bg-red-600 transition-all rounded-2xl flex items-center justify-center group"
                >
                  <Instagram className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
                <a 
                  href="https://www.facebook.com/profile.php?id=61559290282828" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-14 h-14 glass hover:bg-red-600 transition-all rounded-2xl flex items-center justify-center group"
                >
                  <Facebook className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-gray-500 text-sm">
            <p>© {currentYear} Petit à Petit. Tous droits réservés.</p>
          </div>
          <div className="font-display text-2xl uppercase tracking-tighter opacity-20">
            Les petits deviendront grands
          </div>
        </div>
      </div>
    </footer>
  );
}
