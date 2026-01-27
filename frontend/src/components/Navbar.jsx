import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 navbar-blur bg-black/80 border-b border-white/10" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" data-testid="nav-logo">
            <img 
              src={LOGO_URL} 
              alt="GameShop Nepal" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
                className={`font-heading text-sm uppercase tracking-wider transition-colors ${
                  isActive(link.href)
                    ? 'text-gold-500'
                    : 'text-white/80 hover:text-gold-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Admin Link */}
          <div className="hidden md:flex items-center">
            <Link to="/admin/login" data-testid="nav-admin-link">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-gold-500">
                <User className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white"
            data-testid="mobile-menu-toggle"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10" data-testid="mobile-menu">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  data-testid={`mobile-nav-link-${link.label.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-heading text-sm uppercase tracking-wider py-2 ${
                    isActive(link.href)
                      ? 'text-gold-500'
                      : 'text-white/80'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link 
                to="/admin/login" 
                onClick={() => setIsMenuOpen(false)}
                className="font-heading text-sm uppercase tracking-wider py-2 text-white/60"
                data-testid="mobile-nav-admin"
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
