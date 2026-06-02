import { Trophy, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/10 pt-16 pb-8">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#e10600] to-[#b00500] rounded-md flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-lg tracking-tight">HORSE RACING</div>
                <div className="text-[#8a8a8a] text-xs tracking-widest">TOURNAMENT SYSTEM</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              The premier platform for professional horse racing tournament management and live race tracking.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 bg-white/5 rounded flex items-center justify-center hover:bg-[#e10600] transition-colors"
              >
                <Facebook className="w-5 h-5 text-white" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/5 rounded flex items-center justify-center hover:bg-[#e10600] transition-colors"
              >
                <Twitter className="w-5 h-5 text-white" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/5 rounded flex items-center justify-center hover:bg-[#e10600] transition-colors"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/5 rounded flex items-center justify-center hover:bg-[#e10600] transition-colors"
              >
                <Youtube className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Tournaments
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Horses
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Jockeys
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Live Races
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Results
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-bold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="w-5 h-5 text-[#e10600] mt-0.5" />
                <span>123 Racing Boulevard, Churchill Downs, KY 40205</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-5 h-5 text-[#e10600]" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-5 h-5 text-[#e10600]" />
                <span>info@horseracingtournament.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              &copy; 2026 Horse Racing Tournament System. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                Legal
              </a>
              <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                Cookies
              </a>
              <a href="#" className="text-gray-400 hover:text-[#e10600] transition-colors text-sm">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
