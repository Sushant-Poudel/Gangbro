import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import { socialLinksAPI } from '@/lib/api';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

const iconMap = {
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle,
  tiktok: () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
};

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    socialLinksAPI.getAll()
      .then(res => setSocialLinks(res.data))
      .catch(() => {});
  }, []);

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName?.toLowerCase()];
    if (!Icon) return null;
    if (typeof Icon === 'function' && Icon.prototype?.render) {
      return <Icon className="h-5 w-5" />;
    }
    return Icon();
  };

  return (
    <footer className="bg-black border-t border-white/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & About */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <img src={LOGO_URL} alt="GameShop Nepal" className="h-12 w-auto" />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed max-w-md">
              Your trusted source for digital products in Nepal since 2021. 
              We provide gaming subscriptions, OTT services, software licenses, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-white/60 hover:text-gold-500 text-sm transition-colors" data-testid="footer-link-home">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-white/60 hover:text-gold-500 text-sm transition-colors" data-testid="footer-link-about">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/60 hover:text-gold-500 text-sm transition-colors" data-testid="footer-link-contact">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-white/60 hover:text-gold-500 text-sm transition-colors" data-testid="footer-link-faq">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white uppercase tracking-wider mb-4">
              Connect With Us
            </h3>
            <p className="text-white/60 text-sm mb-4">
              support@gameshopnepal.com
            </p>
            <div className="flex items-center space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-gold-500 transition-colors"
                  data-testid={`social-link-${link.platform.toLowerCase()}`}
                >
                  {getIcon(link.icon)}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} GameShop Nepal. All rights reserved.
          </p>
          <a
            href="https://www.trustpilot.com/review/gameshopnepal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 md:mt-0 text-gold-500 hover:text-gold-400 text-sm flex items-center"
            data-testid="footer-trustpilot-link"
          >
            View our reviews on Trustpilot →
          </a>
        </div>
      </div>
    </footer>
  );
}
